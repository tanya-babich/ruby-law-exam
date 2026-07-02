import type { ReactElement } from 'react';
import type { ContractAnalysis } from '../types';
import type { ContractType, RiskClassConfig, RiskLevel } from '../types/interface';
import { getRiskLevel } from '../utils';

interface AnalysisResultsProps {
  result: ContractAnalysis;
  fileName: string;
}

const TYPE_BADGE: Record<ContractType, string> = {
  NDA: 'bg-indigo-500',
  Employment: 'bg-cyan-600',
  'Service Agreement': 'bg-violet-700',
  Lease: 'bg-emerald-600',
  Other: 'bg-slate-500',
};

const RISK_CLASSES: Record<RiskLevel, RiskClassConfig> = {
  low: {
    card: 'border-green-600',
    score: 'text-green-600',
    pill: 'bg-green-600',
    label: 'Low',
  },
  medium: {
    card: 'border-amber-600',
    score: 'text-amber-600',
    pill: 'bg-amber-600',
    label: 'Medium',
  },
  high: {
    card: 'border-red-600',
    score: 'text-red-600',
    pill: 'bg-red-600',
    label: 'High',
  },
};

export function AnalysisResults({
  result,
  fileName,
}: AnalysisResultsProps): ReactElement {
  const level = getRiskLevel(result.riskScore);
  const risk = RISK_CLASSES[level];
  const badgeColor = TYPE_BADGE[result.type];

  return (
    <div className="mt-8 pt-8 border-t border-slate-100">
      <p className="text-sm text-slate-500 mb-4">
        Results for <span className="font-medium text-slate-700 break-all">{fileName}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Contract Type
          </div>
          <span
            className={`${badgeColor} text-white self-start px-3.5 py-1 rounded-full font-semibold text-sm tracking-wide`}
          >
            {result.type}
          </span>
        </div>

        <div
          className={`p-4 rounded-xl bg-slate-50 border-2 ${risk.card} flex flex-col justify-center`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Risk Score
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-5xl font-black leading-none ${risk.score}`}>
              {result.riskScore}
            </span>
            <span className="text-slate-400 text-base font-medium">/100</span>
            <span
              className={`${risk.pill} text-white px-2.5 py-0.5 rounded-full text-xs font-bold ml-1`}
            >
              {risk.label} risk
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <section className="flex flex-col rounded-xl border border-slate-200 overflow-hidden">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50/60 border-b border-slate-200 px-4 py-2.5">
            Missing Clauses
          </h3>
          <div className="p-4 flex-1">
            {result.missingClauses.length === 0 ? (
              <p className="text-sm text-green-700 font-medium bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                No missing clauses detected.
              </p>
            ) : (
              <ul className="space-y-2">
                {result.missingClauses.map((clause, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-sm font-medium text-red-800 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 leading-snug"
                  >
                    <span className="text-red-400 font-bold shrink-0">!</span>
                    <span>{clause}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="flex flex-col rounded-xl border border-slate-200 overflow-hidden">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200 px-4 py-2.5">
            Recommendations
          </h3>
          <div className="p-4 flex-1">
            {result.recommendations.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                No recommendations.
              </p>
            ) : (
              <ol className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5 leading-snug"
                  >
                    <span className="text-slate-400 font-bold shrink-0">
                      {i + 1}.
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
