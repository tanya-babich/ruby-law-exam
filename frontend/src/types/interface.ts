import type { ContractAnalysis } from './index';

export type ContractType = ContractAnalysis['type'];

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskClassConfig {
  card: string;
  score: string;
  pill: string;
  label: string;
}
