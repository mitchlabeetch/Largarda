/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_CATALOG,
  resolveTemplateSpec,
  isTemplateCallableInProd,
  getTemplatesByStatus,
  validateTemplateVariables,
} from '@/common/ma/template/registry';
import { KNOWN_TEMPLATE_KEYS, isTemplateKey, TemplateKeySchema } from '@/common/ma/template/types';

// ============================================================================
// Tests
// ============================================================================

describe('Template Registry', () => {
  // --------------------------------------------------------------------------
  // Catalogue completeness
  // --------------------------------------------------------------------------

  describe('TEMPLATE_CATALOG', () => {
    it('has an entry for every KNOWN_TEMPLATE_KEYS', () => {
      for (const key of KNOWN_TEMPLATE_KEYS) {
        expect(TEMPLATE_CATALOG[key]).toBeDefined();
        expect(TEMPLATE_CATALOG[key].key).toBe(key);
      }
    });

    it('has exactly the same number of entries as KNOWN_TEMPLATE_KEYS', () => {
      expect(Object.keys(TEMPLATE_CATALOG)).toHaveLength(KNOWN_TEMPLATE_KEYS.length);
    });

    it('every entry has a non-empty description', () => {
      for (const spec of Object.values(TEMPLATE_CATALOG)) {
        expect(spec.description.length).toBeGreaterThan(0);
      }
    });

    it('every entry has a valid flowKey', () => {
      for (const spec of Object.values(TEMPLATE_CATALOG)) {
        expect(spec.flowKey.length).toBeGreaterThan(0);
      }
    });

    it('every entry has at least one required variable', () => {
      for (const spec of Object.values(TEMPLATE_CATALOG)) {
        expect(Object.keys(spec.requiredVariables).length).toBeGreaterThan(0);
      }
    });

    it('every entry has a valid output format', () => {
      const validFormats = ['markdown', 'docx', 'pdf', 'html'];
      for (const spec of Object.values(TEMPLATE_CATALOG)) {
        expect(validFormats).toContain(spec.outputFormat);
      }
    });

    it('every entry has a valid status', () => {
      const validStatuses = ['draft', 'authored', 'deployed', 'deprecated'];
      for (const spec of Object.values(TEMPLATE_CATALOG)) {
        expect(validStatuses).toContain(spec.status);
      }
    });
  });

  // --------------------------------------------------------------------------
  // resolveTemplateSpec
  // --------------------------------------------------------------------------

  describe('resolveTemplateSpec', () => {
    it('resolves tpl.nda', () => {
      const spec = resolveTemplateSpec('tpl.nda');
      expect(spec.key).toBe('tpl.nda');
      expect(spec.flowKey).toBe('ma.docs.nda.draft');
    });

    it('resolves tpl.loi', () => {
      const spec = resolveTemplateSpec('tpl.loi');
      expect(spec.key).toBe('tpl.loi');
      expect(spec.flowKey).toBe('ma.docs.loi.draft');
    });

    it('resolves tpl.dd', () => {
      const spec = resolveTemplateSpec('tpl.dd');
      expect(spec.key).toBe('tpl.dd');
      expect(spec.flowKey).toBe('ma.dd.analysis');
    });

    it('resolves tpl.teaser', () => {
      const spec = resolveTemplateSpec('tpl.teaser');
      expect(spec.key).toBe('tpl.teaser');
      expect(spec.flowKey).toBe('ma.docs.teaser.draft');
    });

    it('resolves tpl.im', () => {
      const spec = resolveTemplateSpec('tpl.im');
      expect(spec.key).toBe('tpl.im');
      expect(spec.flowKey).toBe('ma.docs.im.draft');
    });

    it('resolves tpl.valuation', () => {
      const spec = resolveTemplateSpec('tpl.valuation');
      expect(spec.key).toBe('tpl.valuation');
      expect(spec.flowKey).toBe('ma.valuation.draft');
    });

    it('throws for an unknown key', () => {
      // Cast to bypass TS — testing runtime guard
      expect(() => resolveTemplateSpec('tpl.nonexistent' as 'tpl.nda')).toThrow(/No template registry entry/);
    });
  });

  // --------------------------------------------------------------------------
  // isTemplateCallableInProd
  // --------------------------------------------------------------------------

  describe('isTemplateCallableInProd', () => {
    it('returns true for authored templates', () => {
      const spec = resolveTemplateSpec('tpl.nda');
      expect(spec.status).toBe('authored');
      expect(isTemplateCallableInProd(spec)).toBe(true);
    });

    it('returns true for deployed templates', () => {
      const spec = { ...resolveTemplateSpec('tpl.nda'), status: 'deployed' as const };
      expect(isTemplateCallableInProd(spec)).toBe(true);
    });

    it('returns false for draft templates', () => {
      const spec = { ...resolveTemplateSpec('tpl.nda'), status: 'draft' as const };
      expect(isTemplateCallableInProd(spec)).toBe(false);
    });

    it('returns false for deprecated templates', () => {
      const spec = { ...resolveTemplateSpec('tpl.nda'), status: 'deprecated' as const };
      expect(isTemplateCallableInProd(spec)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // getTemplatesByStatus
  // --------------------------------------------------------------------------

  describe('getTemplatesByStatus', () => {
    it('returns all authored templates', () => {
      const authored = getTemplatesByStatus('authored');
      expect(authored.length).toBeGreaterThan(0);
      for (const spec of authored) {
        expect(spec.status).toBe('authored');
      }
    });

    it('returns empty array for a status with no entries', () => {
      const deprecated = getTemplatesByStatus('deprecated');
      expect(deprecated).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // validateTemplateVariables
  // --------------------------------------------------------------------------

  describe('validateTemplateVariables', () => {
    it('returns empty array when all required variables are present', () => {
      const missing = validateTemplateVariables('tpl.nda', {
        dealId: 'x',
        disclosingParty: 'A',
        receivingParty: 'B',
      });
      expect(missing).toEqual([]);
    });

    it('returns missing keys when some required variables are absent', () => {
      const missing = validateTemplateVariables('tpl.nda', {
        dealId: 'x',
      });
      expect(missing).toContain('disclosingParty');
      expect(missing).toContain('receivingParty');
    });

    it('returns all required keys when no variables are provided', () => {
      const missing = validateTemplateVariables('tpl.nda', {});
      expect(missing).toEqual(expect.arrayContaining(['dealId', 'disclosingParty', 'receivingParty']));
    });

    it('ignores optional variables (only checks required)', () => {
      const missing = validateTemplateVariables('tpl.nda', {
        dealId: 'x',
        disclosingParty: 'A',
        receivingParty: 'B',
        jurisdiction: 'France', // optional
      });
      expect(missing).toEqual([]);
    });

    it('validates tpl.valuation required variables', () => {
      const missing = validateTemplateVariables('tpl.valuation', {
        dealId: 'x',
        targetName: 'Target',
      });
      expect(missing).toEqual([]);
    });

    it('reports missing targetName for tpl.valuation', () => {
      const missing = validateTemplateVariables('tpl.valuation', {
        dealId: 'x',
      });
      expect(missing).toContain('targetName');
    });
  });

  // --------------------------------------------------------------------------
  // isTemplateKey
  // --------------------------------------------------------------------------

  describe('isTemplateKey', () => {
    it('returns true for valid template keys', () => {
      expect(isTemplateKey('tpl.nda')).toBe(true);
      expect(isTemplateKey('tpl.loi')).toBe(true);
      expect(isTemplateKey('tpl.dd')).toBe(true);
      expect(isTemplateKey('tpl.teaser')).toBe(true);
      expect(isTemplateKey('tpl.im')).toBe(true);
      expect(isTemplateKey('tpl.valuation')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isTemplateKey('tpl.nonexistent')).toBe(false);
      expect(isTemplateKey('')).toBe(false);
      expect(isTemplateKey(42)).toBe(false);
      expect(isTemplateKey(null)).toBe(false);
      expect(isTemplateKey(undefined)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // TemplateKeySchema (Zod)
  // --------------------------------------------------------------------------

  describe('TemplateKeySchema', () => {
    it('parses valid template keys', () => {
      for (const key of KNOWN_TEMPLATE_KEYS) {
        expect(TemplateKeySchema.safeParse(key).success).toBe(true);
      }
    });

    it('rejects invalid template keys', () => {
      expect(TemplateKeySchema.safeParse('tpl.nonexistent').success).toBe(false);
      expect(TemplateKeySchema.safeParse('').success).toBe(false);
    });
  });
});
