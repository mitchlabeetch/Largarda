/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests for SIRENE client fetch and cache functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SireneClient } from '@process/services/data/sireneClient';
import type { SireneCompany, SireneSearchResult } from '@process/services/data/sireneClient';

// Mock fetch
global.fetch = vi.fn();

describe('SireneClient', () => {
  let client: SireneClient;

  beforeEach(() => {
    client = new SireneClient({ baseUrl: 'https://test.api.gouv.fr' });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search', () => {
    it('should fetch and cache search results', async () => {
      const mockResult: SireneSearchResult = {
        results: [
          {
            siren: '123456789',
            nom_complet: 'Test Company',
          },
        ],
        total_results: 1,
        page: 1,
        per_page: 1,
        total_pages: 1,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await client.search({ q: 'Test Company' });

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.api.gouv.fr/search?q=Test+Company',
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });

    it('should use cached results when available', async () => {
      const mockResult: SireneSearchResult = {
        results: [
          {
            siren: '123456789',
            nom_complet: 'Test Company',
          },
        ],
        total_results: 1,
        page: 1,
        per_page: 1,
        total_pages: 1,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      // First call should fetch
      await client.search({ q: 'Test Company' });
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await client.search({ q: 'Test Company' });
      expect(global.fetch).toHaveBeenCalledTimes(1); // No additional fetch
    });

    it('should handle rate limiting', async () => {
      const mockResult: SireneSearchResult = {
        results: [],
        total_results: 0,
        page: 1,
        per_page: 1,
        total_pages: 0,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      });

      const startTime = Date.now();
      await Promise.all([client.search({ q: 'test1' }), client.search({ q: 'test2' })]);
      const duration = Date.now() - startTime;

      // Should take at least RATE_LIMIT_DELAY_MS between requests
      expect(duration).toBeGreaterThanOrEqual(150);
    });

    it('should retry on 5xx errors', async () => {
      const mockResult: SireneSearchResult = {
        results: [],
        total_results: 0,
        page: 1,
        per_page: 1,
        total_pages: 0,
      };

      (global.fetch as any).mockRejectedValueOnce(new Error('HTTP 503: Service Unavailable')).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await client.search({ q: 'Test' });

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      const error = new Error('HTTP 404: Not Found');
      (error as any).status = 404;

      (global.fetch as any).mockRejectedValueOnce(error);

      await expect(client.search({ q: 'Test' })).rejects.toThrow('HTTP 404: Not Found');
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it('should retry on 429 rate limit errors', async () => {
      const mockResult: SireneSearchResult = {
        results: [],
        total_results: 0,
        page: 1,
        per_page: 1,
        total_pages: 0,
      };

      const error = new Error('HTTP 429: Too Many Requests');
      (error as any).status = 429;

      (global.fetch as any).mockRejectedValueOnce(error).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await client.search({ q: 'Test' });

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('getBySiren', () => {
    it('should fetch company by SIREN', async () => {
      const mockCompany: SireneCompany = {
        siren: '123456789',
        nom_complet: 'Test Company',
      };

      const mockResult: SireneSearchResult = {
        results: [mockCompany],
        total_results: 1,
        page: 1,
        per_page: 1,
        total_pages: 1,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await client.getBySiren('123456789');

      expect(result).toEqual(mockCompany);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.api.gouv.fr/search?siren=123456789&per_page=1',
        expect.any(Object)
      );
    });

    it('should return null when company not found', async () => {
      const mockResult: SireneSearchResult = {
        results: [],
        total_results: 0,
        page: 1,
        per_page: 1,
        total_pages: 0,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await client.getBySiren('000000000');

      expect(result).toBeNull();
    });
  });

  describe('getBySiret', () => {
    it('should fetch company by SIRET', async () => {
      const mockCompany: SireneCompany = {
        siren: '123456789',
        nom_complet: 'Test Company',
        siege: { siret: '12345678900012' },
      };

      const mockResult: SireneSearchResult = {
        results: [mockCompany],
        total_results: 1,
        page: 1,
        per_page: 1,
        total_pages: 1,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await client.getBySiret('12345678900012');

      expect(result).toEqual(mockCompany);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.api.gouv.fr/search?siret=12345678900012&per_page=1',
        expect.any(Object)
      );
    });

    it('should return null when company not found', async () => {
      const mockResult: SireneSearchResult = {
        results: [],
        total_results: 0,
        page: 1,
        per_page: 1,
        total_pages: 0,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await client.getBySiret('00000000000000');

      expect(result).toBeNull();
    });
  });

  describe('fetchAllPages', () => {
    it('should fetch all pages of results', async () => {
      const mockPage1: SireneSearchResult = {
        results: [{ siren: '123456789', nom_complet: 'Company 1' }],
        total_results: 2,
        page: 1,
        per_page: 25,
        total_pages: 2,
      };

      const mockPage2: SireneSearchResult = {
        results: [{ siren: '987654321', nom_complet: 'Company 2' }],
        total_results: 2,
        page: 2,
        per_page: 25,
        total_pages: 2,
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPage1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPage2,
        });

      const result = await client.fetchAllPages({ q: 'test' });

      expect(result).toHaveLength(2);
      expect(result[0].siren).toBe('123456789');
      expect(result[1].siren).toBe('987654321');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle single page results', async () => {
      const mockResult: SireneSearchResult = {
        results: [{ siren: '123456789', nom_complet: 'Company 1' }],
        total_results: 1,
        page: 1,
        per_page: 25,
        total_pages: 1,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await client.fetchAllPages({ q: 'test' });

      expect(result).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('testConnection', () => {
    it('should return success on successful connection', async () => {
      const mockResult: SireneSearchResult = {
        results: [],
        total_results: 0,
        page: 1,
        per_page: 1,
        total_pages: 0,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error on failed connection', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('cache operations', () => {
    it('should clear cache', async () => {
      const cacheRepo = (client as any).cacheRepo;
      cacheRepo.clear = vi.fn().mockResolvedValue({ success: true, data: 0 });

      await client.clearCache();

      expect(cacheRepo.clear).toHaveBeenCalled();
    });

    it('should get cache statistics', async () => {
      const cacheRepo = (client as any).cacheRepo;
      cacheRepo.getStats = vi.fn().mockResolvedValue({
        success: true,
        data: { total: 10, expired: 2, stale: 5 },
      });

      const stats = await client.getCacheStats();

      expect(stats).toEqual({ total: 10, expired: 2, stale: 5 });
      expect(cacheRepo.getStats).toHaveBeenCalled();
    });
  });
});
