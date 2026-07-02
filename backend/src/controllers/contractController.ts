import { Request, Response, NextFunction } from 'express';
import { analyseContract, analyseContractStreaming, getContractById } from '../services/contractService';
import { AppError, HttpError } from '../errors';
import { HTTP_STATUS, ERROR_CODES } from '../constants';
import type { ContractStreamEvent } from '../types';

function wantsStream(req: Request): boolean {
  return (req.headers.accept ?? '').includes('text/event-stream');
}

async function streamUpload(file: Express.Multer.File, res: Response): Promise<void> {
  res.writeHead(HTTP_STATUS.OK, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (event: ContractStreamEvent): void => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await analyseContractStreaming(file.buffer, file.mimetype, send);
  } catch (err) {
    send({
      type: 'error',
      code: err instanceof AppError ? err.code : ERROR_CODES.INTERNAL_ERROR,
      message: err instanceof Error ? err.message : 'Internal server error',
    });
  } finally {
    res.end();
  }
}

export async function uploadContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.file) {
    next(new HttpError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.NO_FILE, 'No file uploaded'));
    return;
  }

  if (wantsStream(req)) {
    await streamUpload(req.file, res);
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
