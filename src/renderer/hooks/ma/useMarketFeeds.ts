/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Market Feeds Hook
 * Provides reactive access to market feed items and sources from the renderer process.
 */

import { useState, useCallback } from 'react';
import { ipcBridge } from '@/common';
import type {
  FeedItem,
  FeedSource,
  CreateFeedItemInput,
  UpdateFeedItemInput,
  CreateFeedSourceInput,
  UpdateFeedSourceInput,
  FeedItemType,
} from '@/common/ma/marketFeed/schema';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';

export interface PaginatedFeedItems {
  data: FeedItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PaginatedFeedSources {
  data: FeedSource[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface UseMarketFeedsReturn {
  /** List of feed items */
  items: FeedItem[];
  /** Paginated items result */
  paginatedItems: PaginatedFeedItems | null;
  /** List of feed sources */
  sources: FeedSource[];
  /** Paginated sources result */
  paginatedSources: PaginatedFeedSources | null;
  /** Whether operation is in progress */
  isLoading: boolean;
  /** Current error message */
  error: string | null;
  /** Create a feed item */
  createItem: (input: CreateFeedItemInput) => Promise<FeedItem | null>;
  /** Get a feed item by ID */
  getItem: (id: string) => Promise<FeedItem | null>;
  /** Get a feed item by symbol */
  getItemBySymbol: (symbol: string) => Promise<FeedItem | null>;
  /** Update a feed item */
  updateItem: (id: string, input: UpdateFeedItemInput) => Promise<FeedItem | null>;
  /** Delete a feed item */
  deleteItem: (id: string) => Promise<boolean>;
  /** List items by type */
  listItemsByType: (type: FeedItemType, page?: number, pageSize?: number) => Promise<void>;
  /** List items by freshness */
  listItemsByFreshness: (freshness: FreshnessStatus, page?: number, pageSize?: number) => Promise<void>;
  /** Search items by symbol or name */
  searchItems: (query: string, page?: number, pageSize?: number) => Promise<void>;
  /** Create a feed source */
  createSource: (input: CreateFeedSourceInput) => Promise<FeedSource | null>;
  /** Get a feed source by ID */
  getSource: (id: string) => Promise<FeedSource | null>;
  /** Update a feed source */
  updateSource: (id: string, input: UpdateFeedSourceInput) => Promise<FeedSource | null>;
  /** Delete a feed source */
  deleteSource: (id: string) => Promise<boolean>;
  /** List all feed sources */
  listSources: (page?: number, pageSize?: number) => Promise<void>;
  /** List sources by status */
  listSourcesByStatus: (status: string, page?: number, pageSize?: number) => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

/**
 * Hook for market feed operations
 */
export function useMarketFeeds(): UseMarketFeedsReturn {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [paginatedItems, setPaginatedItems] = useState<PaginatedFeedItems | null>(null);
  const [sources, setSources] = useState<FeedSource[]>([]);
  const [paginatedSources, setPaginatedSources] = useState<PaginatedFeedSources | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createItem = useCallback(async (input: CreateFeedItemInput): Promise<FeedItem | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const item = await ipcBridge.ma.marketFeeds.createItem.invoke(input);
      setItems((prev) => [...prev, item]);
      return item;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create feed item';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getItem = useCallback(async (id: string): Promise<FeedItem | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const item = await ipcBridge.ma.marketFeeds.getItem.invoke({ id });
      return item;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get feed item';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getItemBySymbol = useCallback(async (symbol: string): Promise<FeedItem | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const item = await ipcBridge.ma.marketFeeds.getItemBySymbol.invoke({ symbol });
      return item;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get feed item by symbol';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateItem = useCallback(async (id: string, input: UpdateFeedItemInput): Promise<FeedItem | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const item = await ipcBridge.ma.marketFeeds.updateItem.invoke({ id, input });
      if (item) {
        setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
      }
      return item;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update feed item';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const deleted = await ipcBridge.ma.marketFeeds.deleteItem.invoke({ id });
      if (deleted) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
      return deleted;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete feed item';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listItemsByType = useCallback(async (type: FeedItemType, page = 0, pageSize = 50): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ipcBridge.ma.marketFeeds.listByType.invoke({ type, page, pageSize });
      setPaginatedItems(result);
      setItems(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list items by type';
      setError(message);
      setItems([]);
      setPaginatedItems(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listItemsByFreshness = useCallback(
    async (freshness: FreshnessStatus, page = 0, pageSize = 50): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await ipcBridge.ma.marketFeeds.listByFreshness.invoke({ freshness, page, pageSize });
        setPaginatedItems(result);
        setItems(result.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list items by freshness';
        setError(message);
        setItems([]);
        setPaginatedItems(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const searchItems = useCallback(async (query: string, page = 0, pageSize = 50): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ipcBridge.ma.marketFeeds.search.invoke({ query, page, pageSize });
      setPaginatedItems(result);
      setItems(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search items';
      setError(message);
      setItems([]);
      setPaginatedItems(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSource = useCallback(async (input: CreateFeedSourceInput): Promise<FeedSource | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const source = await ipcBridge.ma.marketFeeds.createSource.invoke(input);
      setSources((prev) => [...prev, source]);
      return source;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create feed source';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSource = useCallback(async (id: string): Promise<FeedSource | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const source = await ipcBridge.ma.marketFeeds.getSource.invoke({ id });
      return source;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get feed source';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSource = useCallback(async (id: string, input: UpdateFeedSourceInput): Promise<FeedSource | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const source = await ipcBridge.ma.marketFeeds.updateSource.invoke({ id, input });
      if (source) {
        setSources((prev) => prev.map((s) => (s.id === id ? source : s)));
      }
      return source;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update feed source';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSource = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const deleted = await ipcBridge.ma.marketFeeds.deleteSource.invoke({ id });
      if (deleted) {
        setSources((prev) => prev.filter((s) => s.id !== id));
      }
      return deleted;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete feed source';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listSources = useCallback(async (page = 0, pageSize = 50): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ipcBridge.ma.marketFeeds.listSources.invoke({ page, pageSize });
      setPaginatedSources(result);
      setSources(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list sources';
      setError(message);
      setSources([]);
      setPaginatedSources(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listSourcesByStatus = useCallback(async (status: string, page = 0, pageSize = 50): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ipcBridge.ma.marketFeeds.listSourcesByStatus.invoke({ status, page, pageSize });
      setPaginatedSources(result);
      setSources(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list sources by status';
      setError(message);
      setSources([]);
      setPaginatedSources(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    items,
    paginatedItems,
    sources,
    paginatedSources,
    isLoading,
    error,
    createItem,
    getItem,
    getItemBySymbol,
    updateItem,
    deleteItem,
    listItemsByType,
    listItemsByFreshness,
    searchItems,
    createSource,
    getSource,
    updateSource,
    deleteSource,
    listSources,
    listSourcesByStatus,
    clearError,
  };
}

export default useMarketFeeds;
