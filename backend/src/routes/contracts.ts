import { Router } from 'express';
import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { uploadContract, getContract } from '../controllers/contractController';
import { ALLOWED_MIMETYPES, MAX_FILE_SIZE_BYTES, HTTP_STATUS, ERROR_CODES } from '../constants';
import { HttpError } from '../errors';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .pdf and .docx files are accepted'));
    }
  },
});

function handleUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? HTTP_STATUS.PAYLOAD_TOO_LARGE : HTTP_STATUS.BAD_REQUEST;
      const code = err.code === 'LIMIT_FILE_SIZE' ? ERROR_CODES.FILE_TOO_LARGE : ERROR_CODES.UPLOAD_ERROR;
      next(new HttpError(status, code, err.message));
      return;
    }
    if (err instanceof Error) {
      next(new HttpError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_FILE, err.message));
      return;
    }
    next();
  });
}

export const contractRoutes = Router();

contractRoutes.post('/upload', handleUpload, uploadContract);
contractRoutes.get('/:id', getContract);
