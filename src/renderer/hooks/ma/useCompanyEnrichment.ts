/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Company Enrichment Hook
 * Provides reactive access to company enrichment operations from the renderer process.
 */

import { useState, useCallback, useRef } from 'react';
import { ipcBridge } from '@/common';
import type { Company } from '@/common/ma/company/schema';

export interface SearchResult {
  siren: string;
  siret?: string;
  name: string;
  legalForm?: string;
  nafCode?: string;
  headquartersAddress?: string;
}

export interface UseCompanyEnrichmentReturn {
  /** Search results from name search */
  searchResults: SearchResult[];
  /** Whether search is in progress */
  isSearching: boolean;
  /** Whether enrichment is in progress */
  isEnriching: boolean;
  /** Current error message */
  error: string | null;
  /** Search companies by name */
  searchByName: (query: string, limit?: number) => Promise<void>;
  /** Enrich a company by SIREN */
  enrichBySiren: (siren: string) => Promise<Company | null>;
  /** Enrich an existing company by ID */
  enrichCompany: (companyId: string) => Promise<Company | null>;
  /** Batch enrich multiple companies */
  batchEnrich: (companyIds: string[]) => Promise<Map<string, Company>>;
  /** Clear search results and error */
  clear: () => void;
  /** Enriched company result */
  enrichedCompany: Company | null;
  /** Batch enrichment results */
  batchResults: Map<string, Company>;
  /** Number of companies being enriched in batch */
  batchProgress: { current: number; total: number } | null;
}

/**
 * Hook for company enrichment operations
 */
export function useCompanyEnrichment(): UseCompanyEnrichmentReturn {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrichedCompany, setEnrichedCompany] = useState<Company | null>(null);
  const [batchResults, setBatchResults] = useState<Map<string, Company>>(new Map());
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    setSearchResults([]);
    setError(null);
    setEnrichedCompany(null);
    setBatchResults(new Map());
    setBatchProgress(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const searchByName = useCallback(async (query: string, limit = 10): Promise<void> => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await ipcBridge.ma.companyEnrichment.searchByName.invoke({ query: query.trim(), limit });
      setSearchResults(results as SearchResult[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const enrichBySiren = useCallback(async (siren: string): Promise<Company | null> => {
    if (!siren.trim()) {
      setError('SIREN is required');
      return null;
    }

    setIsEnriching(true);
    setError(null);

    try {
      const company = await ipcBridge.ma.companyEnrichment.enrichBySiren.invoke({ siren: siren.trim() });
      setEnrichedCompany(company);
      return company;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enrichment failed';
      setError(message);
      return null;
    } finally {
      setIsEnriching(false);
    }
  }, []);

  const enrichCompany = useCallback(async (companyId: string): Promise<Company | null> => {
    if (!companyId.trim()) {
      setError('Company ID is required');
      return null;
    }

    setIsEnriching(true);
    setError(null);

    try {
      const company = await ipcBridge.ma.companyEnrichment.enrichCompany.invoke({ companyId: companyId.trim() });
      setEnrichedCompany(company);
      return company;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enrichment failed';
      setError(message);
      return null;
    } finally {
      setIsEnriching(false);
    }
  }, []);

  const batchEnrich = useCallback(async (companyIds: string[]): Promise<Map<string, Company>> => {
    if (companyIds.length === 0) {
      setError('No companies to enrich');
      return new Map();
    }

    setIsEnriching(true);
    setError(null);
    setBatchProgress({ current: 0, total: companyIds.length });

    try {
      const results = await ipcBridge.ma.companyEnrichment.batchEnrich.invoke({ companyIds });
      const resultsMap = results instanceof Map ? results : new Map<string, Company>(Object.entries(results));
      setBatchResults(resultsMap);
      setBatchProgress({ current: companyIds.length, total: companyIds.length });
      return resultsMap;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch enrichment failed';
      setError(message);
      return new Map();
    } finally {
      setIsEnriching(false);
      setBatchProgress(null);
    }
  }, []);

  return {
    searchResults,
    isSearching,
    isEnriching,
    error,
    searchByName,
    enrichBySiren,
    enrichCompany,
    batchEnrich,
    clear,
    enrichedCompany,
    batchResults,
    batchProgress,
  };
}

export default useCompanyEnrichment;
