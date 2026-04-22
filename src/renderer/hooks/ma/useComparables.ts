/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Comparables Hook
 * Provides reactive access to comparable companies and sets from the renderer process.
 */

import { useState, useCallback } from 'react';
import { ipcBridge } from '@/common';
import type {
  ComparableCompany,
  ComparableSet,
  CreateComparableInput,
  UpdateComparableInput,
  CreateComparableSetInput,
  UpdateComparableSetInput,
} from '@/common/ma/comparable/schema';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';

export interface PaginatedComparables {
  data: ComparableCompany[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PaginatedComparableSets {
  data: ComparableSet[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface UseComparablesReturn {
  /** List of comparable companies */
  companies: ComparableCompany[];
  /** Paginated companies result */
  paginatedCompanies: PaginatedComparables | null;
  /** List of comparable sets */
  sets: ComparableSet[];
  /** Paginated sets result */
  paginatedSets: PaginatedComparableSets | null;
  /** Whether operation is in progress */
  isLoading: boolean;
  /** Current error message */
  error: string | null;
  /** Create a comparable company */
  createCompany: (input: CreateComparableInput) => Promise<ComparableCompany | null>;
  /** Get a comparable company by ID */
  getCompany: (id: string) => Promise<ComparableCompany | null>;
  /** Update a comparable company */
  updateCompany: (id: string, input: UpdateComparableInput) => Promise<ComparableCompany | null>;
  /** Delete a comparable company */
  deleteCompany: (id: string) => Promise<boolean>;
  /** List companies by sector */
  listCompaniesBySector: (sector: string, page?: number, pageSize?: number) => Promise<void>;
  /** List companies by freshness */
  listCompaniesByFreshness: (freshness: FreshnessStatus, page?: number, pageSize?: number) => Promise<void>;
  /** Search companies by name */
  searchCompanies: (query: string, page?: number, pageSize?: number) => Promise<void>;
  /** Create a comparable set */
  createSet: (input: CreateComparableSetInput) => Promise<ComparableSet | null>;
  /** Get a comparable set by ID */
  getSet: (id: string) => Promise<ComparableSet | null>;
  /** Update a comparable set */
  updateSet: (id: string, input: UpdateComparableSetInput) => Promise<ComparableSet | null>;
  /** Delete a comparable set */
  deleteSet: (id: string) => Promise<boolean>;
  /** List sets by sector */
  listSetsBySector: (sector: string, page?: number, pageSize?: number) => Promise<void>;
  /** List sets by deal */
  listSetsByDeal: (dealId: string, page?: number, pageSize?: number) => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

/**
 * Hook for comparable operations
 */
export function useComparables(): UseComparablesReturn {
  const [companies, setCompanies] = useState<ComparableCompany[]>([]);
  const [paginatedCompanies, setPaginatedCompanies] = useState<PaginatedComparables | null>(null);
  const [sets, setSets] = useState<ComparableSet[]>([]);
  const [paginatedSets, setPaginatedSets] = useState<PaginatedComparableSets | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createCompany = useCallback(async (input: CreateComparableInput): Promise<ComparableCompany | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const company = await ipcBridge.ma.comparables.createCompany.invoke(input);
      setCompanies((prev) => [...prev, company]);
      return company;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create comparable company';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCompany = useCallback(async (id: string): Promise<ComparableCompany | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const company = await ipcBridge.ma.comparables.getCompany.invoke({ id });
      return company;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get comparable company';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateCompany = useCallback(
    async (id: string, input: UpdateComparableInput): Promise<ComparableCompany | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const company = await ipcBridge.ma.comparables.updateCompany.invoke({ id, input });
        if (company) {
          setCompanies((prev) => prev.map((c) => (c.id === id ? company : c)));
        }
        return company;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update comparable company';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteCompany = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const deleted = await ipcBridge.ma.comparables.deleteCompany.invoke({ id });
      if (deleted) {
        setCompanies((prev) => prev.filter((c) => c.id !== id));
      }
      return deleted;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete comparable company';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listCompaniesBySector = useCallback(async (sector: string, page = 0, pageSize = 50): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ipcBridge.ma.comparables.listBySector.invoke({ sector, page, pageSize });
      setPaginatedCompanies(result);
      setCompanies(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list companies by sector';
      setError(message);
      setCompanies([]);
      setPaginatedCompanies(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listCompaniesByFreshness = useCallback(
    async (freshness: FreshnessStatus, page = 0, pageSize = 50): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await ipcBridge.ma.comparables.listByFreshness.invoke({ freshness, page, pageSize });
        setPaginatedCompanies(result);
        setCompanies(result.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list companies by freshness';
        setError(message);
        setCompanies([]);
        setPaginatedCompanies(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const searchCompanies = useCallback(async (query: string, page = 0, pageSize = 50): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ipcBridge.ma.comparables.searchByName.invoke({ query, page, pageSize });
      setPaginatedCompanies(result);
      setCompanies(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search companies';
      setError(message);
      setCompanies([]);
      setPaginatedCompanies(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSet = useCallback(async (input: CreateComparableSetInput): Promise<ComparableSet | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const set = await ipcBridge.ma.comparables.createSet.invoke(input);
      setSets((prev) => [...prev, set]);
      return set;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create comparable set';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSet = useCallback(async (id: string): Promise<ComparableSet | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const set = await ipcBridge.ma.comparables.getSet.invoke({ id });
      return set;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get comparable set';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSet = useCallback(async (id: string, input: UpdateComparableSetInput): Promise<ComparableSet | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const set = await ipcBridge.ma.comparables.updateSet.invoke({ id, input });
      if (set) {
        setSets((prev) => prev.map((s) => (s.id === id ? set : s)));
      }
      return set;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update comparable set';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSet = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const deleted = await ipcBridge.ma.comparables.deleteSet.invoke({ id });
      if (deleted) {
        setSets((prev) => prev.filter((s) => s.id !== id));
      }
      return deleted;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete comparable set';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listSetsBySector = useCallback(async (sector: string, page = 0, pageSize = 50): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ipcBridge.ma.comparables.listSetsBySector.invoke({ sector, page, pageSize });
      setPaginatedSets(result);
      setSets(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list sets by sector';
      setError(message);
      setSets([]);
      setPaginatedSets(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listSetsByDeal = useCallback(async (dealId: string, page = 0, pageSize = 50): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ipcBridge.ma.comparables.listSetsByDeal.invoke({ dealId, page, pageSize });
      setPaginatedSets(result);
      setSets(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list sets by deal';
      setError(message);
      setSets([]);
      setPaginatedSets(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    companies,
    paginatedCompanies,
    sets,
    paginatedSets,
    isLoading,
    error,
    createCompany,
    getCompany,
    updateCompany,
    deleteCompany,
    listCompaniesBySector,
    listCompaniesByFreshness,
    searchCompanies,
    createSet,
    getSet,
    updateSet,
    deleteSet,
    listSetsBySector,
    listSetsByDeal,
    clearError,
  };
}

export default useComparables;
