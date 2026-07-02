import type { ContractAnalysis } from '../types';

const store = new Map<string, ContractAnalysis>();

export const contractStore = {
  get: (id: string): ContractAnalysis | undefined => store.get(id),
  set: (id: string, record: ContractAnalysis): void => { store.set(id, record); },
};
