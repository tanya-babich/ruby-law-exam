import { describe, it, expect, vi, beforeEach } from 'vitest';
import OpenAI from 'openai';
import { callAI, callAIStreaming } from '../../services/aiService';
import { AIUnavailableError } from '../../errors';

const mockCreate = vi.fn();

vi.mock('openai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('openai')>();
  class MockOpenAI {
    chat = { completions: { create: mockCreate } };
  }
  return {
    ...actual,
    default: Object.assign(MockOpenAI, actual.default),
  };
});

const AI_RESULT_JSON = {
  type: 'NDA',
  riskScore: 40,
  missingClauses: ['Governing law clause'],
  recommendations: ['Add a governing law clause'],
  riskyClauses: [{ excerpt: 'may terminate without notice', riskLevel: 'high', reason: 'No notice period' }],
};

async function* fakeChunkStream(chunks: string[]) {
  for (const content of chunks) {
    yield { choices: [{ delta: { content } }] };
  }
}

describe('aiService.callAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('surfaces a 503 AIUnavailableError when OpenAI is unreachable', async () => {
    mockCreate.mockRejectedValue(new OpenAI.APIConnectionError({ message: 'Connection error.' }));

    await expect(callAI('some contract text')).rejects.toBeInstanceOf(AIUnavailableError);
    await expect(callAI('some contract text')).rejects.toMatchObject({ status: 503 });
  });

  it('surfaces a 503 AIUnavailableError when OpenAI returns a 5xx', async () => {
    mockCreate.mockRejectedValue(
      new OpenAI.InternalServerError(
        500,
        { error: { message: 'Internal server error' } },
        'Internal server error',
        {}
      )
    );

    await expect(callAI('some contract text')).rejects.toBeInstanceOf(AIUnavailableError);
  });

  it('rethrows non-transient errors untouched', async () => {
    mockCreate.mockRejectedValue(new Error('some unrelated bug'));

    await expect(callAI('some contract text')).rejects.toThrow('some unrelated bug');
  });

  it('parses and validates a well-formed response, including riskyClauses', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(AI_RESULT_JSON) } }],
    });

    const result = await callAI('some contract text');

    expect(result).toEqual(AI_RESULT_JSON);
  });

  it('rejects a response that fails schema validation', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ type: 'NDA' }) } }],
    });

    await expect(callAI('some contract text')).rejects.toThrow(/did not match expected schema/);
  });
});

describe('aiService.callAIStreaming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('reports accumulated progress via onDelta and resolves the parsed result', async () => {
    const json = JSON.stringify(AI_RESULT_JSON);
    const half = Math.floor(json.length / 2);
    mockCreate.mockResolvedValue(fakeChunkStream([json.slice(0, half), json.slice(half)]));

    const progress: string[] = [];
    const result = await callAIStreaming('some contract text', (accumulated) => progress.push(accumulated));

    expect(result).toEqual(AI_RESULT_JSON);
    expect(progress).toEqual([json.slice(0, half), json]);
  });

  it('surfaces a 503 AIUnavailableError when the stream setup fails transiently', async () => {
    mockCreate.mockRejectedValue(new OpenAI.APIConnectionError({ message: 'Connection error.' }));

    await expect(callAIStreaming('text', () => {})).rejects.toBeInstanceOf(AIUnavailableError);
  });
});
