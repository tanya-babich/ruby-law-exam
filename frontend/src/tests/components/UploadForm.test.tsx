import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadForm } from '../../components/UploadForm';
import { uploadContractStream } from '../../constants/endpoints';
import type { ContractAnalysis } from '../../types';

vi.mock('../../constants/endpoints', () => ({
  uploadContractStream: vi.fn(),
}));

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

function selectFile(input: HTMLInputElement, file: File): void {
  fireEvent.change(input, { target: { files: [file] } });
}

function renderForm() {
  const props = {
    loading: false,
    onLoadingChange: vi.fn(),
    onStart: vi.fn(),
    onStatus: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
  };
  render(<UploadForm {...props} />);
  return props;
}

const analysis: ContractAnalysis = {
  id: '1',
  type: 'NDA',
  riskScore: 10,
  missingClauses: [],
  recommendations: [],
  riskyClauses: [],
  documentText: 'This is the contract text.',
};

describe('UploadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects files with a disallowed mime type', () => {
    const props = renderForm();
    const input = document.getElementById('file-input') as HTMLInputElement;

    selectFile(input, makeFile('notes.txt', 'text/plain', 10));

    expect(props.onError).toHaveBeenCalledWith('Only .pdf,.docx files are accepted');
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
  });

  it('rejects files over the size limit', () => {
    const props = renderForm();
    const input = document.getElementById('file-input') as HTMLInputElement;

    selectFile(input, makeFile('big.pdf', 'application/pdf', 11 * 1024 * 1024));

    expect(props.onError).toHaveBeenCalledWith('File must be under 10.0 MB');
  });

  it('accepts a valid file and enables the submit button', () => {
    renderForm();
    const input = document.getElementById('file-input') as HTMLInputElement;

    selectFile(input, makeFile('contract.pdf', 'application/pdf', 100));

    expect(screen.getByText('contract.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyse Contract' })).not.toBeDisabled();
  });

  it('submits the file and reports success', async () => {
    vi.mocked(uploadContractStream).mockResolvedValue({ ok: true, data: analysis });

    const user = userEvent.setup();
    const props = renderForm();
    const input = document.getElementById('file-input') as HTMLInputElement;
    selectFile(input, makeFile('contract.pdf', 'application/pdf', 100));

    await user.click(screen.getByRole('button', { name: 'Analyse Contract' }));

    expect(props.onStart).toHaveBeenCalled();
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledWith(analysis, 'contract.pdf'));
    expect(props.onLoadingChange).toHaveBeenCalledWith(true);
    expect(props.onLoadingChange).toHaveBeenCalledWith(false);
    expect(props.onError).not.toHaveBeenCalled();
  });

  it('submits the file and reports a server error', async () => {
    vi.mocked(uploadContractStream).mockResolvedValue({ ok: false, error: 'Upload failed' });

    const user = userEvent.setup();
    const props = renderForm();
    const input = document.getElementById('file-input') as HTMLInputElement;
    selectFile(input, makeFile('contract.pdf', 'application/pdf', 100));

    await user.click(screen.getByRole('button', { name: 'Analyse Contract' }));

    await waitFor(() => expect(props.onError).toHaveBeenCalledWith('Upload failed'));
    expect(props.onSuccess).not.toHaveBeenCalled();
    expect(props.onLoadingChange).toHaveBeenCalledWith(false);
  });

  it('reports live status text as SSE progress events arrive', async () => {
    vi.mocked(uploadContractStream).mockImplementation(async (_file, onProgress) => {
      onProgress({ type: 'status', stage: 'extracting' });
      onProgress({ type: 'status', stage: 'analyzing' });
      onProgress({ type: 'progress', charsReceived: 42 });
      return { ok: true, data: analysis };
    });

    const user = userEvent.setup();
    const props = renderForm();
    const input = document.getElementById('file-input') as HTMLInputElement;
    selectFile(input, makeFile('contract.pdf', 'application/pdf', 100));

    await user.click(screen.getByRole('button', { name: 'Analyse Contract' }));

    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled());
    expect(props.onStatus).toHaveBeenCalledWith('Extracting text…');
    expect(props.onStatus).toHaveBeenCalledWith('Analysing with AI…');
    expect(props.onStatus).toHaveBeenCalledWith('Analysing with AI… (42 characters received)');
  });
});
