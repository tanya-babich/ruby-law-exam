import { BYTES_PER_KB, BYTES_PER_MB, RISK_THRESHOLD_MEDIUM, RISK_THRESHOLD_HIGH } from './constants';
import type { RiskLevel } from './types/interface';

export function formatFileSize(bytes: number): string {
  if (bytes < BYTES_PER_MB) return `${Math.round(bytes / BYTES_PER_KB)} KB`;
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}

export function getRiskLevel(score: number): RiskLevel {
  if (score < RISK_THRESHOLD_MEDIUM) return 'low';
  if (score < RISK_THRESHOLD_HIGH) return 'medium';
  return 'high';
}
