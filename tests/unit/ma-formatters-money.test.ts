/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests for M&A money formatters
 */

import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyAbbreviated } from '@/renderer/utils/ma/formatters/money';

describe('M&A Money Formatters', () => {
  describe('formatCurrency', () => {
    it('formats USD with default decimals', () => {
      const result = formatCurrency(1500000, 'USD', 0, 'en-US');
      expect(result).toBe('$1,500,000');
    });

    it('formats USD with decimals', () => {
      const result = formatCurrency(1500000.5, 'USD', 2, 'en-US');
      expect(result).toBe('$1,500,000.50');
    });

    it('formats EUR with locale', () => {
      const result = formatCurrency(1500000, 'EUR', 0, 'fr-FR');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats zero amount', () => {
      const result = formatCurrency(0, 'USD', 0, 'en-US');
      expect(result).toBe('$0');
    });

    it('formats negative amount', () => {
      const result = formatCurrency(-1500000, 'USD', 0, 'en-US');
      expect(result).toBe('-$1,500,000');
    });
  });

  describe('formatCurrencyAbbreviated', () => {
    it('formats thousands', () => {
      const result = formatCurrencyAbbreviated(1500, 'USD', 1, 'en-US');
      expect(result).toBe('$1.5K');
    });

    it('formats millions', () => {
      const result = formatCurrencyAbbreviated(1500000, 'USD', 1, 'en-US');
      expect(result).toBe('$1.5M');
    });

    it('formats billions', () => {
      const result = formatCurrencyAbbreviated(1500000000, 'USD', 1, 'en-US');
      expect(result).toBe('$1.5B');
    });

    it('formats small numbers without scale', () => {
      const result = formatCurrencyAbbreviated(500, 'USD', 1, 'en-US');
      expect(result).toBe('$500.0');
    });

    it('formats with locale', () => {
      const result = formatCurrencyAbbreviated(1500000, 'EUR', 1, 'fr-FR');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});
