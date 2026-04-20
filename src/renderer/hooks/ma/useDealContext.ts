/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { ipcBridge } from '@/common';
import type { DealContext, CreateDealInput, UpdateDealInput, DealStatus } from '@/common/ma/types';

interface UseDealContextOptions {
  /** Whether to auto-refresh deals */
  autoRefresh?: boolean;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
}

interface UseDealContextReturn {
  /** List of all deals */
  deals: DealContext[];
  /** Currently active deal */
  activeDeal: DealContext | null;
  /** Whether deals are being loaded */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refresh deals manually */
  refresh: () => void;
  /** Create a new deal */
  createDeal: (input: CreateDealInput) => Promise<DealContext>;
  /** Update an existing deal */
  updateDeal: (id: string, updates: UpdateDealInput) => Promise<DealContext>;
  /** Delete a deal */
  deleteDeal: (id: string) => Promise<void>;
  /** Set a deal as active */
  setActiveDeal: (id: string) => Promise<void>;
  /** Archive a deal */
  archiveDeal: (id: string) => Promise<void>;
  /** Close a deal */
  closeDeal: (id: string) => Promise<void>;
  /** Reactivate a deal */
  reactivateDeal: (id: string) => Promise<void>;
  /** Clear the active deal */
  clearActiveDeal: () => Promise<void>;
  /** Check if a deal is the active deal */
  isActive: (id: string) => boolean;
  /** Get deal context for AI */
  getContextForAI: () => Promise<{ hasContext: boolean; deal?: DealContext; contextString?: string }>;
  /** Validate deal input */
  validateInput: (input: CreateDealInput) => Promise<{ valid: boolean; errors: string[] }>;
}

const fetcher = (status?: DealStatus) => ipcBridge.ma.deal.list.invoke(status ? { status } : {});
const activeDealFetcher = () => ipcBridge.ma.deal.getActive.invoke();

export function useDealContext(options: UseDealContextOptions = {}): UseDealContextReturn {
  const { autoRefresh = true, refreshInterval = 30000 } = options;

  const [activeDeal, setActiveDealState] = useState<DealContext | null>(null);

  // Fetch all deals
  const {
    data: deals = [],
    isLoading,
    error,
    mutate,
  } = useSWR<DealContext[]>('ma.deals', () => fetcher(), {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
    refreshInterval: autoRefresh ? refreshInterval : undefined,
  });

  // Fetch active deal
  const { data: fetchedActiveDeal, mutate: mutateActiveDeal } = useSWR<DealContext | null>(
    'ma.activeDeal',
    () => activeDealFetcher(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      refreshInterval: autoRefresh ? refreshInterval : undefined,
    }
  );

  // Sync active deal from fetched data
  useEffect(() => {
    if (fetchedActiveDeal) {
      setActiveDealState(fetchedActiveDeal);
    }
  }, [fetchedActiveDeal]);

  const refresh = useCallback(() => {
    mutate();
    mutateActiveDeal();
  }, [mutate, mutateActiveDeal]);

  const createDeal = useCallback(
    async (input: CreateDealInput): Promise<DealContext> => {
      const deal = await ipcBridge.ma.deal.create.invoke(input);
      mutate();
      // If this is the first deal, it should become active
      if (deals.length === 0) {
        mutateActiveDeal();
      }
      return deal;
    },
    [mutate, mutateActiveDeal, deals.length]
  );

  const updateDeal = useCallback(
    async (id: string, updates: UpdateDealInput): Promise<DealContext> => {
      const deal = await ipcBridge.ma.deal.update.invoke({ id, updates });
      mutate();
      // If updating the active deal, refresh active deal
      if (activeDeal?.id === id) {
        mutateActiveDeal();
      }
      return deal;
    },
    [mutate, mutateActiveDeal, activeDeal]
  );

  const deleteDeal = useCallback(
    async (id: string): Promise<void> => {
      await ipcBridge.ma.deal.delete.invoke({ id });
      mutate();
      // If deleting the active deal, clear active
      if (activeDeal?.id === id) {
        setActiveDealState(null);
        mutateActiveDeal();
      }
    },
    [mutate, mutateActiveDeal, activeDeal]
  );

  const setActiveDeal = useCallback(
    async (id: string): Promise<void> => {
      const deal = await ipcBridge.ma.deal.setActive.invoke({ id });
      setActiveDealState(deal);
      mutateActiveDeal();
    },
    [mutateActiveDeal]
  );

  const archiveDeal = useCallback(
    async (id: string): Promise<void> => {
      await ipcBridge.ma.deal.archive.invoke({ id });
      mutate();
      // If archiving the active deal, clear active
      if (activeDeal?.id === id) {
        setActiveDealState(null);
        mutateActiveDeal();
      }
    },
    [mutate, mutateActiveDeal, activeDeal]
  );

  const closeDeal = useCallback(
    async (id: string): Promise<void> => {
      await ipcBridge.ma.deal.close.invoke({ id });
      mutate();
      // If closing the active deal, clear active
      if (activeDeal?.id === id) {
        setActiveDealState(null);
        mutateActiveDeal();
      }
    },
    [mutate, mutateActiveDeal, activeDeal]
  );

  const reactivateDeal = useCallback(
    async (id: string): Promise<void> => {
      await ipcBridge.ma.deal.reactivate.invoke({ id });
      mutate();
    },
    [mutate]
  );

  const clearActiveDeal = useCallback(async (): Promise<void> => {
    setActiveDealState(null);
    // There's no clearActive IPC call, but we can set active to null by not calling anything
    // The active deal will be cleared on next refresh
    mutateActiveDeal();
  }, [mutateActiveDeal]);

  const isActive = useCallback(
    (id: string): boolean => {
      return activeDeal?.id === id;
    },
    [activeDeal]
  );

  const getContextForAI = useCallback(async () => {
    return ipcBridge.ma.deal.getContextForAI.invoke();
  }, []);

  const validateInput = useCallback(async (input: CreateDealInput) => {
    return ipcBridge.ma.deal.validate.invoke(input);
  }, []);

  return {
    deals,
    activeDeal,
    isLoading,
    error: error ? (error instanceof Error ? error : new Error(String(error))) : null,
    refresh,
    createDeal,
    updateDeal,
    deleteDeal,
    setActiveDeal,
    archiveDeal,
    closeDeal,
    reactivateDeal,
    clearActiveDeal,
    isActive,
    getContextForAI,
    validateInput,
  };
}

export default useDealContext;
