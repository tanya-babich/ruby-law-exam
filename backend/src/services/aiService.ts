import OpenAI from 'openai';
import { z } from 'zod';
import type { ContractAIResult } from '../types';
import { AIUnavailableError } from '../errors';
import { CONTRACT_TYPES, AI_MODEL, AI_TEMPERATURE } from '../constants';

const MAX_CHARS = 12_000;
const MAX_RISKY_CLAUSES = 8;

const AIResultSchema = z.object({
  type: z.enum(CONTRACT_TYPES),
  riskScore: z.number().int().min(0).max(100),
  missingClauses: z.array(z.string()),
  recommendations: z.array(z.string()),
  riskyClauses: z.array(
    z.object({
      excerpt: z.string(),
      riskLevel: z.enum(['low', 'medium', 'high']),
      reason: z.string(),
    })
  ),
});

const CONTRACT_TYPES_PROMPT_LIST = CONTRACT_TYPES.map((type) => `"${type}"`).join(', ');

const SYSTEM_PROMPT = `You are a legal contract analyser for a legal-tech SaaS platform.
Analyse the given contract text by working through these steps IN ORDER, then return a single JSON
object with exactly these fields: type, riskScore, missingClauses, recommendations, riskyClauses.

Step 1 — riskyClauses: Scan the text for specific clauses already present that create legal or
business risk — e.g. one-sided termination rights, short notice periods, unpaid/uncompensated
overtime, unlimited liability, overly broad or indefinite confidentiality, unilateral variation
rights. List up to ${MAX_RISKY_CLAUSES} as objects { excerpt, riskLevel, reason }. "excerpt" MUST be
copied verbatim, character-for-character, from the supplied text — including its exact punctuation
and quote characters — so it can be located for highlighting; never paraphrase or normalise it.
"riskLevel" is one of "low", "medium", "high". "reason" is a short plain-English explanation. Almost
every real contract has at least one clause worth flagging here — leave this empty only if you are
confident none exists.

Step 2 — riskScore: integer 0–100 (0 = no risk, 100 = extreme risk), derived from what you found in
Step 1 plus the impact of any clauses you'll list as missing in Step 3. A high riskScore driven
mainly by risky clauses in the text must be backed by matching entries in riskyClauses — don't score
the document as risky based on clauses you can quote but then omit them from riskyClauses.

Step 3 — type: one of ${CONTRACT_TYPES_PROMPT_LIST}

Step 4 — missingClauses: array of strings — standard clauses missing for this contract type

Step 5 — recommendations: array of plain-English strings to reduce legal risk

Respond ONLY with valid JSON containing exactly the fields type, riskScore, missingClauses,
recommendations, riskyClauses. No markdown, no code fences, no explanation.`;

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

function parseAIResult(content: string): ContractAIResult {
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

function buildMessages(text: string): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Analyse this contract:\n\n${text.slice(0, MAX_CHARS)}` },
  ];
}

export async function callAI(text: string): Promise<ContractAIResult> {
  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await getClient().chat.completions.create({
      model: AI_MODEL,
      messages: buildMessages(text),
      response_format: { type: 'json_object' },
      temperature: AI_TEMPERATURE,
    });
  } catch (err) {
    if (isTransientOpenAIError(err)) {
      throw new AIUnavailableError();
    }
    throw err;
  }

  return parseAIResult(completion.choices[0]?.message?.content ?? '');
}

// Streams the raw completion tokens as they arrive (via onDelta) so callers can surface live
// progress to a client, then validates the fully-assembled JSON exactly like the non-streaming path.
export async function callAIStreaming(
  text: string,
  onDelta: (accumulated: string) => void
): Promise<ContractAIResult> {
  let accumulated = '';
  try {
    const stream = await getClient().chat.completions.create({
      model: AI_MODEL,
      messages: buildMessages(text),
      response_format: { type: 'json_object' },
      temperature: AI_TEMPERATURE,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        accumulated += delta;
        onDelta(accumulated);
      }
    }
  } catch (err) {
    if (isTransientOpenAIError(err)) {
      throw new AIUnavailableError();
    }
    throw err;
  }

  return parseAIResult(accumulated);
}
