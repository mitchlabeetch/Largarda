/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useCompanyEnrichment Hook Tests
 * Tests for key state coverage: loading, error, success, empty states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCompanyEnrichment } from '@renderer/hooks/ma/useCompanyEnrichment';
import { ipcBridge } from '@/common';
import type { Company } from '@/common/ma/company/schema';

// Mock the ipcBridge
vi.mock('@/common', () => ({
  ipcBridge: {
    ma: {
      companyEnrichment: {
        searchByName: {
          invoke: vi.fn(),
        },
        enrichBySiren: {
          invoke: vi.fn(),
        },
        enrichCompany: {
          invoke: vi.fn(),
        },
        batchEnrich: {
          invoke: vi.fn(),
        },
      },
    },
  },
}));

describe('useCompanyEnrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state with no search results', () => {
      const { result } = renderHook(() => useCompanyEnrichment());

      expect(result.current.searchResults).toEqual([]);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.isEnriching).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.enrichedCompany).toBeNull();
      expect(result.current.batchResults.size).toBe(0);
      expect(result.current.batchProgress).toBeNull();
    });
  });

  describe('searchByName', () => {
    it('should handle loading state during search', async () => {
      const mockInvoke = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      vi.mocked(ipcBridge.ma.companyEnrichment.searchByName.invoke).mockImplementation(mockInvoke);

      const { result } = renderHook(() => useCompanyEnrichment());

      act(() => {
        result.current.searchByName('Test Company');
      });

      expect(result.current.isSearching).toBe(true);
      expect(result.current.error).toBeNull();

      await waitFor(() => expect(result.current.isSearching).toBe(false));
    });

    it('should update search results on successful search', async () => {
      const mockResults = [
        { siren: '123456789', name: 'Test Company 1', legalForm: 'SAS' },
        { siren: '987654321', name: 'Test Company 2', legalForm: 'SA' },
      ];
      vi.mocked(ipcBridge.ma.companyEnrichment.searchByName.invoke).mockResolvedValue(mockResults);

      const { result } = renderHook(() => useCompanyEnrichment());

      await act(async () => {
        await result.current.searchByName('Test');
      });

      expect(result.current.searchResults).toHaveLength(2);
      expect(result.current.searchResults[0].siren).toBe('123456789');
      expect(result.current.error).toBeNull();
    });

    it('should handle error state on search failure', async () => {
      vi.mocked(ipcBridge.ma.companyEnrichment.searchByName.invoke).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCompanyEnrichment());

      await act(async () => {
        await result.current.searchByName('Test');
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.searchResults).toEqual([]);
    });

    it('should clear previous results before new search', async () => {
      const mockResults = [{ siren: '123456789', name: 'Test Company' }];
      vi.mocked(ipcBridge.ma.companyEnrichment.searchByName.invoke)
        .mockResolvedValueOnce(mockResults)
        .mockRejectedValueOnce(new Error('Second search failed'));

      const { result } = renderHook(() => useCompanyEnrichment());

      await act(async () => {
        await result.current.searchByName('Test');
      });

      expect(result.current.searchResults).toHaveLength(1);

      await act(async () => {
        await result.current.searchByName('Another');
      });

      expect(result.current.error).toBe('Second search failed');
    });
  });

  describe('enrichBySiren', () => {
    it('should handle loading state during enrichment', async () => {
      const mockCompany: Company = {
        id: 'comp-1',
        siren: '123456789',
        name: 'Test Company',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(ipcBridge.ma.companyEnrichment.enrichBySiren.invoke).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockCompany), 100))
      );

      const { result } = renderHook(() => useCompanyEnrichment());

      act(() => {
        result.current.enrichBySiren('123456789');
      });

      expect(result.current.isEnriching).toBe(true);

      await waitFor(() => expect(result.current.isEnriching).toBe(false));
    });

    it('should return enriched company on success', async () => {
      const mockCompany: Company = {
        id: 'comp-1',
        siren: '123456789',
        name: 'Test Company',
        legalForm: 'SAS',
        nafCode: '62.01Z',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(ipcBridge.ma.companyEnrichment.enrichBySiren.invoke).mockResolvedValue(mockCompany);

      const { result } = renderHook(() => useCompanyEnrichment());

      let enriched: Company | null = null;
      await act(async () => {
        enriched = await result.current.enrichBySiren('123456789');
      });

      expect(enriched).toEqual(mockCompany);
      expect(result.current.enrichedCompany).toEqual(mockCompany);
      expect(result.current.error).toBeNull();
    });

    it('should handle error state on enrichment failure', async () => {
      vi.mocked(ipcBridge.ma.companyEnrichment.enrichBySiren.invoke).mockRejectedValue(new Error('Company not found'));

      const { result } = renderHook(() => useCompanyEnrichment());

      let enriched: Company | null = null;
      await act(async () => {
        enriched = await result.current.enrichBySiren('000000000');
      });

      expect(enriched).toBeNull();
      expect(result.current.error).toBe('Company not found');
      expect(result.current.enrichedCompany).toBeNull();
    });

    it('should return null for empty SIREN', async () => {
      const { result } = renderHook(() => useCompanyEnrichment());

      let enriched: Company | null = null;
      await act(async () => {
        enriched = await result.current.enrichBySiren('');
      });

      expect(enriched).toBeNull();
      expect(result.current.error).toBe('SIREN is required');
    });
  });

  describe('batchEnrich', () => {
    it('should handle batch progress state', async () => {
      const mockResults = new Map([
        [
          'comp-1',
          {
            id: 'comp-1',
            siren: '123456789',
            name: 'Company 1',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as Company,
        ],
        [
          'comp-2',
          {
            id: 'comp-2',
            siren: '987654321',
            name: 'Company 2',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as Company,
        ],
      ]);
      vi.mocked(ipcBridge.ma.companyEnrichment.batchEnrich.invoke).mockResolvedValue(mockResults);

      const { result } = renderHook(() => useCompanyEnrichment());

      await act(async () => {
        await result.current.batchEnrich(['comp-1', 'comp-2']);
      });

      expect(result.current.batchResults.size).toBe(2);
      expect(result.current.batchProgress).toBeNull();
    });

    it('should return empty map for empty company IDs', async () => {
      const { result } = renderHook(() => useCompanyEnrichment());

      let results: Map<string, Company> = new Map();
      await act(async () => {
        results = await result.current.batchEnrich([]);
      });

      expect(results.size).toBe(0);
      expect(result.current.error).toBe('No companies to enrich');
    });
  });

  describe('clear', () => {
    it('should clear all state', async () => {
      const mockResults = [{ siren: '123456789', name: 'Test Company' }];
      vi.mocked(ipcBridge.ma.companyEnrichment.searchByName.invoke).mockResolvedValue(mockResults);

      const { result } = renderHook(() => useCompanyEnrichment());

      await act(async () => {
        await result.current.searchByName('Test');
      });

      expect(result.current.searchResults).toHaveLength(1);

      act(() => {
        result.current.clear();
      });

      expect(result.current.searchResults).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.enrichedCompany).toBeNull();
      expect(result.current.batchResults.size).toBe(0);
    });
  });
});
