import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { HTTP_STATUS, ERROR_CODES } from '../constants';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: { code: ERROR_CODES.INTERNAL_ERROR, message } });
}
