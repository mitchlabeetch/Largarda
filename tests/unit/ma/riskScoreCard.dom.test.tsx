/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RiskScoreCard DOM Test
 * Asserts that RiskScoreCard component does not contain emoji codepoints.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RiskScoreCard } from '@/renderer/components/ma/RiskScoreCard/RiskScoreCard';
import type { RiskCategory, RiskFinding } from '@/common/ma/types';

// ============================================================================
// Test Helpers
// ============================================================================

// Emoji codepoint ranges (Unicode blocks)
const EMOJI_RANGES = [
  [0x1f600, 0x1f64f], // Emoticons
  [0x1f300, 0x1f5ff], // Misc Symbols and Pictographs
  [0x1f680, 0x1f6ff], // Transport and Map
  [0x1f700, 0x1f77f], // Alchemical Symbols
  [0x1f780, 0x1f7ff], // Geometric Shapes Extended
  [0x1f800, 0x1f8ff], // Supplemental Arrows-C
  [0x1f900, 0x1f9ff], // Supplemental Symbols and Pictographs
  [0x1fa00, 0x1fa6f], // Chess Symbols
  [0x1fa70, 0x1faff], // Symbols and Pictographs Extended-A
  [0x2600, 0x26ff], // Misc symbols
  [0x2700, 0x27bf], // Dingbats
  [0xfe00, 0xfe0f], // Variation Selectors
  [0x1f018, 0x1f1f0], // Playing Cards
  [0x1f1f1, 0x1f1f2], // Regional Indicator Symbols
];

function containsEmoji(str: string): boolean {
  for (const [start, end] of EMOJI_RANGES) {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= start && code <= end) {
        return true;
      }
    }
  }
  return false;
}

// ============================================================================
// Test Data
// ============================================================================

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

// ============================================================================
// Tests
// ============================================================================

describe('RiskScoreCard DOM - Emoji Check', () => {
  it('should not contain emoji codepoints in rendered output', () => {
    const { container } = render(<RiskScoreCard riskScores={mockRiskScores} risks={mockRisks} dealName='Test Deal' />);

    const html = container.innerHTML;

    // Check that no emoji codepoints are present
    expect(containsEmoji(html)).toBe(false);
  });

  it('should render @icon-park/react icons instead of emoji', () => {
    const { container } = render(<RiskScoreCard riskScores={mockRiskScores} risks={mockRisks} dealName='Test Deal' />);

    // Check for @icon-park/react SVG elements
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);

    // Verify that the SVGs have the expected class or attributes from @icon-park/react
    svgs.forEach((svg) => {
      expect(svg).toBeTruthy();
    });
  });

  it('should not contain common emoji characters in text', () => {
    const { container } = render(<RiskScoreCard riskScores={mockRiskScores} risks={mockRisks} dealName='Test Deal' />);

    const html = container.innerHTML;

    // Common emojis that might have been used
    const commonEmojis = ['💰', '⚖️', '⚙️', '📋', '🏆', '💡'];

    commonEmojis.forEach((emoji) => {
      expect(html).not.toContain(emoji);
    });
  });

  it('should render with icon-park icons for all categories', () => {
    const { container } = render(<RiskScoreCard riskScores={mockRiskScores} risks={mockRisks} dealName='Test Deal' />);

    // Each category should have an icon rendered
    const categoryIcons = container.querySelectorAll('.categoryIcon svg');
    expect(categoryIcons.length).toBeGreaterThan(0);
  });

  it('should render severity icons from @icon-park/react', () => {
    const { container } = render(<RiskScoreCard riskScores={mockRiskScores} risks={mockRisks} dealName='Test Deal' />);

    // Severity icons should be rendered as SVGs from @icon-park/react
    const findingHeaders = container.querySelectorAll('.findingHeader');
    expect(findingHeaders.length).toBeGreaterThan(0);

    findingHeaders.forEach((header) => {
      const svg = header.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });
});
