/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Source cache schema for M&A data spine.
 * Generic cache for external API responses with provenance, freshness,
 * and canonical-source policy tracking.
 */

import { z } from 'zod';

// ============================================================================
// Canonical-Source Policy
// ============================================================================

/**
 * Declares which source is authoritative for a given data surface.
 * When multiple sources provide the same field, the canonical source wins.
 * Non-canonical sources are retained for audit but never overwrite.
 */
export type CanonicalSourcePolicy = 'canonical' | 'supplementary' | 'override';

export const CanonicalSourcePolicySchema = z.enum(['canonical', 'supplementary', 'override']);

// ============================================================================
// Provenance & Freshness Types
// ============================================================================

export const ProvenanceSchema = z.object({
  source: z.string().min(1),
  fetchedAt: z.number().int().positive(),
  /** ISO-8601 or free-form version tag from the upstream. */
  upstreamVersion: z.string().optional(),
  /** HTTP etag or content-hash for conditional re-fetch. */
  etag: z.string().optional(),
  /** Millisecond duration the provider considers this data fresh. */
  freshnessTtlMs: z.number().int().nonnegative().optional(),
  policy: CanonicalSourcePolicySchema,
});

export type Provenance = z.infer<typeof ProvenanceSchema>;

/**
 * Freshness status computed from provenance + current time.
 * Persisted alongside rows so queries can filter stale data cheaply.
 */
export type FreshnessStatus = 'fresh' | 'stale' | 'expired' | 'unknown';

export const FreshnessStatusSchema = z.enum(['fresh', 'stale', 'expired', 'unknown']);

// ============================================================================
// Source Cache Types
// ============================================================================

export const SourceCacheSchema = z.object({
  id: z.string(),
  /** Logical surface this cache entry belongs to (e.g. 'sirene', 'pappers', 'bodacc'). */
  surface: z.string().min(1),
  /** Natural key for the cached resource (e.g. SIREN, SIRET, dataset ID). */
  lookupKey: z.string().min(1),
  /** Serialised API response payload. */
  payloadJson: z.string(),
  /** Full provenance metadata. */
  provenanceJson: z.string(),
  /** When this entry was last fetched / refreshed. */
  fetchedAt: z.number().int().positive(),
  /** TTL in ms; entry is stale after fetchedAt + ttlMs. */
  ttlMs: z.number().int().nonnegative(),
  /** Computed freshness status, updated on every write. */
  freshness: FreshnessStatusSchema,
  /** Original request URL for audit / re-fetch. */
  sourceUrl: z.string().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const CreateSourceCacheInputSchema = z.object({
  surface: z.string().min(1),
  lookupKey: z.string().min(1),
  payloadJson: z.string(),
  provenanceJson: z.string(),
  fetchedAt: z.number().int().positive(),
  ttlMs: z.number().int().nonnegative(),
  freshness: FreshnessStatusSchema.optional(),
  sourceUrl: z.string().optional(),
});

export const UpdateSourceCacheInputSchema = z.object({
  payloadJson: z.string().optional(),
  provenanceJson: z.string().optional(),
  fetchedAt: z.number().int().positive().optional(),
  ttlMs: z.number().int().nonnegative().optional(),
  freshness: FreshnessStatusSchema.optional(),
  sourceUrl: z.string().optional(),
});

// ============================================================================
// Source Cache Interfaces
// ============================================================================

export interface SourceCache {
  id: string;
  surface: string;
  lookupKey: string;
  payloadJson: string;
  provenanceJson: string;
  fetchedAt: number;
  ttlMs: number;
  freshness: FreshnessStatus;
  sourceUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateSourceCacheInput {
  surface: string;
  lookupKey: string;
  payloadJson: string;
  provenanceJson: string;
  fetchedAt: number;
  ttlMs: number;
  freshness?: FreshnessStatus;
  sourceUrl?: string;
}

export interface UpdateSourceCacheInput {
  payloadJson?: string;
  provenanceJson?: string;
  fetchedAt?: number;
  ttlMs?: number;
  freshness?: FreshnessStatus;
  sourceUrl?: string;
}

// ============================================================================
// Database Row Types
// ============================================================================

export interface IMaSourceCacheRow {
  id: string;
  surface: string;
  lookup_key: string;
  payload_json: string;
  provenance_json: string;
  fetched_at: number;
  ttl_ms: number;
  freshness: string;
  source_url: string | null;
  created_at: number;
  updated_at: number;
}

// ============================================================================
// Row Mappers
// ============================================================================

export function sourceCacheToRow(cache: SourceCache): IMaSourceCacheRow {
  return {
    id: cache.id,
    surface: cache.surface,
    lookup_key: cache.lookupKey,
    payload_json: cache.payloadJson,
    provenance_json: cache.provenanceJson,
    fetched_at: cache.fetchedAt,
    ttl_ms: cache.ttlMs,
    freshness: cache.freshness,
    source_url: cache.sourceUrl ?? null,
    created_at: cache.createdAt,
    updated_at: cache.updatedAt,
  };
}

export function rowToSourceCache(row: IMaSourceCacheRow): SourceCache {
  return {
    id: row.id,
    surface: row.surface,
    lookupKey: row.lookup_key,
    payloadJson: row.payload_json,
    provenanceJson: row.provenance_json,
    fetchedAt: row.fetched_at,
    ttlMs: row.ttl_ms,
    freshness: row.freshness as FreshnessStatus,
    sourceUrl: row.source_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Freshness Helpers
// ============================================================================

/**
 * Compute freshness from fetchedAt + ttlMs relative to `now`.
 * - fresh   : now < fetchedAt + ttlMs * 0.75
 * - stale   : now >= fetchedAt + ttlMs * 0.75  && now < fetchedAt + ttlMs
 * - expired : now >= fetchedAt + ttlMs
 * - unknown : ttlMs === 0
 */
export function computeFreshness(fetchedAt: number, ttlMs: number, now: number): FreshnessStatus {
  if (ttlMs === 0) return 'unknown';
  const staleThreshold = fetchedAt + ttlMs * 0.75;
  const expiryThreshold = fetchedAt + ttlMs;
  if (now >= expiryThreshold) return 'expired';
  if (now >= staleThreshold) return 'stale';
  return 'fresh';
}
