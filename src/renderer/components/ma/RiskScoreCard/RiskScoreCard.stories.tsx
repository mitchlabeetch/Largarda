/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RiskScoreCard } from './RiskScoreCard';
import type { RiskCategory, RiskFinding } from '@/common/ma/types';

const meta: Meta<typeof RiskScoreCard> = {
  title: 'M&A/RiskScoreCard',
  component: RiskScoreCard,
  tags: ['autodocs'],
  argTypes: {
    isLoading: {
      control: 'boolean',
    },
    isComparison: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RiskScoreCard>;

const mockRiskScores: Record<RiskCategory, number> = {
  financial: 75,
  legal: 45,
  operational: 60,
  regulatory: 30,
  reputational: 55,
};

const mockRisks: RiskFinding[] = [
  {
    id: '1',
    analysisId: 'analysis-1',
    category: 'financial',
    severity: 'high',
    title: 'Declining revenue trend',
    description: 'Revenue has decreased by 15% over the past two quarters.',
    recommendation: 'Review financial statements and investigate root causes.',
    score: 75,
    createdAt: new Date('2024-01-15').getTime(),
  },
  {
    id: '2',
    analysisId: 'analysis-1',
    category: 'legal',
    severity: 'medium',
    title: 'Pending litigation',
    description: 'Company is involved in two ongoing lawsuits.',
    recommendation: 'Assess potential liability and legal exposure.',
    score: 45,
    createdAt: new Date('2024-01-15').getTime(),
  },
  {
    id: '3',
    analysisId: 'analysis-1',
    category: 'regulatory',
    severity: 'low',
    title: 'License renewal required',
    description: 'Operating license expires in 6 months.',
    recommendation: 'Initiate renewal process early to avoid disruption.',
    score: 30,
    createdAt: new Date('2024-01-15').getTime(),
  },
];

export const Default: Story = {
  args: {
    riskScores: mockRiskScores,
    overallScore: 53,
    risks: mockRisks,
    isLoading: false,
    isComparison: false,
    onCategoryClick: () => {},
  },
};

export const Loading: Story = {
  args: {
    riskScores: mockRiskScores,
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    riskScores: {
      financial: 0,
      legal: 0,
      operational: 0,
      regulatory: 0,
      reputational: 0,
    },
    isLoading: false,
  },
};

export const WithDealName: Story = {
  args: {
    riskScores: mockRiskScores,
    overallScore: 53,
    risks: mockRisks,
    dealName: 'TechCorp Acquisition',
    isLoading: false,
    isComparison: false,
    onCategoryClick: () => {},
  },
};

export const Comparison: Story = {
  args: {
    riskScores: mockRiskScores,
    isLoading: false,
    isComparison: true,
    comparisonData: {
      'deal-1': {
        financial: 75,
        legal: 45,
        operational: 60,
        regulatory: 30,
        reputational: 55,
      },
      'deal-2': {
        financial: 40,
        legal: 70,
        operational: 35,
        regulatory: 55,
        reputational: 45,
      },
    },
  },
};
