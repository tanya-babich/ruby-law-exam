import type { ReactElement } from 'react';
import type { RiskyClause } from '../types';
import type { RiskLevel } from '../types/interface';
import { buildHighlightedSegments } from '../utils';

interface HighlightedDocumentProps {
  text: string;
  riskyClauses: RiskyClause[];
}

const HIGHLIGHT_CLASSES: Record<RiskLevel, string> = {
  low: 'bg-green-200/70 decoration-green-600',
  medium: 'bg-amber-200/70 decoration-amber-600',
  high: 'bg-red-200/70 decoration-red-600',
};

export function HighlightedDocument({ text, riskyClauses }: HighlightedDocumentProps): ReactElement {
  const segments = buildHighlightedSegments(text, riskyClauses);

  return (
    <div className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-4">
      {segments.map((segment, i) =>
        segment.riskLevel ? (
          <mark
            key={i}
            title={segment.reason}
            className={`rounded px-0.5 underline decoration-2 decoration-dotted ${HIGHLIGHT_CLASSES[segment.riskLevel]}`}
          >
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </div>
  );
}
