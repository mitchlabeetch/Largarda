/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { RiskScoreCard } from '@/renderer/components/ma/RiskScoreCard/RiskScoreCard';
import type { RiskCategory, RiskFinding } from '@/common/ma/types';

const mockTranslations: Record<string, string> = {
  'riskScoreCard.categories.financial.label': 'Financial',
  'riskScoreCard.categories.legal.label': 'Legal',
  'riskScoreCard.categories.operational.label': 'Operational',
  'riskScoreCard.categories.regulatory.label': 'Regulatory',
  'riskScoreCard.categories.reputational.label': 'Reputational',
  'riskScoreCard.categories.financial.description': 'Financial risks',
  'riskScoreCard.categories.legal.description': 'Legal risks',
  'riskScoreCard.categories.operational.description': 'Operational risks',
  'riskScoreCard.categories.regulatory.description': 'Regulatory risks',
  'riskScoreCard.categories.reputational.description': 'Reputational risks',
  'riskScoreCard.severity.low': 'Low',
  'riskScoreCard.severity.medium': 'Medium',
  'riskScoreCard.severity.high': 'High',
  'riskScoreCard.severity.critical': 'Critical',
  'riskScoreCard.noData': 'No risk data available',
  'riskScoreCard.riskAssessment': 'Risk Assessment',
  'riskScoreCard.riskComparison': 'Risk Comparison',
  'riskScoreCard.summary.totalFindings': 'Total Findings',
  'dueDiligence.prerequisites.noDocumentsDescription':
    'Upload and process documents for this deal before running analysis.',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => mockTranslations[key] ?? key,
  }),
}));

const mockRiskScores: Record<RiskCategory, number> = {
  financial: 65,
  legal: 42,
  operational: 28,
  regulatory: 55,
  reputational: 15,
};

const mockRisks: RiskFinding[] = [
  {
    id: '1',
    category: 'financial',
    severity: 'high',
    title: 'Revenue Decline',
    description: 'Revenue has declined by 15% over the past year.',
    recommendation: 'Investigate market conditions and adjust pricing strategy.',
  },
  {
    id: '2',
    category: 'legal',
    severity: 'medium',
    title: 'Pending Litigation',
    description: 'There are 3 pending lawsuits related to patent infringement.',
    recommendation: 'Review legal strategy and consider settlement options.',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RiskScoreCard', () => {
  it('displays localized category labels and summary copy', () => {
    render(<RiskScoreCard riskScores={mockRiskScores} risks={mockRisks} />);

    expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Financial/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Legal/i })).toBeInTheDocument();
    expect(screen.getByText('Total Findings')).toBeInTheDocument();
  });

  it('uses semantic color variables instead of hardcoded hex values', () => {
    const { container } = render(<RiskScoreCard riskScores={mockRiskScores} risks={mockRisks} />);

    const html = container.innerHTML;
    expect(html).toContain('var(--danger)');
    expect(html).toContain('var(--warning)');
    expect(html).toContain('var(--info)');
    expect(html).toContain('var(--success)');
    expect(html).toContain('var(--primary)');
    expect(html).not.toContain('#722ED1');
    expect(html).not.toContain('#F53F3F');
    expect(html).not.toContain('#FF7D00');
    expect(html).not.toContain('#00B42A');
  });

  it('shows a localized empty state when no risk scores are present', () => {
    render(
      <RiskScoreCard
        riskScores={{ financial: 0, legal: 0, operational: 0, regulatory: 0, reputational: 0 }}
        risks={[]}
      />
    );

    expect(screen.getByText('No risk data available')).toBeInTheDocument();
    expect(screen.getByText('Upload and process documents for this deal before running analysis.')).toBeInTheDocument();
  });

  it('renders icon-based UI without emoji characters', () => {
    const { container } = render(<RiskScoreCard riskScores={mockRiskScores} risks={mockRisks} dealName='Test Deal' />);

    const html = container.innerHTML;
    expect(html).not.toContain('💰');
    expect(html).not.toContain('⚖️');
    expect(html).not.toContain('⚙️');
    expect(html).not.toContain('📋');
    expect(html).not.toContain('🏆');
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  it('expands category findings through an accessible button control', () => {
    render(<RiskScoreCard riskScores={mockRiskScores} risks={mockRisks} />);

    const financialButton = screen.getByRole('button', { name: /Financial/i });
    expect(financialButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(financialButton);

    expect(financialButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Revenue Decline')).toBeInTheDocument();
    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
  });
});
