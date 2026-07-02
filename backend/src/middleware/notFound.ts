import type { Request, Response } from 'express';
import { HTTP_STATUS, ERROR_CODES } from '../constants';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.NOT_FOUND).json({ error: { code: ERROR_CODES.NOT_FOUND, message: 'Route not found' } });
}
