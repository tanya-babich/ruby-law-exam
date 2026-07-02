import { v4 as uuidv4 } from 'uuid';
import { extractText } from './extractorService';
import { callAI, callAIStreaming } from './aiService';
import { contractStore } from './contractStore';
import type { ContractAnalysis, ContractStreamEvent } from '../types';

export async function analyseContract(buffer: Buffer, mimetype: string): Promise<ContractAnalysis> {
  const text = await extractText(buffer, mimetype);
  const analysis = await callAI(text);

  const record: ContractAnalysis = {
    id: uuidv4(),
    documentText: text,
    ...analysis,
  };

  contractStore.set(record.id, record);
  return record;
}

export async function analyseContractStreaming(
  buffer: Buffer,
  mimetype: string,
  onEvent: (event: ContractStreamEvent) => void
): Promise<ContractAnalysis> {
  onEvent({ type: 'status', stage: 'extracting' });
  const text = await extractText(buffer, mimetype);

  onEvent({ type: 'status', stage: 'analyzing' });
  const analysis = await callAIStreaming(text, (accumulated) =>
    onEvent({ type: 'progress', charsReceived: accumulated.length })
  );

  const record: ContractAnalysis = {
    id: uuidv4(),
    documentText: text,
    ...analysis,
  };

  contractStore.set(record.id, record);
  onEvent({ type: 'complete', data: record });
  return record;
}

export function getContractById(id: string): ContractAnalysis | undefined {
  return contractStore.get(id);
}
