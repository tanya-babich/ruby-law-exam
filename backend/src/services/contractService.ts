import { v4 as uuidv4 } from 'uuid';
import { extractText } from './extractorService';
import { callAI } from './aiService';
import { contractStore } from './contractStore';
import type { ContractAnalysis } from '../types';

export async function analyseContract(buffer: Buffer, mimetype: string): Promise<ContractAnalysis> {
  const text = await extractText(buffer, mimetype);
  const analysis = await callAI(text);

  const record: ContractAnalysis = {
    id: uuidv4(),
    ...analysis,
  };

  contractStore.set(record.id, record);
  return record;
}

export function getContractById(id: string): ContractAnalysis | undefined {
  return contractStore.get(id);
}
