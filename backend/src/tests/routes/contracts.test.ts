import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import * as contractService from '../../services/contractService';
import type { ContractAnalysis } from '../../types';

vi.mock('../../services/contractService');

const app = createApp();

const analysis: ContractAnalysis = {
  id: '1',
  type: 'NDA',
  riskScore: 10,
  missingClauses: [],
  recommendations: [],
  riskyClauses: [],
  documentText: 'This is the contract text.',
};

describe('POST /api/contracts/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 with the analysis for a valid PDF upload', async () => {
    vi.mocked(contractService.analyseContract).mockResolvedValue(analysis);

    const res = await request(app)
      .post('/api/contracts/upload')
      .attach('file', Buffer.from('%PDF-1.4 fake'), {
        filename: 'contract.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(analysis);
  });

  it('returns 400 with NO_FILE when no file is attached', async () => {
    const res = await request(app).post('/api/contracts/upload');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_FILE');
    expect(contractService.analyseContract).not.toHaveBeenCalled();
  });

  it('rejects unsupported file types with 400 INVALID_FILE', async () => {
    const res = await request(app)
      .post('/api/contracts/upload')
      .attach('file', Buffer.from('plain text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE');
    expect(contractService.analyseContract).not.toHaveBeenCalled();
  });

  it('rejects files over the size limit with 413 FILE_TOO_LARGE', async () => {
    const big = Buffer.alloc(11 * 1024 * 1024);

    const res = await request(app)
      .post('/api/contracts/upload')
      .attach('file', big, { filename: 'huge.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  }, 15000);

  it('surfaces unexpected service failures via the error handler as 500', async () => {
    vi.mocked(contractService.analyseContract).mockRejectedValue(new Error('ai down'));

    const res = await request(app)
      .post('/api/contracts/upload')
      .attach('file', Buffer.from('%PDF-1.4 fake'), {
        filename: 'contract.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('streams SSE events when the client sends Accept: text/event-stream', async () => {
    vi.mocked(contractService.analyseContractStreaming).mockImplementation(
      async (_buffer, _mimetype, onEvent) => {
        onEvent({ type: 'status', stage: 'extracting' });
        onEvent({ type: 'status', stage: 'analyzing' });
        onEvent({ type: 'complete', data: analysis });
        return analysis;
      }
    );

    const res = await request(app)
      .post('/api/contracts/upload')
      .set('Accept', 'text/event-stream')
      .attach('file', Buffer.from('%PDF-1.4 fake'), {
        filename: 'contract.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');

    const events = res.text
      .trim()
      .split('\n\n')
      .map((line) => JSON.parse(line.replace(/^data: /, '')));

    expect(events).toEqual([
      { type: 'status', stage: 'extracting' },
      { type: 'status', stage: 'analyzing' },
      { type: 'complete', data: analysis },
    ]);
  });
});

describe('GET /api/contracts/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with the record when found', async () => {
    vi.mocked(contractService.getContractById).mockReturnValue(analysis);

    const res = await request(app).get('/api/contracts/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(analysis);
  });

  it('returns 404 with NOT_FOUND when the record is missing', async () => {
    vi.mocked(contractService.getContractById).mockReturnValue(undefined);

    const res = await request(app).get('/api/contracts/missing');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('unknown routes', () => {
  it('returns 404 via the notFound handler', async () => {
    const res = await request(app).get('/nope');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
