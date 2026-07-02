import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadContract } from '../../constants/endpoints';
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
};

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
