/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Token Lint Test
 * Ensures M&A CSS Modules use only Mint Whisper semantic tokens and not forbidden Arco tokens.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Configuration
// ============================================================================

const MA_CSS_PATHS = [
  'src/renderer/components/ma/RiskScoreCard/RiskScoreCard.module.css',
  'src/renderer/components/ma/DealSelector/DealSelector.module.css',
  'src/renderer/components/ma/DealSelector/DealForm.module.css',
  'src/renderer/components/ma/DocumentUpload/DocumentUpload.module.css',
  'src/renderer/pages/ma/DealContext/DealContextPage.module.css',
  'src/renderer/pages/ma/DueDiligence/DueDiligencePage.module.css',
];

// Forbidden Arco Design tokens that must be replaced with Mint Whisper tokens
const FORBIDDEN_TOKENS = [
  // Background colors
  /var\(--color-bg-\d+\)/g,
  // Text colors
  /var\(--color-text-\d+\)/g,
  // Border colors
  /var\(--color-border\)/g,
  /var\(--color-border-\d+\)/g,
  // Fill colors
  /var\(--color-fill-\d+\)/g,
  // Primary color variants
  /var\(--color-primary-\d+\)/g,
  /var\(--color-primary-light-\d+\)/g,
  // Success color variants
  /var\(--color-success-\d+\)/g,
  /var\(--color-success-light-\d+\)/g,
  // Warning color variants
  /var\(--color-warning-\d+\)/g,
  /var\(--color-warning-light-\d+\)/g,
  // Danger color variants
  /var\(--color-danger-\d+\)/g,
  /var\(--color-danger-light-\d+\)/g,
  // Arco blue color variants
  /rgb\(var\(--arcoblue-\d+\)\)/g,
  // Green color variants
  /rgb\(var\(--green-\d+\)\)/g,
  // Orange color variants
  /rgb\(var\(--orange-\d+\)\)/g,
  // Red color variants
  /rgb\(var\(--red-\d+\)\)/g,
  // Gray color variants
  /rgb\(var\(--gray-\d+\)\)/g,
  // Primary color rgb variants
  /rgb\(var\(--primary-\d+\)\)/g,
];

// ============================================================================
// Test Helpers
// ============================================================================

function readCssFile(relativePath: string): string {
  const absolutePath = join(process.cwd(), relativePath);
  return readFileSync(absolutePath, 'utf-8');
}

function checkForbiddenTokens(css: string): Array<{ token: string; matches: string[] }> {
  const violations: Array<{ token: string; matches: string[] }> = [];

  for (const pattern of FORBIDDEN_TOKENS) {
    const matches = css.match(pattern);
    if (matches) {
      violations.push({
        token: pattern.toString(),
        matches: [...new Set(matches)], // Deduplicate matches
      });
    }
  }

  return violations;
}

// ============================================================================
// Tests
// ============================================================================

describe('M&A CSS Module Token Lint', () => {
  MA_CSS_PATHS.forEach((cssPath) => {
    it(`${cssPath} should not contain forbidden Arco tokens`, () => {
      const css = readCssFile(cssPath);
      const violations = checkForbiddenTokens(css);

      if (violations.length > 0) {
        const violationMessages = violations
          .map(
            (v) =>
              `- Pattern: ${v.token}\n  Found: ${v.matches.slice(0, 5).join(', ')}${v.matches.length > 5 ? '...' : ''}`
          )
          .join('\n');
        throw new Error(
          `Found forbidden Arco tokens in ${cssPath}:\n${violationMessages}\n\nPlease replace with Mint Whisper semantic tokens.`
        );
      }

      expect(violations).toHaveLength(0);
    });
  });

  it('should use Mint Whisper semantic tokens for backgrounds', () => {
    const allCss = MA_CSS_PATHS.map(readCssFile).join('\n');

    // Should use Mint Whisper background tokens
    expect(allCss).toMatch(/var\(--bg-\d+\)/);

    // Should use Mint Whisper text tokens
    expect(allCss).toMatch(/var\(--text-primary\)/);
    expect(allCss).toMatch(/var\(--text-secondary\)/);

    // Should use Mint Whisper semantic color tokens
    expect(allCss).toMatch(/var\(--primary\)/);
    expect(allCss).toMatch(/var\(--success\)/);
    expect(allCss).toMatch(/var\(--warning\)/);
    expect(allCss).toMatch(/var\(--danger\)/);
  });

  it('should use Mint Whisper border-radius tokens', () => {
    const allCss = MA_CSS_PATHS.map(readCssFile).join('\n');

    // Should use semantic border-radius tokens
    expect(allCss).toMatch(/var\(--radius-md\)/);
    expect(allCss).toMatch(/var\(--radius-lg\)/);
  });
});
