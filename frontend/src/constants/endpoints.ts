import type { ContractAnalysis } from '../types';
import { ContractAnalysisSchema, ApiErrorResponseSchema, ContractStreamEventSchema } from '../types';

export const CONTRACT_UPLOAD_ENDPOINT = '/api/contracts/upload';

export type UploadContractResult =
  | { ok: true; data: ContractAnalysis }
  | { ok: false; error: string };

export type UploadProgressEvent =
  | { type: 'status'; stage: 'extracting' | 'analyzing' }
  | { type: 'progress'; charsReceived: number };

export async function uploadContract(file: File): Promise<UploadContractResult> {
  const formData = new FormData();
  formData.append('file', file);

  let res: Response;
  try {
    res = await fetch(CONTRACT_UPLOAD_ENDPOINT, { method: 'POST', body: formData });
  } catch {
    return { ok: false, error: 'Network error — could not reach the server' };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: res.ok ? 'Server returned an unexpected response shape' : 'Upload failed',
    };
  }

  if (!res.ok) {
    const parsed = ApiErrorResponseSchema.safeParse(json);
    return {
      ok: false,
      error: (parsed.success ? parsed.data.error?.message : undefined) ?? 'Upload failed',
    };
  }

  const parsed = ContractAnalysisSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: 'Server returned an unexpected response shape' };
  }

  return { ok: true, data: parsed.data };
}

function parseSSEEvent(rawEvent: string): unknown {
  const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data:'));
  if (!dataLine) return undefined;

  try {
    return JSON.parse(dataLine.slice(dataLine.indexOf(':') + 1).trim());
  } catch {
    return undefined;
  }
}

// EventSource can't send a POST body, so the upload is a normal fetch — the server responds with
// text/event-stream and we parse the "data: {...}\n\n" frames from the response stream ourselves.
export async function uploadContractStream(
  file: File,
  onProgress: (event: UploadProgressEvent) => void
): Promise<UploadContractResult> {
  const formData = new FormData();
  formData.append('file', file);

  let res: Response;
  try {
    res = await fetch(CONTRACT_UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'text/event-stream' },
      body: formData,
    });
  } catch {
    return { ok: false, error: 'Network error — could not reach the server' };
  }

  if (!res.ok) {
    // Validation errors (no file, wrong type, too large) and dev-proxy failures (backend down)
    // never reach the SSE code path on the server — they come back as a plain JSON/text error.
    try {
      const json: unknown = await res.json();
      const parsed = ApiErrorResponseSchema.safeParse(json);
      return {
        ok: false,
        error: (parsed.success ? parsed.data.error?.message : undefined) ?? 'Upload failed',
      };
    } catch {
      return { ok: false, error: 'Upload failed' };
    }
  }

  if (!res.body) {
    return { ok: false, error: 'Streaming is not supported by this browser' };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');

        const parsed = ContractStreamEventSchema.safeParse(parseSSEEvent(rawEvent));
        if (!parsed.success) continue;

        const event = parsed.data;
        if (event.type === 'complete') {
          return { ok: true, data: event.data };
        }
        if (event.type === 'error') {
          return { ok: false, error: event.message };
        }
        onProgress(event);
      }
    }
  } catch {
    return { ok: false, error: 'Network error — could not reach the server' };
  }

  return { ok: false, error: 'Upload failed' };
}
