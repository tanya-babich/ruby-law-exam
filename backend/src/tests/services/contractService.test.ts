import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyseContract } from '../../services/contractService';
import * as aiService from '../../services/aiService';
import * as extractorService from '../../services/extractorService';
import { ContractProcessingError } from '../../errors';

vi.mock('../../services/aiService');
vi.mock('../../services/extractorService');

describe('contractService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a valid ContractAnalysis when upload succeeds', async () => {
    vi.mocked(extractorService.extractText).mockResolvedValue(
      'This Non-Disclosure Agreement is entered into between the parties...'
    );
    vi.mocked(aiService.callAI).mockResolvedValue({
      type: 'NDA',
      riskScore: 25,
      missingClauses: ['Dispute resolution clause', 'Governing law clause'],
      recommendations: ['Add a governing law clause specifying jurisdiction'],
    });

    const result = await analyseContract(Buffer.from('fake pdf content'), 'application/pdf');

    expect(result.id).toBeDefined();
    expect(result.type).toBe('NDA');
    expect(result.riskScore).toBe(25);
    expect(result.missingClauses).toEqual(['Dispute resolution clause', 'Governing law clause']);
    expect(result.recommendations).toEqual(['Add a governing law clause specifying jurisdiction']);
  });

  it('throws ContractProcessingError when text extraction fails', async () => {
    vi.mocked(extractorService.extractText).mockRejectedValue(
      new ContractProcessingError('Failed to parse PDF: file is corrupted')
    );

    await expect(
      analyseContract(Buffer.from('corrupted'), 'application/pdf')
    ).rejects.toThrow(ContractProcessingError);
  });

  it('throws when the AI service is unavailable', async () => {
    vi.mocked(extractorService.extractText).mockResolvedValue('Some contract text');
    vi.mocked(aiService.callAI).mockRejectedValue(new Error('OpenAI API unavailable'));

    await expect(
      analyseContract(Buffer.from('fake'), 'application/pdf')
    ).rejects.toThrow('OpenAI API unavailable');
  });
});
