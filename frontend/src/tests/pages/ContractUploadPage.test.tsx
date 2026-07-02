import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractUploadPage } from '../../pages/ContractUploadPage';
import { uploadContractStream } from '../../constants/endpoints';
import type { UploadProgressEvent } from '../../constants/endpoints';
import type { ContractAnalysis } from '../../types';

vi.mock('../../constants/endpoints', () => ({
  uploadContractStream: vi.fn(),
}));

function selectFile(): void {
  const input = document.getElementById('file-input') as HTMLInputElement;
  const file = new File([new Uint8Array(100)], 'contract.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
}

const analysis: ContractAnalysis = {
  id: '1',
  type: 'NDA',
  riskScore: 85,
  missingClauses: ['Confidentiality period'],
  recommendations: ['Add a governing law clause'],
  riskyClauses: [],
  documentText: 'This is the contract text.',
};

describe('ContractUploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the upload form with no results or errors initially', () => {
    render(<ContractUploadPage />);

    expect(screen.getByText('Contract Analysis')).toBeInTheDocument();
    expect(screen.queryByText('Uploading…')).not.toBeInTheDocument();
    expect(screen.queryByText('NDA')).not.toBeInTheDocument();
  });

  it('shows live status as SSE events arrive, then the results', async () => {
    let resolveUpload!: (value: { ok: true; data: ContractAnalysis }) => void;
    let onProgress!: (event: UploadProgressEvent) => void;
    vi.mocked(uploadContractStream).mockImplementation(
      (_file, progressCb) =>
        new Promise((resolve) => {
          onProgress = progressCb;
          resolveUpload = resolve;
        })
    );

    const user = userEvent.setup();
    render(<ContractUploadPage />);
    selectFile();
    await user.click(screen.getByRole('button', { name: 'Analyse Contract' }));

    expect(await screen.findByText('Uploading…')).toBeInTheDocument();

    onProgress({ type: 'status', stage: 'extracting' });
    await waitFor(() => expect(screen.getByText('Extracting text…')).toBeInTheDocument());

    onProgress({ type: 'status', stage: 'analyzing' });
    await waitFor(() => expect(screen.getByText('Analysing with AI…')).toBeInTheDocument());

    resolveUpload({ ok: true, data: analysis });

    await waitFor(() => expect(screen.getByText('NDA')).toBeInTheDocument());
    expect(screen.queryByText('Analysing with AI…')).not.toBeInTheDocument();
  });

  it('shows an error message when the upload fails, and clears it on the next successful attempt', async () => {
    vi.mocked(uploadContractStream).mockResolvedValueOnce({ ok: false, error: 'Upload failed' });

    const user = userEvent.setup();
    render(<ContractUploadPage />);
    selectFile();
    await user.click(screen.getByRole('button', { name: 'Analyse Contract' }));

    await waitFor(() => expect(screen.getByText('Upload failed')).toBeInTheDocument());
    expect(screen.queryByText('NDA')).not.toBeInTheDocument();

    vi.mocked(uploadContractStream).mockResolvedValueOnce({ ok: true, data: analysis });
    selectFile();
    await user.click(screen.getByRole('button', { name: 'Analyse Contract' }));

    await waitFor(() => expect(screen.getByText('NDA')).toBeInTheDocument());
    expect(screen.queryByText('Upload failed')).not.toBeInTheDocument();
  });
});
