/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests for M&A date formatters
 */

import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatTime } from '@/renderer/utils/ma/formatters/date';

describe('M&A Date Formatters', () => {
  const timestamp = 1704067200000; // 2024-01-01 00:00:00 UTC

  describe('formatDate', () => {
    it('formats date with default locale', () => {
      const result = formatDate(timestamp);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats date with en-US locale', () => {
      const result = formatDate(timestamp, 'en-US');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats date with fr-FR locale', () => {
      const result = formatDate(timestamp, 'fr-FR');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats date with zh-CN locale', () => {
      const result = formatDate(timestamp, 'zh-CN');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatDateTime', () => {
    it('formats datetime with default locale', () => {
      const result = formatDateTime(timestamp);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats datetime with en-US locale', () => {
      const result = formatDateTime(timestamp, 'en-US');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats datetime with fr-FR locale', () => {
      const result = formatDateTime(timestamp, 'fr-FR');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatTime', () => {
    it('formats time with default locale', () => {
      const result = formatTime(timestamp);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats time with en-US locale', () => {
      const result = formatTime(timestamp, 'en-US');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('formats time with fr-FR locale', () => {
      const result = formatTime(timestamp, 'fr-FR');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});
