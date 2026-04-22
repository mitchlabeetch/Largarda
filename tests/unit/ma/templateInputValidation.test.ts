/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { validateTemplateVariables, resolveTemplateSpec } from '@/common/ma/template/registry';
import { isTemplateKey, TemplateKeySchema } from '@/common/ma/template/types';
import { ChecklistGenerator } from '@process/services/ma/ChecklistGenerator';
import { DocumentGenerator, MissingVariablesError } from '@process/services/ma/DocumentGenerator';
import type { FlowRunner, GenerateInput } from '@process/services/ma/DocumentGenerator';
import type { ChecklistGenerateInput } from '@process/services/ma/ChecklistGenerator';

// ============================================================================
// Helpers
// ============================================================================

const mockRunner: FlowRunner = {
  run: async () => 'mock content',
};

// ============================================================================
// Tests
// ============================================================================

describe('Input Validation', () => {
  // --------------------------------------------------------------------------
  // Registry-level validation
  // --------------------------------------------------------------------------

  describe('validateTemplateVariables', () => {
    it('NDA: returns empty when all required variables present', () => {
      const missing = validateTemplateVariables('tpl.nda', {
        dealId: 'x',
        disclosingParty: 'A',
        receivingParty: 'B',
      });
      expect(missing).toEqual([]);
    });

    it('NDA: reports all 3 missing when empty variables', () => {
      const missing = validateTemplateVariables('tpl.nda', {});
      expect(missing).toHaveLength(3);
      expect(missing).toContain('dealId');
      expect(missing).toContain('disclosingParty');
      expect(missing).toContain('receivingParty');
    });

    it('LOI: reports missing buyerName and targetName', () => {
      const missing = validateTemplateVariables('tpl.loi', { dealId: 'x' });
      expect(missing).toContain('buyerName');
      expect(missing).toContain('targetName');
    });

    it('DD: reports missing dealName', () => {
      const missing = validateTemplateVariables('tpl.dd', { dealId: 'x' });
      expect(missing).toContain('dealName');
    });

    it('teaser: only requires dealId', () => {
      const missing = validateTemplateVariables('tpl.teaser', { dealId: 'x' });
      expect(missing).toEqual([]);
    });

    it('IM: reports missing targetName', () => {
      const missing = validateTemplateVariables('tpl.im', { dealId: 'x' });
      expect(missing).toContain('targetName');
    });

    it('valuation: reports missing targetName', () => {
      const missing = validateTemplateVariables('tpl.valuation', { dealId: 'x' });
      expect(missing).toContain('targetName');
    });

    it('ignores extra variables not in the spec', () => {
      const missing = validateTemplateVariables('tpl.nda', {
        dealId: 'x',
        disclosingParty: 'A',
        receivingParty: 'B',
        extraField: 'ignored',
      });
      expect(missing).toEqual([]);
    });

    it('treats null and undefined variable values as present (key exists)', () => {
      const missing = validateTemplateVariables('tpl.nda', {
        dealId: null,
        disclosingParty: undefined,
        receivingParty: 'B',
      });
      // Keys exist even if values are null/undefined — validation only checks presence
      expect(missing).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // resolveTemplateSpec with bad keys
  // --------------------------------------------------------------------------

  describe('resolveTemplateSpec (bad keys)', () => {
    it('throws for an unknown key', () => {
      expect(() => resolveTemplateSpec('tpl.nonexistent' as 'tpl.nda')).toThrow(/No template registry entry/);
    });

    it('throws for empty string', () => {
      expect(() => resolveTemplateSpec('' as 'tpl.nda')).toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // isTemplateKey type guard
  // --------------------------------------------------------------------------

  describe('isTemplateKey', () => {
    it('accepts all known keys', () => {
      const keys = ['tpl.nda', 'tpl.loi', 'tpl.dd', 'tpl.teaser', 'tpl.im', 'tpl.valuation'];
      for (const key of keys) {
        expect(isTemplateKey(key)).toBe(true);
      }
    });

    it('rejects unknown strings', () => {
      expect(isTemplateKey('tpl.nonexistent')).toBe(false);
      expect(isTemplateKey('nda')).toBe(false);
      expect(isTemplateKey('ma.docs.nda.draft')).toBe(false);
    });

    it('rejects non-string types', () => {
      expect(isTemplateKey(42)).toBe(false);
      expect(isTemplateKey(null)).toBe(false);
      expect(isTemplateKey(undefined)).toBe(false);
      expect(isTemplateKey({})).toBe(false);
      expect(isTemplateKey([])).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // TemplateKeySchema (Zod)
  // --------------------------------------------------------------------------

  describe('TemplateKeySchema', () => {
    it('accepts valid keys', () => {
      expect(TemplateKeySchema.safeParse('tpl.nda').success).toBe(true);
    });

    it('rejects invalid keys', () => {
      expect(TemplateKeySchema.safeParse('invalid').success).toBe(false);
      expect(TemplateKeySchema.safeParse('').success).toBe(false);
      expect(TemplateKeySchema.safeParse(123).success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // ChecklistGenerator validation
  // --------------------------------------------------------------------------

  describe('ChecklistGenerator input validation', () => {
    const generator = new ChecklistGenerator();

    it('returns error result for missing NDA variables', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-v1',
        variables: {},
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.missingKeys).toContain('dealId');
        expect(result.missingKeys).toContain('disclosingParty');
        expect(result.missingKeys).toContain('receivingParty');
      }
    });

    it('returns error result for missing LOI variables', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.loi',
        dealId: 'deal-v2',
        variables: { dealId: 'x' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.missingKeys).toContain('buyerName');
        expect(result.missingKeys).toContain('targetName');
      }
    });

    it('returns error result for missing DD variables', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.dd',
        dealId: 'deal-v3',
        variables: {},
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.missingKeys).toContain('dealId');
        expect(result.missingKeys).toContain('dealName');
      }
    });

    it('returns error for template without local renderer', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.valuation',
        dealId: 'deal-v4',
        variables: { dealId: 'x', targetName: 'T' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('No local renderer');
      }
    });
  });

  // --------------------------------------------------------------------------
  // DocumentGenerator validation
  // --------------------------------------------------------------------------

  describe('DocumentGenerator input validation', () => {
    const generator = new DocumentGenerator(mockRunner);

    it('throws MissingVariablesError for empty variables', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-dv1',
        variables: {},
      };

      await expect(generator.generate(input)).rejects.toThrow(MissingVariablesError);
    });

    it('MissingVariablesError contains all missing keys', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.loi',
        dealId: 'deal-dv2',
        variables: {},
      };

      try {
        await generator.generate(input);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MissingVariablesError);
        expect((error as MissingVariablesError).missingKeys).toContain('dealId');
        expect((error as MissingVariablesError).missingKeys).toContain('buyerName');
        expect((error as MissingVariablesError).missingKeys).toContain('targetName');
      }
    });

    it('succeeds when all required variables are present', async () => {
      const input: GenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-dv3',
        variables: {
          dealId: 'deal-dv3',
          disclosingParty: 'A',
          receivingParty: 'B',
        },
      };

      const result = await generator.generate(input);
      expect(result.templateKey).toBe('tpl.nda');
    });
  });
});
