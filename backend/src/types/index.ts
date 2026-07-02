import type { CONTRACT_TYPES } from '../constants';

export interface ContractAIResult {
  type: (typeof CONTRACT_TYPES)[number];
  riskScore: number;
  missingClauses: string[];
  recommendations: string[];
}

export interface ContractAnalysis extends ContractAIResult {
  id: string;
}
