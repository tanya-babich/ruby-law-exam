export const MIME = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

export const ALLOWED_MIMETYPES: string[] = [MIME.PDF, MIME.DOCX];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Single source of truth for contract classification — referenced by both the AI
// prompt and the zod schema that validates the AI's response, so they can't drift apart.
export const CONTRACT_TYPES = ['NDA', 'Employment', 'Service Agreement', 'Lease', 'Other'] as const;

export const AI_MODEL = 'gpt-4o-mini';
export const AI_TEMPERATURE = 0.1;

export const HTTP_STATUS = {
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_CODES = {
  NO_FILE: 'NO_FILE',
  INVALID_FILE: 'INVALID_FILE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNPROCESSABLE: 'UNPROCESSABLE',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
