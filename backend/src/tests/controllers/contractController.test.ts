import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { uploadContract, getContract } from '../../controllers/contractController';
import * as contractService from '../../services/contractService';
import { HttpError } from '../../errors';
import type { ContractAnalysis, ContractStreamEvent } from '../../types';

vi.mock('../../services/contractService');

function mockRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.writeHead = vi.fn().mockReturnValue(res);
  res.write = vi.fn().mockReturnValue(true);
  res.end = vi.fn().mockReturnValue(res);
  return res;
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

describe('contractController.uploadContract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next with a 400 HttpError when no file is present', async () => {
    const req = { headers: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await uploadContract(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    expect(vi.mocked(next).mock.calls[0][0]).toMatchObject({ status: 400, code: 'NO_FILE' });
    expect(contractService.analyseContract).not.toHaveBeenCalled();
  });

  it('responds with 201 and the analysis when upload succeeds', async () => {
    vi.mocked(contractService.analyseContract).mockResolvedValue(analysis);

    const req = {
      headers: {},
      file: { buffer: Buffer.from('x'), mimetype: 'application/pdf' },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await uploadContract(req, res, next);

    expect(contractService.analyseContract).toHaveBeenCalledWith(Buffer.from('x'), 'application/pdf');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(analysis);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const err = new Error('boom');
    vi.mocked(contractService.analyseContract).mockRejectedValue(err);

    const req = {
      headers: {},
      file: { buffer: Buffer.from('x'), mimetype: 'application/pdf' },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await uploadContract(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('streams SSE events instead of a JSON body when the client accepts text/event-stream', async () => {
    vi.mocked(contractService.analyseContractStreaming).mockImplementation(
      async (_buffer, _mimetype, onEvent) => {
        onEvent({ type: 'status', stage: 'extracting' });
        onEvent({ type: 'status', stage: 'analyzing' });
        onEvent({ type: 'complete', data: analysis });
        return analysis;
      }
    );

    const req = {
      headers: { accept: 'text/event-stream' },
      file: { buffer: Buffer.from('x'), mimetype: 'application/pdf' },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await uploadContract(req, res, next);

    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ 'Content-Type': 'text/event-stream' })
    );
    expect(contractService.analyseContract).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();

    const written = vi.mocked(res.write).mock.calls.map((call) => call[0] as string);
    const events = written.map((line) => JSON.parse(line.replace(/^data: /, '').trim()) as ContractStreamEvent);
    expect(events).toEqual([
      { type: 'status', stage: 'extracting' },
      { type: 'status', stage: 'analyzing' },
      { type: 'complete', data: analysis },
    ]);
    expect(res.end).toHaveBeenCalled();
  });

  it('writes an SSE error event when streaming analysis fails', async () => {
    vi.mocked(contractService.analyseContractStreaming).mockRejectedValue(new Error('AI down'));

    const req = {
      headers: { accept: 'text/event-stream' },
      file: { buffer: Buffer.from('x'), mimetype: 'application/pdf' },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await uploadContract(req, res, next);

    const written = vi.mocked(res.write).mock.calls.map((call) => call[0] as string);
    const events = written.map((line) => JSON.parse(line.replace(/^data: /, '').trim()) as ContractStreamEvent);
    expect(events).toEqual([{ type: 'error', code: 'INTERNAL_ERROR', message: 'AI down' }]);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('contractController.getContract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the record when found', () => {
    vi.mocked(contractService.getContractById).mockReturnValue(analysis);

    const req = { params: { id: '1' } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    getContract(req, res, next);

    expect(contractService.getContractById).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith(analysis);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with a 404 HttpError when not found', () => {
    vi.mocked(contractService.getContractById).mockReturnValue(undefined);

    const req = { params: { id: 'missing' } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    getContract(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    expect(vi.mocked(next).mock.calls[0][0]).toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect(res.json).not.toHaveBeenCalled();
  });
});
