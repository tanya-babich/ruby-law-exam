// Mirrors backend/src/constants.ts — keep MIME types and size limit in sync.
export const MIME = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

export const ALLOWED_MIMETYPES: string[] = [MIME.PDF, MIME.DOCX];
export const ALLOWED_FILE_EXTENSIONS = '.pdf,.docx';

export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = BYTES_PER_KB * 1024;

export const MAX_FILE_SIZE_BYTES = 10 * BYTES_PER_MB;

export const FILE_INPUT_ID = 'file-input';

// Score bands driving the risk badge colour — keep in sync with backend's riskScore range (0-100).
export const RISK_THRESHOLD_MEDIUM = 40;
export const RISK_THRESHOLD_HIGH = 70;
