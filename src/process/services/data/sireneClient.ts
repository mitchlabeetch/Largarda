/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SIRENE API Client
 * Provides access to French company registry (recherche-entreprises.api.gouv.fr)
 * with pagination, rate-limiting, and caching.
 */

import { getSireneCacheRepository } from '@process/services/database/repositories/ma/SireneCacheRepository';

const DEFAULT_BASE_URL = 'https://recherche-entreprises.api.gouv.fr';
const RATE_LIMIT_DELAY_MS = 150; // ~6.6 req/s (under 7 req/s limit)
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * SIRENE API response types based on OpenAPI spec
 */
export interface SireneSearchResult {
  results: SireneCompany[];
  total_results: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface SireneCompany {
  siren: string;
  nom_complet: string;
  nom_raison_sociale?: string;
  sigle?: string;
  siege?: {
    siret?: string;
    adresse?: {
      numero_voie?: string;
      type_voie?: string;
      libelle_voie?: string;
      code_postal?: string;
      code_commune?: string;
      libelle_commune?: string;
      pays?: string;
    };
  };
  categorie_juridique?: string;
  forme_juridique?: string;
  activite_principale?: string;
  tranche_effectif?: string;
  effectif?: number;
  annee_creation?: number;
  date_creation?: string;
  date_creation_etablissement?: string;
  etat_administratif?: string;
  statut_diffusion?: string;
  identifiant_association?: string;
  statut_entrepreneur_spectacle?: string;
  type_siae?: string;
}

export interface SireneSearchParams {
  q?: string;
  siren?: string;
  siret?: string;
  nom_complet?: string;
  code_postal?: string;
  code_commune?: string;
  activite_principale?: string;
  categorie_juridique?: string;
  tranche_effectif?: string;
  page?: number;
  per_page?: number;
}

/**
 * Rate limiter to enforce rate limit (max 7 req/s)
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

      // Don't retry on client errors (4xx) except 429
      if (error instanceof Error && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500 && status !== 429) {
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
 * SIRENE API Client
 */
export class SireneClient {
  private baseUrl: string;
  private timeout: number;
  private rateLimiter: RateLimiter;
  private cacheRepo: ReturnType<typeof getSireneCacheRepository>;

  constructor(config?: { baseUrl?: string; timeout?: number }) {
    this.baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = config?.timeout ?? DEFAULT_TIMEOUT_MS;
    this.rateLimiter = new RateLimiter();
    this.cacheRepo = getSireneCacheRepository();
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
      // Check if marked as expired
      if ('isExpired' in cached.data && cached.data.isExpired) {
        return null;
      }
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
      ...(options.headers as Record<string, string>),
    };

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
   * Search companies
   * GET /search
   */
  async search(params: SireneSearchParams): Promise<SireneSearchResult> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.append('q', params.q);
    if (params.siren) searchParams.append('siren', params.siren);
    if (params.siret) searchParams.append('siret', params.siret);
    if (params.nom_complet) searchParams.append('nom_complet', params.nom_complet);
    if (params.code_postal) searchParams.append('code_postal', params.code_postal);
    if (params.code_commune) searchParams.append('code_commune', params.code_commune);
    if (params.activite_principale) searchParams.append('activite_prerincipale', params.activite_principale);
    if (params.categorie_juridique) searchParams.append('categorie_juridique', params.categorie_juridique);
    if (params.tranche_effectif) searchParams.append('tranche_effectif', params.tranche_effectif);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.per_page) searchParams.append('per_page', params.per_page.toString());

    const queryString = searchParams.toString();
    const endpoint = `/search${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  /**
   * Get company by SIREN
   * GET /search?siren={siren}
   */
  async getBySiren(siren: string): Promise<SireneCompany | null> {
    const result = await this.search({ siren, per_page: 1 });
    if (result.results.length > 0) {
      return result.results[0];
    }
    return null;
  }

  /**
   * Get company by SIRET
   * GET /search?siret={siret}
   */
  async getBySiret(siret: string): Promise<SireneCompany | null> {
    const result = await this.search({ siret, per_page: 1 });
    if (result.results.length > 0) {
      return result.results[0];
    }
    return null;
  }

  /**
   * Fetch all pages for a search
   */
  async fetchAllPages(params: Omit<SireneSearchParams, 'page' | 'per_page'>): Promise<SireneCompany[]> {
    const allData: SireneCompany[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.search({ ...params, page, per_page: 25 });
      allData.push(...response.results);

      hasMore = page < response.total_pages;
      page++;
    }

    return allData;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.search({ per_page: 1 });
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

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ total: number; expired: number; stale: number }> {
    const stats = await this.cacheRepo.getStats();
    return stats.success ? stats.data : { total: 0, expired: 0, stale: 0 };
  }
}

// Singleton instance
let sireneClientInstance: SireneClient | null = null;

export function getSireneClient(config?: { baseUrl?: string; timeout?: number }): SireneClient {
  if (!sireneClientInstance) {
    sireneClientInstance = new SireneClient(config);
  }
  return sireneClientInstance;
}
