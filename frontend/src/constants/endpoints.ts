import type { ContractAnalysis } from '../types';
import { ContractAnalysisSchema, ApiErrorResponseSchema } from '../types';

export const CONTRACT_UPLOAD_ENDPOINT = '/api/contracts/upload';

export type UploadContractResult =
  | { ok: true; data: ContractAnalysis }
  | { ok: false; error: string };

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
