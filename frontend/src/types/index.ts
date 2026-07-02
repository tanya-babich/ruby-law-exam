// Shared shape used by both frontend and backend.
// Keep the enum/field list in sync with backend/src/services/aiService.ts (AIResultSchema).
import { z } from 'zod';

export const RiskyClauseSchema = z.object({
  excerpt: z.string(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  reason: z.string(),
});

export type RiskyClause = z.infer<typeof RiskyClauseSchema>;

export const ContractAnalysisSchema = z.object({
  id: z.string(),
  type: z.enum(['NDA', 'Employment', 'Service Agreement', 'Lease', 'Other']),
  riskScore: z.number().int().min(0).max(100),
  missingClauses: z.array(z.string()),
  recommendations: z.array(z.string()),
  riskyClauses: z.array(RiskyClauseSchema),
  documentText: z.string(),
});

export type ContractAnalysis = z.infer<typeof ContractAnalysisSchema>;

export const ApiErrorResponseSchema = z.object({
  error: z.object({ message: z.string() }).optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export const ContractStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('status'), stage: z.enum(['extracting', 'analyzing']) }),
  z.object({ type: z.literal('progress'), charsReceived: z.number() }),
  z.object({ type: z.literal('complete'), data: ContractAnalysisSchema }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
]);

export type ContractStreamEvent = z.infer<typeof ContractStreamEventSchema>;
