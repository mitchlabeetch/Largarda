/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Market Feed schema for M&A data spine.
 * Represents market data feeds (stock prices, indices, rates) with provenance and freshness tracking.
 */

import { z } from 'zod';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';
import { FreshnessStatusSchema } from '@/common/ma/sourceCache/schema';

// ============================================================================
// Market Feed Types
// ============================================================================

export const FeedItemTypeSchema = z.enum([
  'stock_price',
  'index_value',
  'interest_rate',
  'fx_rate',
  'commodity_price',
  'economic_indicator',
  'sector_multiple',
]);

export type FeedItemType = z.infer<typeof FeedItemTypeSchema>;

export const FeedItemSchema = z.object({
  id: z.string(),
  /** Type of feed item */
  type: FeedItemTypeSchema,
  /** Symbol/ticker (e.g., 'AAPL', 'CAC40', 'EURUSD') */
  symbol: z.string().min(1),
  /** Human-readable name */
  name: z.string().min(1),
  /** Current value */
  value: z.number(),
  /** Change from previous value */
  change: z.number().optional(),
  /** Change percentage */
  changePercent: z.number().optional(),
  /** Currency if applicable */
  currency: z.string().optional(),
  /** Unit of measurement (e.g., 'EUR', 'USD', 'bps') */
  unit: z.string().optional(),
  /** Data provider/source */
  source: z.string().min(1),
  /** Exchange/market if applicable */
  exchange: z.string().optional(),
  /** Timestamp when this value was recorded */
  timestamp: z.number().int().positive(),
  /** Additional metadata (JSON string) */
  metadataJson: z.string().optional(),
  /** Full provenance metadata (JSON string) */
  provenanceJson: z.string().optional(),
  /** Freshness status */
  freshness: FreshnessStatusSchema,
  /** When this data was fetched */
  fetchedAt: z.number().int().positive(),
  /** TTL in ms for freshness calculation */
  ttlMs: z.number().int().nonnegative().default(300000), // 5 minutes default
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export type FeedItem = z.infer<typeof FeedItemSchema>;

export const CreateFeedItemInputSchema = z.object({
  type: FeedItemTypeSchema,
  symbol: z.string().min(1),
  name: z.string().min(1),
  value: z.number(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  currency: z.string().optional(),
  unit: z.string().optional(),
  source: z.string().min(1),
  exchange: z.string().optional(),
  timestamp: z.number().int().positive(),
  metadataJson: z.string().optional(),
  provenanceJson: z.string().optional(),
  freshness: FreshnessStatusSchema.optional(),
  fetchedAt: z.number().int().positive().optional(),
  ttlMs: z.number().int().nonnegative().optional(),
});

export type CreateFeedItemInput = z.infer<typeof CreateFeedItemInputSchema>;

export const UpdateFeedItemInputSchema = z.object({
  type: FeedItemTypeSchema.optional(),
  symbol: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  value: z.number().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  currency: z.string().optional(),
  unit: z.string().optional(),
  source: z.string().min(1).optional(),
  exchange: z.string().optional(),
  timestamp: z.number().int().positive().optional(),
  metadataJson: z.string().optional(),
  provenanceJson: z.string().optional(),
  freshness: FreshnessStatusSchema.optional(),
  fetchedAt: z.number().int().positive().optional(),
  ttlMs: z.number().int().nonnegative().optional(),
});

export type UpdateFeedItemInput = z.infer<typeof UpdateFeedItemInputSchema>;

// ============================================================================
// Feed Source (Configuration)
// ============================================================================

export const FeedSourceStatusSchema = z.enum(['active', 'paused', 'error', 'disabled']);

export type FeedSourceStatus = z.infer<typeof FeedSourceStatusSchema>;

export const FeedSourceSchema = z.object({
  id: z.string(),
  /** Provider name (e.g., 'bloomberg', 'refinitiv', 'alpha_vantage') */
  provider: z.string().min(1),
  /** Human-readable name */
  name: z.string().min(1),
  /** Feed type provided */
  feedTypes: z.array(FeedItemTypeSchema),
  /** Base URL or endpoint */
  endpoint: z.string().optional(),
  /** Configuration (JSON string) */
  configJson: z.string().optional(),
  /** API key reference (stored securely elsewhere) */
  apiKeyRef: z.string().optional(),
  /** Refresh interval in ms */
  refreshIntervalMs: z.number().int().positive().default(300000),
  /** Current status */
  status: FeedSourceStatusSchema,
  /** Error message if status is 'error' */
  errorMessage: z.string().optional(),
  /** Last successful fetch timestamp */
  lastFetchAt: z.number().int().positive().optional(),
  /** Count of items fetched in last refresh */
  lastFetchCount: z.number().int().nonnegative().optional(),
  /** Full provenance metadata */
  provenanceJson: z.string().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export type FeedSource = z.infer<typeof FeedSourceSchema>;

export const CreateFeedSourceInputSchema = z.object({
  provider: z.string().min(1),
  name: z.string().min(1),
  feedTypes: z.array(FeedItemTypeSchema),
  endpoint: z.string().optional(),
  configJson: z.string().optional(),
  apiKeyRef: z.string().optional(),
  refreshIntervalMs: z.number().int().positive().optional(),
  status: FeedSourceStatusSchema.optional(),
  provenanceJson: z.string().optional(),
});

export type CreateFeedSourceInput = z.infer<typeof CreateFeedSourceInputSchema>;

export const UpdateFeedSourceInputSchema = z.object({
  provider: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  feedTypes: z.array(FeedItemTypeSchema).optional(),
  endpoint: z.string().optional(),
  configJson: z.string().optional(),
  apiKeyRef: z.string().optional(),
  refreshIntervalMs: z.number().int().positive().optional(),
  status: FeedSourceStatusSchema.optional(),
  errorMessage: z.string().optional(),
  lastFetchAt: z.number().int().positive().optional(),
  lastFetchCount: z.number().int().nonnegative().optional(),
  provenanceJson: z.string().optional(),
});

export type UpdateFeedSourceInput = z.infer<typeof UpdateFeedSourceInputSchema>;

// ============================================================================
// Database Row Types
// ============================================================================

export interface IMaFeedItemRow {
  id: string;
  type: string;
  symbol: string;
  name: string;
  value: number;
  change: number | null;
  change_percent: number | null;
  currency: string | null;
  unit: string | null;
  source: string;
  exchange: string | null;
  timestamp: number;
  metadata_json: string | null;
  provenance_json: string | null;
  freshness: string;
  fetched_at: number;
  ttl_ms: number;
  created_at: number;
  updated_at: number;
}

export interface IMaFeedSourceRow {
  id: string;
  provider: string;
  name: string;
  feed_types_json: string;
  endpoint: string | null;
  config_json: string | null;
  api_key_ref: string | null;
  refresh_interval_ms: number;
  status: string;
  error_message: string | null;
  last_fetch_at: number | null;
  last_fetch_count: number | null;
  provenance_json: string | null;
  created_at: number;
  updated_at: number;
}

// ============================================================================
// Row Mappers
// ============================================================================

export function feedItemToRow(item: FeedItem): IMaFeedItemRow {
  return {
    id: item.id,
    type: item.type,
    symbol: item.symbol,
    name: item.name,
    value: item.value,
    change: item.change ?? null,
    change_percent: item.changePercent ?? null,
    currency: item.currency ?? null,
    unit: item.unit ?? null,
    source: item.source,
    exchange: item.exchange ?? null,
    timestamp: item.timestamp,
    metadata_json: item.metadataJson ?? null,
    provenance_json: item.provenanceJson ?? null,
    freshness: item.freshness,
    fetched_at: item.fetchedAt,
    ttl_ms: item.ttlMs,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function rowToFeedItem(row: IMaFeedItemRow): FeedItem {
  return {
    id: row.id,
    type: row.type as FeedItemType,
    symbol: row.symbol,
    name: row.name,
    value: row.value,
    change: row.change ?? undefined,
    changePercent: row.change_percent ?? undefined,
    currency: row.currency ?? undefined,
    unit: row.unit ?? undefined,
    source: row.source,
    exchange: row.exchange ?? undefined,
    timestamp: row.timestamp,
    metadataJson: row.metadata_json ?? undefined,
    provenanceJson: row.provenance_json ?? undefined,
    freshness: row.freshness as FreshnessStatus,
    fetchedAt: row.fetched_at,
    ttlMs: row.ttl_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function feedSourceToRow(source: FeedSource): IMaFeedSourceRow {
  return {
    id: source.id,
    provider: source.provider,
    name: source.name,
    feed_types_json: JSON.stringify(source.feedTypes),
    endpoint: source.endpoint ?? null,
    config_json: source.configJson ?? null,
    api_key_ref: source.apiKeyRef ?? null,
    refresh_interval_ms: source.refreshIntervalMs,
    status: source.status,
    error_message: source.errorMessage ?? null,
    last_fetch_at: source.lastFetchAt ?? null,
    last_fetch_count: source.lastFetchCount ?? null,
    provenance_json: source.provenanceJson ?? null,
    created_at: source.createdAt,
    updated_at: source.updatedAt,
  };
}

export function rowToFeedSource(row: IMaFeedSourceRow): FeedSource {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    feedTypes: JSON.parse(row.feed_types_json) as FeedItemType[],
    endpoint: row.endpoint ?? undefined,
    configJson: row.config_json ?? undefined,
    apiKeyRef: row.api_key_ref ?? undefined,
    refreshIntervalMs: row.refresh_interval_ms,
    status: row.status as FeedSourceStatus,
    errorMessage: row.error_message ?? undefined,
    lastFetchAt: row.last_fetch_at ?? undefined,
    lastFetchCount: row.last_fetch_count ?? undefined,
    provenanceJson: row.provenance_json ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
