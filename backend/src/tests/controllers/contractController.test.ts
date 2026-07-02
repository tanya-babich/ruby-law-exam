import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { uploadContract, getContract } from '../../controllers/contractController';
import * as contractService from '../../services/contractService';
import { HttpError } from '../../errors';
import type { ContractAnalysis } from '../../types';

vi.mock('../../services/contractService');

function mockRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const analysis: ContractAnalysis = {
  id: '1',
  type: 'NDA',
  riskScore: 10,
  missingClauses: [],
  recommendations: [],
};

describe('contractController.uploadContract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next with a 400 HttpError when no file is present', async () => {
    const req = {} as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await uploadContract(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    expect(vi.mocked(next).mock.calls[0][0]).toMatchObject({ status: 400, code: 'NO_FILE' });
    expect(contractService.analyseContract).not.toHaveBeenCalled();
  });

  it('responds with 201 and the analysis when upload succeeds', async () => {
    vi.mocked(contractService.analyseContract).mockResolvedValue(analysis);

    const req = { file: { buffer: Buffer.from('x'), mimetype: 'application/pdf' } } as unknown as Request;
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

    const req = { file: { buffer: Buffer.from('x'), mimetype: 'application/pdf' } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await uploadContract(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
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
