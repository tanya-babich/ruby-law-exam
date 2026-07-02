import OpenAI from 'openai';
import { z } from 'zod';
import type { ContractAIResult } from '../types';
import { AIUnavailableError } from '../errors';
import { CONTRACT_TYPES, AI_MODEL, AI_TEMPERATURE } from '../constants';

const MAX_CHARS = 12_000;

const AIResultSchema = z.object({
  type: z.enum(CONTRACT_TYPES),
  riskScore: z.number().int().min(0).max(100),
  missingClauses: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const CONTRACT_TYPES_PROMPT_LIST = CONTRACT_TYPES.map((type) => `"${type}"`).join(', ');

const SYSTEM_PROMPT = `You are a legal contract analyser for a legal-tech SaaS platform.
Given the text of a contract, return a JSON object with these exact fields:
- type: one of ${CONTRACT_TYPES_PROMPT_LIST}
- riskScore: integer 0–100 (0 = no risk, 100 = extreme risk)
- missingClauses: array of strings — standard clauses missing for this contract type
- recommendations: array of plain-English strings to reduce legal risk

Respond ONLY with valid JSON. No markdown, no code fences, no explanation.`;

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

// Network failures, timeouts, rate limits, and upstream 5xxs are all "OpenAI is temporarily
// unhappy" — not a bug in our code and not something the caller can fix, so they're collapsed
// into one 503 rather than leaking SDK-specific error shapes to the client.
function isTransientOpenAIError(err: unknown): boolean {
  return (
    err instanceof OpenAI.APIConnectionError || // covers APIConnectionTimeoutError too
    err instanceof OpenAI.RateLimitError ||
    err instanceof OpenAI.InternalServerError
  );
}

export async function callAI(text: string): Promise<ContractAIResult> {
  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await getClient().chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyse this contract:\n\n${text.slice(0, MAX_CHARS)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: AI_TEMPERATURE,
    });
  } catch (err) {
    if (isTransientOpenAIError(err)) {
      throw new AIUnavailableError();
    }
    throw err;
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from AI service');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('AI service returned invalid JSON');
  }

  const result = AIResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`AI response did not match expected schema: ${result.error.message}`);
  }

  return result.data;
}
