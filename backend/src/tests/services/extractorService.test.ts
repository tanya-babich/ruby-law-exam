import { describe, it, expect, vi } from 'vitest';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { extractText } from '../../services/extractorService';
import { MIME } from '../../constants';
import { ContractProcessingError } from '../../errors';

vi.mock('pdf-parse', () => ({ default: vi.fn() }));
vi.mock('mammoth', () => ({ default: { extractRawText: vi.fn() } }));

describe('extractorService.extractText', () => {
  it('extracts text from a PDF buffer', async () => {
    vi.mocked(pdfParse).mockResolvedValue({ text: 'pdf contents' } as Awaited<ReturnType<typeof pdfParse>>);

    const result = await extractText(Buffer.from('fake'), MIME.PDF);

    expect(result).toBe('pdf contents');
  });

  it('wraps pdf-parse failures in a ContractProcessingError', async () => {
    vi.mocked(pdfParse).mockRejectedValue(new Error('corrupt'));

    await expect(extractText(Buffer.from('fake'), MIME.PDF)).rejects.toBeInstanceOf(
      ContractProcessingError
    );
    await expect(extractText(Buffer.from('fake'), MIME.PDF)).rejects.toThrow(
      'Failed to parse PDF: corrupt'
    );
  });

  it('extracts text from a DOCX buffer', async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'docx contents',
      messages: [],
    });

    const result = await extractText(Buffer.from('fake'), MIME.DOCX);

    expect(result).toBe('docx contents');
  });

  it('wraps mammoth failures in a ContractProcessingError', async () => {
    vi.mocked(mammoth.extractRawText).mockRejectedValue(new Error('bad zip'));

    await expect(extractText(Buffer.from('fake'), MIME.DOCX)).rejects.toBeInstanceOf(
      ContractProcessingError
    );
    await expect(extractText(Buffer.from('fake'), MIME.DOCX)).rejects.toThrow(
      'Failed to parse DOCX: bad zip'
    );
  });

  it('rejects unsupported mimetypes', async () => {
    await expect(extractText(Buffer.from('fake'), 'text/plain')).rejects.toBeInstanceOf(
      ContractProcessingError
    );
    await expect(extractText(Buffer.from('fake'), 'text/plain')).rejects.toThrow(
      'Unsupported file type: text/plain'
    );
  });
});
