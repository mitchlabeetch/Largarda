/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared constants for M&A risk surfaces
 * Contains risk categories and severity mappings
 */

import type { RiskCategory, RiskSeverity } from '@/common/ma/types';

/**
 * Risk category configuration with i18n keys
 */
export const RISK_CATEGORIES: Record<
  RiskCategory,
  { label: string; description: string; color: string }
> = {
  financial: {
    label: 'ma.riskScoreCard.categories.financial.label',
    description: 'ma.riskScoreCard.categories.financial.description',
    color: '#F53F3F',
  },
  legal: {
    label: 'ma.riskScoreCard.categories.legal.label',
    description: 'ma.riskScoreCard.categories.legal.description',
    color: '#FF7D00',
  },
  operational: {
    label: 'ma.riskScoreCard.categories.operational.label',
    description: 'ma.riskScoreCard.categories.operational.description',
    color: '#F7BA1E',
  },
  regulatory: {
    label: 'ma.riskScoreCard.categories.regulatory.label',
    description: 'ma.riskScoreCard.categories.regulatory.description',
    color: '#00B42A',
  },
  reputational: {
    label: 'ma.riskScoreCard.categories.reputational.label',
    description: 'ma.riskScoreCard.categories.reputational.description',
    color: '#165DFF',
  },
};

/**
 * Risk severity configuration with i18n keys
 */
export const RISK_SEVERITY: Record<RiskSeverity, { label: string; color: string }> = {
  low: { label: 'ma.riskScoreCard.severity.low', color: '#00B42A' },
  medium: { label: 'ma.riskScoreCard.severity.medium', color: '#F7BA1E' },
  high: { label: 'ma.riskScoreCard.severity.high', color: '#FF7D00' },
  critical: { label: 'ma.riskScoreCard.severity.critical', color: '#F53F3F' },
};
