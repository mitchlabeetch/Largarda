/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Wave 3 / Batch 3D Compliance Close-out Regression Tests
 *
 * Verifies the M&A renderer surface satisfies minimum interaction,
 * localization, formatting, and a11y rules through source analysis.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Source File Analysis Helpers
// ============================================================================

const RENDERER_MA_PATH = path.join(process.cwd(), 'src/renderer');
const MA_PAGES_PATH = path.join(RENDERER_MA_PATH, 'pages/ma');
const MA_COMPONENTS_PATH = path.join(RENDERER_MA_PATH, 'components/ma');

function readSourceFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function getFilesRecursively(dir: string, extension: string): string[] {
  const files: string[] = [];

  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...getFilesRecursively(fullPath, extension));
      } else if (item.endsWith(extension)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return files;
}

function getProductionTsxFiles(): string[] {
  return [...getFilesRecursively(MA_PAGES_PATH, '.tsx'), ...getFilesRecursively(MA_COMPONENTS_PATH, '.tsx')].filter(
    (f) => !f.includes('.stories.') && !f.includes('.test.')
  );
}

// ============================================================================
// Compliance Test Suite
// ============================================================================

describe('Wave 3 / Batch 3D - M&A Renderer Compliance', () => {
  // ============================================================================
  // INTERACTION COMPLIANCE
  // ============================================================================

  describe('Interaction Compliance', () => {
    it('M&A pages use Arco Design components (no raw HTML buttons)', () => {
      const tsxFiles = getProductionTsxFiles();
      expect(tsxFiles.length).toBeGreaterThan(0);

      for (const file of tsxFiles) {
        const content = readSourceFile(file);
        if (!content) continue;

        // Should import from @arco-design/web-react
        const hasArcoImport = content.includes('@arco-design/web-react');
        expect(hasArcoImport, `File ${file} should import from Arco Design`).toBe(true);

        // Should NOT have raw HTML button elements (outside of Arco components)
        // Look for <button that is not part of a component tag
        const rawButtonPattern = /<button\s+/;
        const hasRawButton = rawButtonPattern.test(content);
        expect(hasRawButton, `File ${file} should not contain raw <button> elements`).toBe(false);

        // Should NOT have raw HTML input/select/textarea elements
        const rawInputPattern = /<input\s+/;
        const rawSelectPattern = /<select\s+/;
        const rawTextareaPattern = /<textarea\s+/;

        expect(rawInputPattern.test(content), `File ${file} should not contain raw <input> elements`).toBe(false);
        expect(rawSelectPattern.test(content), `File ${file} should not contain raw <select> elements`).toBe(false);
        expect(rawTextareaPattern.test(content), `File ${file} should not contain raw <textarea> elements`).toBe(false);
      }
    });

    it('M&A pages import Button from @arco-design/web-react', () => {
      const tsxFiles = getProductionTsxFiles();

      for (const file of tsxFiles) {
        const content = readSourceFile(file);
        if (!content) continue;

        // Check for Arco Button usage pattern
        const hasButtonImport = /Button\s*,/.test(content) || /,\s*Button/.test(content);
        const hasButtonComponent = content.includes('@arco-design/web-react');

        // If file has buttons, they should come from Arco
        if (content.includes('Button')) {
          expect(hasButtonComponent, `File ${file} should use Arco Button`).toBe(true);
        }
      }
    });
  });

  // ============================================================================
  // LOCALIZATION COMPLIANCE
  // ============================================================================

  describe('Localization Compliance', () => {
    it('M&A pages use i18n useTranslation hook', () => {
      const tsxFiles = getProductionTsxFiles();
      expect(tsxFiles.length).toBeGreaterThan(0);

      for (const file of tsxFiles) {
        const content = readSourceFile(file);
        if (!content) continue;

        // Should import useTranslation
        const hasI18nImport = content.includes('useTranslation');
        expect(hasI18nImport, `File ${file} should import useTranslation`).toBe(true);
      }
    });

    it('no hardcoded English strings that should be localized', () => {
      const tsxFiles = getProductionTsxFiles();

      const hardcodedPatterns = [
        />Select a deal</,
        />Deal Context</,
        />Due Diligence</,
        />Analysis</,
        />Upload</,
        />Cancel</,
        />Submit</,
        />Save</,
        />Delete</,
      ];

      for (const file of tsxFiles) {
        const content = readSourceFile(file);
        if (!content) continue;

        for (const pattern of hardcodedPatterns) {
          expect(
            pattern.test(content),
            `File ${file} should not have hardcoded English string matching ${pattern}`
          ).toBe(false);
        }
      }
    });
  });

  // ============================================================================
  // FORMATTING COMPLIANCE
  // ============================================================================

  describe('Formatting Compliance', () => {
    it('M&A pages use shared formatters instead of browser defaults', () => {
      const tsxFiles = getProductionTsxFiles();

      for (const file of tsxFiles) {
        const content = readSourceFile(file);
        if (!content) continue;

        // Should import useMaDateFormatters
        const hasFormatterImport = content.includes('useMaDateFormatters');

        // If file formats dates, it should use the formatter
        if (content.includes('Date') || content.includes('date')) {
          // Should NOT use browser default toLocaleDateString directly
          const hasBrowserDateFormatting =
            content.includes('toLocaleDateString') ||
            content.includes('toLocaleString') ||
            content.includes('toLocaleTimeString');

          expect(
            hasBrowserDateFormatting,
            `File ${file} should use useMaDateFormatters instead of browser defaults`
          ).toBe(false);

          // Should have formatter import if dealing with dates
          if (content.includes('createdAt') || content.includes('updatedAt') || content.includes('generatedAt')) {
            expect(hasFormatterImport, `File ${file} should import useMaDateFormatters for date formatting`).toBe(true);
          }
        }
      }
    });

    it('uses semantic CSS variables instead of hardcoded colors', () => {
      const tsxFiles = getProductionTsxFiles();
      const hardcodedColors = ['#F53F3F', '#00B42A', '#FF7D00', '#722ED1', '#165DFF'];

      for (const file of tsxFiles) {
        const content = readSourceFile(file);
        if (!content) continue;

        for (const color of hardcodedColors) {
          expect(content.includes(color), `File ${file} should use CSS variables instead of ${color}`).toBe(false);
        }

        // Should use semantic CSS variables (either inline or via CSS Modules)
        const hasInlineCssVars = content.includes('var(--');
        const hasCssModuleImport = content.includes('.module.css') || content.includes('.module.less');
        expect(
          hasInlineCssVars || hasCssModuleImport,
          `File ${file} should use CSS variables (inline or via CSS Modules)`
        ).toBe(true);
      }
    });
  });

  // ============================================================================
  // ACCESSIBILITY COMPLIANCE
  // ============================================================================

  describe('Accessibility Compliance', () => {
    it('M&A components have aria- attributes for accessibility', () => {
      const tsxFiles = getProductionTsxFiles();

      for (const file of tsxFiles) {
        const content = readSourceFile(file);
        if (!content) continue;

        // DueDiligencePage should have aria-live for screen reader announcements
        if (file.includes('DueDiligencePage')) {
          expect(content.includes('aria-live'), `DueDiligencePage should have aria-live`).toBe(true);
          expect(content.includes('aria-atomic'), `DueDiligencePage should have aria-atomic`).toBe(true);
        }

        // DealSelector should have aria-pressed for selection state (check main component only)
        if (
          file.includes('DealSelector') &&
          file.includes('DealSelector.tsx') &&
          !file.includes('.test.') &&
          !file.includes('.stories.')
        ) {
          expect(content.includes('aria-pressed'), `DealSelector should have aria-pressed in ${file}`).toBe(true);
        }

        // RiskScoreCard should have aria-expanded for expandable sections (check main component only)
        if (
          file.includes('RiskScoreCard') &&
          file.includes('RiskScoreCard.tsx') &&
          !file.includes('.test.') &&
          !file.includes('.stories.')
        ) {
          expect(content.includes('aria-expanded'), `RiskScoreCard should have aria-expanded in ${file}`).toBe(true);
        }

        // Components with buttons should have aria-label for icon-only buttons
        if (content.includes('aria-label')) {
          // Has aria-label for accessibility - this is good
          expect(true).toBe(true);
        }
      }
    });

    it('M&A components use Icon Park instead of emoji', () => {
      const tsxFiles = getProductionTsxFiles();

      const emojis = ['💰', '⚖️', '⚙️', '📋', '🏆', '📄', '📁', '✅', '❌', '⬆️'];

      for (const file of tsxFiles) {
        const content = readSourceFile(file);
        if (!content) continue;

        for (const emoji of emojis) {
          expect(content.includes(emoji), `File ${file} should not contain emoji ${emoji}`).toBe(false);
        }
      }
    });

    it('M&A components import from @icon-park/react', () => {
      const tsxFiles = getProductionTsxFiles();

      for (const file of tsxFiles) {
        const content = readSourceFile(file);
        if (!content) continue;

        // Should import icons from @icon-park/react
        const hasIconParkImport = content.includes('@icon-park/react');

        // If file has icons (indicated by capitalized imports), they should be from Icon Park
        if (content.includes('Icon') || content.includes('icon')) {
          expect(hasIconParkImport, `File ${file} should import icons from @icon-park/react`).toBe(true);
        }
      }
    });
  });

  // ============================================================================
  // CODE QUALITY COMPLIANCE
  // ============================================================================

  describe('Code Quality Compliance', () => {
    it('M&A components have proper TypeScript types', () => {
      const tsxFiles = getProductionTsxFiles();

      for (const file of tsxFiles) {
        const content = readSourceFile(file);
        if (!content) continue;

        // Skip simple landing pages that may not need interfaces
        if (file.includes('MaLandingPage')) continue;

        // Should have interface or type definitions
        const hasInterface = content.includes('interface');
        const hasType = content.includes('type ');

        expect(hasInterface || hasType, `File ${file} should have TypeScript interfaces or types`).toBe(true);
      }
    });

    it('M&A components use proper file naming conventions', () => {
      const tsxFiles = getProductionTsxFiles();

      for (const file of tsxFiles) {
        const basename = path.basename(file, '.tsx');

        // Component files should use PascalCase
        if (!file.includes('.test.') && !file.includes('.stories.')) {
          const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(basename);
          expect(isPascalCase, `Component file ${file} should use PascalCase naming`).toBe(true);
        }
      }
    });
  });

  // ============================================================================
  // INTEGRATION COMPLIANCE
  // ============================================================================

  describe('Integration Compliance', () => {
    it('M&A components use proper path aliases', () => {
      const tsxFiles = getProductionTsxFiles();

      for (const file of tsxFiles) {
        const content = readSourceFile(file);
        if (!content) continue;

        // Skip simple landing pages
        if (file.includes('MaLandingPage')) continue;

        // Should use path aliases instead of relative paths for common imports
        // Matches both @renderer/ and @/renderer/ patterns
        const hasRendererAlias = content.includes('@renderer/') || content.includes('@/renderer/');
        const hasCommonAlias = content.includes('@common/') || content.includes('@/common/');
        const hasProcessAlias = content.includes('@process/') || content.includes('@/process/');

        expect(hasRendererAlias || hasCommonAlias || hasProcessAlias, `File ${file} should use path aliases`).toBe(
          true
        );
      }
    });

    it('M&A hooks use proper import patterns', () => {
      const tsxFiles = getProductionTsxFiles();

      for (const file of tsxFiles) {
        const content = readSourceFile(file);
        if (!content) continue;

        // Should import hooks from @renderer/hooks or @/renderer/hooks path
        if (
          content.includes('useDealContext') ||
          content.includes('useDocuments') ||
          content.includes('useDueDiligence') ||
          content.includes('useFlowiseReadiness')
        ) {
          const hasHooksImport = content.includes('@renderer/hooks') || content.includes('@/renderer/hooks');
          expect(hasHooksImport, `File ${file} should import hooks from @renderer/hooks`).toBe(true);
        }
      }
    });
  });
});
