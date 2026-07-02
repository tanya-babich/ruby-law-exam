import { describe, it, expect } from 'vitest';
import { buildHighlightedSegments } from '../utils';
import type { RiskyClause } from '../types';

function clause(excerpt: string, overrides: Partial<RiskyClause> = {}): RiskyClause {
  return { excerpt, riskLevel: 'high', reason: 'test reason', ...overrides };
}

describe('buildHighlightedSegments', () => {
  it('splits plain/highlight/plain around an exact-match excerpt', () => {
    const text = 'Before the clause. Risky bit here. After the clause.';
    const segments = buildHighlightedSegments(text, [clause('Risky bit here.')]);

    expect(segments).toEqual([
      { text: 'Before the clause. ' },
      { text: 'Risky bit here.', riskLevel: 'high', reason: 'test reason' },
      { text: ' After the clause.' },
    ]);
  });

  it('matches an excerpt that spans a run of blank lines the model normalised to single spaces', () => {
    // Mirrors real extracted-document formatting: a clause definition wrapped across a paragraph
    // break with multiple blank lines, while the AI quotes it back with single spaces.
    const text =
      '"Confidential Information" includes, without limitation, trade secrets, customer data,\n\n\n' +
      'product roadmaps, source code, financial information, pricing, and any other information.';
    const excerpt =
      'trade secrets, customer data, product roadmaps, source code, financial information, pricing';

    const segments = buildHighlightedSegments(text, [clause(excerpt)]);
    const highlighted = segments.find((s) => s.riskLevel);

    expect(highlighted).toBeDefined();
    // The rendered segment keeps the document's real whitespace (with blank lines), not the
    // model's normalised version — it's a slice of the original text, not the excerpt string.
    expect(highlighted?.text).toContain('trade secrets, customer data,\n\n\nproduct roadmaps');
  });

  it('drops an excerpt that cannot be located anywhere in the document', () => {
    const text = 'This is the whole document.';
    const segments = buildHighlightedSegments(text, [clause('text that does not appear')]);

    expect(segments).toEqual([{ text }]);
  });

  it('keeps the first match and drops a later overlapping one', () => {
    const text = 'The quick brown fox jumps.';
    const segments = buildHighlightedSegments(text, [
      clause('quick brown fox', { riskLevel: 'high', reason: 'first' }),
      clause('brown fox jumps', { riskLevel: 'low', reason: 'second' }),
    ]);

    const highlights = segments.filter((s) => s.riskLevel);
    expect(highlights).toHaveLength(1);
    expect(highlights[0]).toMatchObject({ text: 'quick brown fox', reason: 'first' });
  });

  it('highlights multiple non-overlapping clauses in document order', () => {
    const text = 'Alpha risky-one beta risky-two gamma.';
    const segments = buildHighlightedSegments(text, [
      clause('risky-two', { riskLevel: 'medium', reason: 'second issue' }),
      clause('risky-one', { riskLevel: 'high', reason: 'first issue' }),
    ]);

    expect(segments).toEqual([
      { text: 'Alpha ' },
      { text: 'risky-one', riskLevel: 'high', reason: 'first issue' },
      { text: ' beta ' },
      { text: 'risky-two', riskLevel: 'medium', reason: 'second issue' },
      { text: ' gamma.' },
    ]);
  });

  it('correctly highlights a clause from a real extracted employment contract', () => {
    const text = [
      '2.2 The Employee shall be subject to a probationary period of six (6) months from the',
      "Commencement Date. During the probationary period, either Party may terminate this",
      "Agreement by providing two (2) weeks' written notice.",
    ].join(' ');

    const excerpt = "either Party may terminate this Agreement by providing two (2) weeks' written notice";
    const segments = buildHighlightedSegments(text, [
      clause(excerpt, { riskLevel: 'high', reason: 'Very short notice period during probation' }),
    ]);

    const highlighted = segments.find((s) => s.riskLevel);
    expect(highlighted?.text).toBe(excerpt);
  });

  it('matches an excerpt whose curly quotes/dashes differ from the extracted document text', () => {
    // pdf-parse/mammoth commonly extract a document's real typographic quotes (’, –), while
    // the model tends to normalise to plain ASCII ones when quoting the excerpt back.
    const text = 'either Party may terminate this Agreement by providing two (2) weeks’ written notice – no cause required.';
    const excerpt = "either Party may terminate this Agreement by providing two (2) weeks' written notice - no cause required";

    const segments = buildHighlightedSegments(text, [clause(excerpt)]);
    const highlighted = segments.find((s) => s.riskLevel);

    expect(highlighted).toBeDefined();
    // Rendered text keeps the ORIGINAL typographic characters, not the model's ASCII version.
    expect(highlighted?.text).toBe('either Party may terminate this Agreement by providing two (2) weeks’ written notice – no cause required');
  });
});
