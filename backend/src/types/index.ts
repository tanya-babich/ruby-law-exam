import type { CONTRACT_TYPES } from '../constants';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskyClause {
  // Verbatim substring of the source document, so the frontend can locate and highlight it.
  excerpt: string;
  riskLevel: RiskLevel;
  reason: string;
}

export interface ContractAIResult {
  type: (typeof CONTRACT_TYPES)[number];
  riskScore: number;
  missingClauses: string[];
  recommendations: string[];
  riskyClauses: RiskyClause[];
}

export interface ContractAnalysis extends ContractAIResult {
  id: string;
  documentText: string;
}

export type ContractStreamEvent =
  | { type: 'status'; stage: 'extracting' | 'analyzing' }
  | { type: 'progress'; charsReceived: number }
  | { type: 'complete'; data: ContractAnalysis }
  | { type: 'error'; code: string; message: string };
