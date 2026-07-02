import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyseContract, analyseContractStreaming } from '../../services/contractService';
import * as aiService from '../../services/aiService';
import * as extractorService from '../../services/extractorService';
import { ContractProcessingError } from '../../errors';
import type { ContractStreamEvent } from '../../types';

vi.mock('../../services/aiService');
vi.mock('../../services/extractorService');

const AI_RESULT = {
  type: 'NDA' as const,
  riskScore: 25,
  missingClauses: ['Dispute resolution clause', 'Governing law clause'],
  recommendations: ['Add a governing law clause specifying jurisdiction'],
  riskyClauses: [
    { excerpt: 'either party may terminate at any time', riskLevel: 'high' as const, reason: 'No notice period' },
  ],
};

const DOCUMENT_TEXT = 'This Non-Disclosure Agreement is entered into between the parties...';

describe('contractService.analyseContract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a valid ContractAnalysis when upload succeeds', async () => {
    vi.mocked(extractorService.extractText).mockResolvedValue(DOCUMENT_TEXT);
    vi.mocked(aiService.callAI).mockResolvedValue(AI_RESULT);

    const result = await analyseContract(Buffer.from('fake pdf content'), 'application/pdf');

    expect(result.id).toBeDefined();
    expect(result.documentText).toBe(DOCUMENT_TEXT);
    expect(result.type).toBe('NDA');
    expect(result.riskScore).toBe(25);
    expect(result.missingClauses).toEqual(['Dispute resolution clause', 'Governing law clause']);
    expect(result.recommendations).toEqual(['Add a governing law clause specifying jurisdiction']);
    expect(result.riskyClauses).toEqual(AI_RESULT.riskyClauses);
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

describe('contractService.analyseContractStreaming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits status, progress, and complete events in order', async () => {
    vi.mocked(extractorService.extractText).mockResolvedValue(DOCUMENT_TEXT);
    vi.mocked(aiService.callAIStreaming).mockImplementation(async (_text, onDelta) => {
      onDelta('{"partial":');
      onDelta('{"partial": true}');
      return AI_RESULT;
    });

    const events: ContractStreamEvent[] = [];
    const result = await analyseContractStreaming(Buffer.from('fake'), 'application/pdf', (e) =>
      events.push(e)
    );

    expect(events[0]).toEqual({ type: 'status', stage: 'extracting' });
    expect(events[1]).toEqual({ type: 'status', stage: 'analyzing' });
    expect(events[2]).toEqual({ type: 'progress', charsReceived: 11 });
    expect(events[3]).toEqual({ type: 'progress', charsReceived: 17 });
    expect(events[4]).toEqual({ type: 'complete', data: result });
    expect(result.documentText).toBe(DOCUMENT_TEXT);
    expect(result.riskyClauses).toEqual(AI_RESULT.riskyClauses);
  });

  it('does not emit a complete event when the AI call fails', async () => {
    vi.mocked(extractorService.extractText).mockResolvedValue(DOCUMENT_TEXT);
    vi.mocked(aiService.callAIStreaming).mockRejectedValue(new Error('AI down'));

    const events: ContractStreamEvent[] = [];
    await expect(
      analyseContractStreaming(Buffer.from('fake'), 'application/pdf', (e) => events.push(e))
    ).rejects.toThrow('AI down');

    expect(events.some((e) => e.type === 'complete')).toBe(false);
  });
});
