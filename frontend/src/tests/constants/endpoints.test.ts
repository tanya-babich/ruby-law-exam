import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadContract, uploadContractStream } from '../../constants/endpoints';
import type { ContractAnalysis } from '../../types';

function makeFile(): File {
  return new File(['contract text'], 'contract.pdf', { type: 'application/pdf' });
}

const analysis: ContractAnalysis = {
  id: '1',
  type: 'NDA',
  riskScore: 10,
  missingClauses: [],
  recommendations: [],
  riskyClauses: [],
  documentText: 'This is the contract text.',
};

function streamResponse(events: unknown[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    },
  });
  return { ok: true, body } as unknown as Response;
}

describe('uploadContract', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the parsed analysis on success', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => analysis } as Response);

    const result = await uploadContract(makeFile());

    expect(result).toEqual({ ok: true, data: analysis });
  });

  it('returns the server error message on a non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'File too large' } }),
    } as Response);

    const result = await uploadContract(makeFile());

    expect(result).toEqual({ ok: false, error: 'File too large' });
  });

  it('falls back to a generic message when the error body has no message', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

    const result = await uploadContract(makeFile());

    expect(result).toEqual({ ok: false, error: 'Upload failed' });
  });

  it('flags an unexpected success response shape', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ nonsense: true }),
    } as Response);

    const result = await uploadContract(makeFile());

    expect(result).toEqual({ ok: false, error: 'Server returned an unexpected response shape' });
  });

  it('reports a network error when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('failed to fetch'));

    const result = await uploadContract(makeFile());

    expect(result).toEqual({ ok: false, error: 'Network error — could not reach the server' });
  });

  it('reports a generic failure when the backend is unreachable and the dev proxy returns a non-JSON 500', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    } as unknown as Response);

    const result = await uploadContract(makeFile());

    expect(result).toEqual({ ok: false, error: 'Upload failed' });
  });
});

describe('uploadContractStream', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports status/progress events and resolves with the analysis on complete', async () => {
    vi.mocked(fetch).mockResolvedValue(
      streamResponse([
        { type: 'status', stage: 'extracting' },
        { type: 'status', stage: 'analyzing' },
        { type: 'progress', charsReceived: 50 },
        { type: 'complete', data: analysis },
      ])
    );

    const events: unknown[] = [];
    const result = await uploadContractStream(makeFile(), (e) => events.push(e));

    expect(result).toEqual({ ok: true, data: analysis });
    expect(events).toEqual([
      { type: 'status', stage: 'extracting' },
      { type: 'status', stage: 'analyzing' },
      { type: 'progress', charsReceived: 50 },
    ]);
  });

  it('resolves with the error message from an SSE error event', async () => {
    vi.mocked(fetch).mockResolvedValue(
      streamResponse([{ type: 'error', code: 'AI_UNAVAILABLE', message: 'AI service is down' }])
    );

    const result = await uploadContractStream(makeFile(), () => {});

    expect(result).toEqual({ ok: false, error: 'AI service is down' });
  });

  it('parses a plain JSON error response for pre-stream validation failures', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'No file uploaded' } }),
    } as Response);

    const result = await uploadContractStream(makeFile(), () => {});

    expect(result).toEqual({ ok: false, error: 'No file uploaded' });
  });

  it('reports a generic failure when the backend is down and the dev proxy returns a non-JSON error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    } as unknown as Response);

    const result = await uploadContractStream(makeFile(), () => {});

    expect(result).toEqual({ ok: false, error: 'Upload failed' });
  });

  it('reports a network error when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('failed to fetch'));

    const result = await uploadContractStream(makeFile(), () => {});

    expect(result).toEqual({ ok: false, error: 'Network error — could not reach the server' });
  });

  it('falls back to a generic failure if the stream ends without a complete or error event', async () => {
    vi.mocked(fetch).mockResolvedValue(streamResponse([{ type: 'status', stage: 'extracting' }]));

    const result = await uploadContractStream(makeFile(), () => {});

    expect(result).toEqual({ ok: false, error: 'Upload failed' });
  });
});
