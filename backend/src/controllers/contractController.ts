import { Request, Response, NextFunction } from 'express';
import { analyseContract, getContractById } from '../services/contractService';
import { HttpError } from '../errors';
import { HTTP_STATUS, ERROR_CODES } from '../constants';

export async function uploadContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.file) {
    next(new HttpError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.NO_FILE, 'No file uploaded'));
    return;
  }

  try {
    const result = await analyseContract(req.file.buffer, req.file.mimetype);
    res.status(HTTP_STATUS.CREATED).json(result);
  } catch (err) {
    next(err);
  }
}

export function getContract(req: Request, res: Response, next: NextFunction): void {
  const record = getContractById(req.params.id);
  if (!record) {
    next(new HttpError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Contract not found'));
    return;
  }
  res.json(record);
}
