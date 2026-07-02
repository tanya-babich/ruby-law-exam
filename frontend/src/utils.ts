import { BYTES_PER_KB, BYTES_PER_MB, RISK_THRESHOLD_MEDIUM, RISK_THRESHOLD_HIGH } from './constants';
import type { RiskLevel } from './types/interface';
import type { RiskyClause } from './types';

export function formatFileSize(bytes: number): string {
  if (bytes < BYTES_PER_MB) return `${Math.round(bytes / BYTES_PER_KB)} KB`;
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}

export function getRiskLevel(score: number): RiskLevel {
  if (score < RISK_THRESHOLD_MEDIUM) return 'low';
  if (score < RISK_THRESHOLD_HIGH) return 'medium';
  return 'high';
}

export interface DocumentSegment {
  text: string;
  riskLevel?: RiskLevel;
  reason?: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Character-for-character substitution (never changes string length), so indices computed against
// the normalised string stay valid for slicing the original. Models routinely swap a PDF/DOCX's
// curly quotes and en/em dashes for plain ASCII ones when quoting text back.
function normalizeChars(s: string): string {
  return s
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-');
}

// Exact substring match first; if that fails, retry treating whitespace runs in the excerpt as
// "any amount of whitespace" — models frequently collapse a document's blank lines/indentation
// into single spaces when quoting it back, which would otherwise silently defeat indexOf.
function findExcerpt(text: string, excerpt: string): { start: number; end: number } | null {
  const trimmed = normalizeChars(excerpt.trim());
  if (!trimmed) return null;

  const normalizedText = normalizeChars(text);

  const exact = normalizedText.indexOf(trimmed);
  if (exact !== -1) return { start: exact, end: exact + trimmed.length };

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const match = new RegExp(words.map(escapeRegExp).join('\\s+')).exec(normalizedText);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

// Locates each clause's excerpt in the document text and splits the text into plain/highlighted
// segments. Excerpts that can't be located at all, or that overlap an already-placed highlight,
// are silently dropped rather than breaking the render.
export function buildHighlightedSegments(text: string, riskyClauses: RiskyClause[]): DocumentSegment[] {
  const matches = riskyClauses
    .map((clause) => {
      const found = findExcerpt(text, clause.excerpt);
      return found ? { ...found, clause } : null;
    })
    .filter((match): match is { start: number; end: number; clause: RiskyClause } => match !== null)
    .sort((a, b) => a.start - b.start);

  const segments: DocumentSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) segments.push({ text: text.slice(cursor, match.start) });
    segments.push({ text: text.slice(match.start, match.end), riskLevel: match.clause.riskLevel, reason: match.clause.reason });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });

  return segments;
}
