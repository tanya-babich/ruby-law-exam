// Shared shape used by both frontend and backend.
// Keep the enum/field list in sync with backend/src/services/aiService.ts (AIResultSchema).
import { z } from 'zod';

export const ContractAnalysisSchema = z.object({
  id: z.string(),
  type: z.enum(['NDA', 'Employment', 'Service Agreement', 'Lease', 'Other']),
  riskScore: z.number().int().min(0).max(100),
  missingClauses: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type ContractAnalysis = z.infer<typeof ContractAnalysisSchema>;

export const ApiErrorResponseSchema = z.object({
  error: z.object({ message: z.string() }).optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
