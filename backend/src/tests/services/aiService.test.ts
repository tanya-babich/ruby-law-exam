import { describe, it, expect, vi, beforeEach } from 'vitest';
import OpenAI from 'openai';
import { callAI } from '../../services/aiService';
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
});
