/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests for M&A identifier formatters
 */

import { describe, it, expect } from 'vitest';
import { formatSiren, formatSiret, formatCompanyIdentifiers, formatUuid } from '@/renderer/utils/ma/formatters/identifier';
import type { CompanyInfo } from '@/common/ma/types';

describe('M&A Identifier Formatters', () => {
  describe('formatSiren', () => {
    it('formats valid 9-digit SIREN', () => {
      const result = formatSiren('123456789');
      expect(result).toBe('123 456 789');
    });

    it('returns original string if not 9 digits', () => {
      const result = formatSiren('12345678');
      expect(result).toBe('12345678');
    });

    it('handles empty string', () => {
      const result = formatSiren('');
      expect(result).toBe('');
    });

    it('handles undefined', () => {
      const result = formatSiren(undefined as unknown as string);
      expect(result).toBe('');
    });
  });

  describe('formatSiret', () => {
    it('formats valid 14-digit SIRET', () => {
      const result = formatSiret('12345678900012');
      expect(result).toBe('123 456 789 00012');
    });

    it('returns original string if not 14 digits', () => {
      const result = formatSiret('1234567890001');
      expect(result).toBe('1234567890001');
    });

    it('handles empty string', () => {
      const result = formatSiret('');
      expect(result).toBe('');
    });

    it('handles undefined', () => {
      const result = formatSiret(undefined as unknown as string);
      expect(result).toBe('');
    });
  });

  describe('formatCompanyIdentifiers', () => {
    it('formats company with SIREN and SIRET', () => {
      const company: CompanyInfo = {
        name: 'Test Company',
        siren: '123456789',
        siret: '12345678900012',
      };
      const result = formatCompanyIdentifiers(company);
      expect(result).toEqual({
        siren: '123 456 789',
        siret: '123 456 789 00012',
      });
    });

    it('formats company with only SIREN', () => {
      const company: CompanyInfo = {
        name: 'Test Company',
        siren: '123456789',
      };
      const result = formatCompanyIdentifiers(company);
      expect(result).toEqual({
        siren: '123 456 789',
        siret: undefined,
      });
    });

    it('formats company with no identifiers', () => {
      const company: CompanyInfo = {
        name: 'Test Company',
      };
      const result = formatCompanyIdentifiers(company);
      expect(result).toEqual({
        siren: undefined,
        siret: undefined,
      });
    });
  });

  describe('formatUuid', () => {
    it('returns full UUID by default', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = formatUuid(uuid);
      expect(result).toBe(uuid);
    });

    it('truncates UUID when requested', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = formatUuid(uuid, true);
      expect(result).toBe('550e8400...');
    });

    it('handles short UUID', () => {
      const uuid = '550e8400';
      const result = formatUuid(uuid, true);
      expect(result).toBe('550e8400...');
    });
  });
});
