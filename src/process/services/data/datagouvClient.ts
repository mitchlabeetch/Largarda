/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * data.gouv.fr API Client
 * Provides access to French open data platform with pagination, rate-limiting, and caching.
 */

import { getDatagouvCacheRepository } from '@process/services/database/repositories/ma/DatagouvCacheRepository';

const DEFAULT_BASE_URL = 'https://www.data.gouv.fr/api/1';
const RATE_LIMIT_DELAY_MS = 1000; // 1 req/s
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Rate limiter to enforce 1 req/s
 */
class RateLimiter {
  private lastRequestTime = 0;

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_DELAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = BASE_RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on client errors (4xx)
      if (error instanceof Error && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          throw lastError;
        }
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * data.gouv.fr API Client
 */
export class DatagouvClient {
  private baseUrl: string;
  private timeout: number;
  private rateLimiter: RateLimiter;
  private cacheRepo: ReturnType<typeof getDatagouvCacheRepository>;
  private apiKey?: string;

  constructor(config?: { baseUrl?: string; timeout?: number; apiKey?: string }) {
    this.baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = config?.timeout ?? DEFAULT_TIMEOUT_MS;
    this.rateLimiter = new RateLimiter();
    this.cacheRepo = getDatagouvCacheRepository();
    this.apiKey = config?.apiKey;
  }

  /**
   * Build cache key from request parameters
   */
  private buildCacheKey(apiSurface: string, params: Record<string, unknown>): string {
    return JSON.stringify({ apiSurface, params });
  }

  /**
   * Try to get cached response
   */
  private async getCached<T>(apiSurface: string, params: Record<string, unknown>): Promise<T | null> {
    const key = this.buildCacheKey(apiSurface, params);
    const cached = await this.cacheRepo.get(apiSurface, key);

    if (cached.success && cached.data) {
      return JSON.parse(cached.data.payloadJson) as T;
    }

    return null;
  }

  /**
   * Cache response
   */
  private async setCached(
    apiSurface: string,
    params: Record<string, unknown>,
    data: unknown,
    sourceUrl?: string
  ): Promise<void> {
    const key = this.buildCacheKey(apiSurface, params);
    await this.cacheRepo.create(apiSurface, key, JSON.stringify(data), CACHE_TTL_MS, sourceUrl);
  }

  /**
   * Make HTTP request with rate limiting and retry
   */
  private async request<T>(endpoint: string, options: RequestInit = {}, useCache: boolean = true): Promise<T> {
    await this.rateLimiter.wait();

    const url = `${this.baseUrl}${endpoint}`;
    const cacheKey = options.method === 'GET' ? endpoint : `${options.method ?? 'GET'}:${endpoint}`;

    // Try cache for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cached = await this.getCached<T>(cacheKey, options.body ? JSON.parse(options.body as string) : {});
      if (cached !== null) {
        return cached;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    };

    if (this.apiKey) {
      headers['X-API-KEY'] = this.apiKey;
    }

    const response = await retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const res = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const error = new Error(`HTTP ${res.status}: ${res.statusText}`);
          (error as any).status = res.status;
          throw error;
        }

        return res;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });

    const data = (await response.json()) as T;

    // Cache GET responses
    if (useCache && (!options.method || options.method === 'GET')) {
      await this.setCached(cacheKey, options.body ? JSON.parse(options.body as string) : {}, data, url);
    }

    return data;
  }

  /**
   * Search datasets
   * GET /api/1/datasets/
   */
  async searchDatasets(params: {
    q?: string;
    filters?: Record<string, unknown>;
    sort?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: unknown[];
    next_page?: string;
    page: number;
    page_size: number;
    total: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.append('q', params.q);
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.pageSize) searchParams.append('page_size', params.pageSize.toString());

    // Add filters
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/datasets/${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  /**
   * Get dataset by ID or slug
   * GET /api/1/datasets/{id}/
   */
  async getDataset(idOrSlug: string): Promise<unknown> {
    return this.request(`/datasets/${idOrSlug}/`);
  }

  /**
   * List dataset resources
   * GET /api/1/datasets/{id}/resources/
   */
  async listDatasetResources(idOrSlug: string): Promise<unknown[]> {
    const response = await this.request<{ data: unknown[] }>(`/datasets/${idOrSlug}/resources/`);
    return response.data ?? [];
  }

  /**
   * Query tabular data (Tabular API)
   * GET /api/1/tabular/data/{rid}/
   */
  async queryTabular(params: {
    rid: string;
    filters?: Record<string, unknown>;
    orderBy?: string;
    pageSize?: number;
    page?: number;
  }): Promise<{
    data: Record<string, unknown>[];
    next_page?: string;
    page: number;
    page_size: number;
    total: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    if (params.orderBy) searchParams.append('order_by', params.orderBy);
    if (params.pageSize) searchParams.append('page_size', params.pageSize.toString());
    if (params.page) searchParams.append('page', params.page.toString());

    const queryString = searchParams.toString();
    const endpoint = `/tabular/data/${params.rid}/${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  /**
   * Get metrics (Metrics API)
   * GET /api/1/metrics/{model}/
   */
  async getMetrics(params: { model: string; filters?: Record<string, unknown> }): Promise<Record<string, unknown>> {
    const searchParams = new URLSearchParams();
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/metrics/${params.model}/${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  /**
   * Search dataservices (APIs)
   * GET /api/1/dataservices/
   */
  async searchDataservices(params: {
    q?: string;
    filters?: Record<string, unknown>;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: unknown[];
    next_page?: string;
    page: number;
    page_size: number;
    total: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.append('q', params.q);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.pageSize) searchParams.append('page_size', params.pageSize.toString());

    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/dataservices/${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  /**
   * Get dataservice by ID
   * GET /api/1/dataservices/{id}/
   */
  async getDataservice(id: string): Promise<unknown> {
    return this.request(`/dataservices/${id}/`);
  }

  /**
   * Follow pagination to fetch all pages
   */
  async fetchAllPages<T>(
    fetchFn: (page: number) => Promise<{
      data: T[];
      next_page?: string;
      page: number;
      page_size: number;
      total: number;
    }>
  ): Promise<T[]> {
    const allData: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetchFn(page);
      allData.push(...response.data);

      hasMore = !!response.next_page;
      page++;
    }

    return allData;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request('/datasets/?page_size=1');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await this.cacheRepo.clear();
  }
}

// Singleton instance
let datagouvClientInstance: DatagouvClient | null = null;

export function getDatagouvClient(config?: { baseUrl?: string; timeout?: number; apiKey?: string }): DatagouvClient {
  if (!datagouvClientInstance) {
    datagouvClientInstance = new DatagouvClient(config);
  }
  return datagouvClientInstance;
}
