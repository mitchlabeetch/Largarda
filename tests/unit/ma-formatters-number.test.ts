/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests for M&A number formatters
 */

import { describe, it, expect } from 'vitest';
import { formatNumber, formatPercentage, formatFileSize } from '@/renderer/utils/ma/formatters/number';

describe('M&A Number Formatters', () => {
  describe('formatNumber', () => {
    it('formats integer with default decimals', () => {
      const result = formatNumber(1234567);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats integer with specified decimals', () => {
      const result = formatNumber(1234.567, 2, 'en-US');
      expect(result).toBe('1,234.57');
    });

    it('formats number with locale', () => {
      const result = formatNumber(1234567, 0, 'fr-FR');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats zero', () => {
      const result = formatNumber(0, 0, 'en-US');
      expect(result).toBe('0');
    });

    it('formats negative number', () => {
      const result = formatNumber(-1234, 0, 'en-US');
      expect(result).toBe('-1,234');
    });
  });

  describe('formatPercentage', () => {
    it('formats percentage with default decimals', () => {
      const result = formatPercentage(75.5, 1, 'en-US');
      expect(result).toBe('75.5%');
    });

    it('formats percentage with specified decimals', () => {
      const result = formatPercentage(75.567, 2, 'en-US');
      expect(result).toBe('75.57%');
    });

    it('formats percentage with locale', () => {
      const result = formatPercentage(75.5, 1, 'fr-FR');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats zero percentage', () => {
      const result = formatPercentage(0, 1, 'en-US');
      expect(result).toBe('0.0%');
    });

    it('formats 100% percentage', () => {
      const result = formatPercentage(100, 1, 'en-US');
      expect(result).toBe('100.0%');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      const result = formatFileSize(512);
      expect(result).toBe('512 B');
    });

    it('formats kilobytes', () => {
      const result = formatFileSize(2048, 'en-US');
      expect(result).toBe('2.0 KB');
    });

    it('formats megabytes', () => {
      const result = formatFileSize(2 * 1024 * 1024, 'en-US');
      expect(result).toBe('2.0 MB');
    });

    it('formats gigabytes', () => {
      const result = formatFileSize(2 * 1024 * 1024 * 1024, 'en-US');
      expect(result).toBe('2.0 GB');
    });

    it('formats file size with locale', () => {
      const result = formatFileSize(2048, 'fr-FR');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});
