import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { MIME } from '../constants';
import { ContractProcessingError } from '../errors';

export async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === MIME.PDF) {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (err) {
      throw new ContractProcessingError(
        `Failed to parse PDF: ${err instanceof Error ? err.message : 'unknown error'}`
      );
    }
  }

  if (mimetype === MIME.DOCX) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (err) {
      throw new ContractProcessingError(
        `Failed to parse DOCX: ${err instanceof Error ? err.message : 'unknown error'}`
      );
    }
  }

  throw new ContractProcessingError(`Unsupported file type: ${mimetype}`);
}
