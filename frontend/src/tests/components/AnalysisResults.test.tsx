import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalysisResults } from '../../components/AnalysisResults';
import type { ContractAnalysis } from '../../types';

function makeResult(overrides: Partial<ContractAnalysis> = {}): ContractAnalysis {
  return {
    id: '1',
    type: 'NDA',
    riskScore: 85,
    missingClauses: ['Confidentiality period'],
    recommendations: ['Add a governing law clause'],
    riskyClauses: [],
    documentText: 'This agreement may be terminated by either party without notice.',
    ...overrides,
  };
}

describe('AnalysisResults', () => {
  it('displays the file name, contract type, and risk score', () => {
    render(<AnalysisResults result={makeResult()} fileName="contract.pdf" />);

    expect(screen.getByText('contract.pdf')).toBeInTheDocument();
    expect(screen.getByText('NDA')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('labels a high score as high risk', () => {
    render(<AnalysisResults result={makeResult({ riskScore: 85 })} fileName="c.pdf" />);
    expect(screen.getByText('High risk')).toBeInTheDocument();
  });

  it('labels a mid-range score as medium risk', () => {
    render(<AnalysisResults result={makeResult({ riskScore: 50 })} fileName="c.pdf" />);
    expect(screen.getByText('Medium risk')).toBeInTheDocument();
  });

  it('labels a low score as low risk', () => {
    render(<AnalysisResults result={makeResult({ riskScore: 10 })} fileName="c.pdf" />);
    expect(screen.getByText('Low risk')).toBeInTheDocument();
  });

  it('lists missing clauses when present', () => {
    render(
      <AnalysisResults
        result={makeResult({ missingClauses: ['Termination clause', 'Liability cap'] })}
        fileName="c.pdf"
      />
    );

    expect(screen.getByText('Termination clause')).toBeInTheDocument();
    expect(screen.getByText('Liability cap')).toBeInTheDocument();
  });

  it('shows a fallback message when there are no missing clauses', () => {
    render(<AnalysisResults result={makeResult({ missingClauses: [] })} fileName="c.pdf" />);
    expect(screen.getByText('No missing clauses detected.')).toBeInTheDocument();
  });

  it('lists recommendations when present', () => {
    render(
      <AnalysisResults
        result={makeResult({ recommendations: ['Clarify payment terms'] })}
        fileName="c.pdf"
      />
    );

    expect(screen.getByText('Clarify payment terms')).toBeInTheDocument();
  });

  it('shows a fallback message when there are no recommendations', () => {
    render(<AnalysisResults result={makeResult({ recommendations: [] })} fileName="c.pdf" />);
    expect(screen.getByText('No recommendations.')).toBeInTheDocument();
  });

  it('highlights a risky clause excerpt within the document text', () => {
    render(
      <AnalysisResults
        result={makeResult({
          documentText: 'This agreement may be terminated by either party without notice.',
          riskyClauses: [
            {
              excerpt: 'terminated by either party without notice',
              riskLevel: 'high',
              reason: 'No notice period before termination',
            },
          ],
        })}
        fileName="c.pdf"
      />
    );

    const highlighted = screen.getByText('terminated by either party without notice');
    expect(highlighted.tagName).toBe('MARK');
    expect(highlighted).toHaveAttribute('title', 'No notice period before termination');
  });

  it('does not render the document section when no risky clauses were found', () => {
    render(<AnalysisResults result={makeResult({ riskyClauses: [] })} fileName="c.pdf" />);

    expect(screen.queryByText('Document — Risky Clauses Highlighted')).not.toBeInTheDocument();
    expect(screen.queryByText(/This agreement may be terminated/)).not.toBeInTheDocument();
  });
});
