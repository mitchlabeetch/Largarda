/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Watchlist schema for M&A data spine
 * Defines user-defined watchlists for company monitoring
 */

import { z } from 'zod';

// ============================================================================
// Watchlist Types
// ============================================================================

// Zod Schemas
export const WatchlistSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  name: z.string().min(1),
  criteriaJson: z.string(),
  cadence: z.string().optional(),
  enabled: z.boolean(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const CreateWatchlistInputSchema = z.object({
  ownerUserId: z.string(),
  name: z.string().min(1),
  criteriaJson: z.string(),
  cadence: z.string().optional(),
  enabled: z.boolean().optional(),
});

export const UpdateWatchlistInputSchema = z.object({
  name: z.string().min(1).optional(),
  criteriaJson: z.string().optional(),
  cadence: z.string().optional(),
  enabled: z.boolean().optional(),
});

export const WatchlistHitSchema = z.object({
  id: z.string(),
  watchlistId: z.string(),
  payloadJson: z.string(),
  matchedAt: z.number().int().positive(),
  seenAt: z.number().int().positive().optional(),
});

export const CreateWatchlistHitInputSchema = z.object({
  watchlistId: z.string(),
  payloadJson: z.string(),
  matchedAt: z.number().int().positive().optional(),
  seenAt: z.number().int().positive().optional(),
});

export const UpdateWatchlistHitInputSchema = z.object({
  seenAt: z.number().int().positive().optional(),
});

// ============================================================================
// Watchlist Interfaces
// ============================================================================

export interface Watchlist {
  id: string;
  ownerUserId: string;
  name: string;
  criteriaJson: string;
  cadence?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWatchlistInput {
  ownerUserId: string;
  name: string;
  criteriaJson: string;
  cadence?: string;
  enabled?: boolean;
}

export interface UpdateWatchlistInput {
  name?: string;
  criteriaJson?: string;
  cadence?: string;
  enabled?: boolean;
}

export interface WatchlistHit {
  id: string;
  watchlistId: string;
  payloadJson: string;
  matchedAt: number;
  seenAt?: number;
}

export interface CreateWatchlistHitInput {
  watchlistId: string;
  payloadJson: string;
  matchedAt?: number;
  seenAt?: number;
}

export interface UpdateWatchlistHitInput {
  seenAt?: number;
}

// ============================================================================
// Database Row Types
// ============================================================================

export interface IMaWatchlistRow {
  id: string;
  owner_user_id: string;
  name: string;
  criteria_json: string;
  cadence: string | null;
  enabled: number;
  created_at: number;
  updated_at: number;
}

export interface IMaWatchlistHitRow {
  id: string;
  watchlist_id: string;
  payload_json: string;
  matched_at: number;
  seen_at: number | null;
}

// ============================================================================
// Row Mappers
// ============================================================================

export function watchlistToRow(watchlist: Watchlist): IMaWatchlistRow {
  return {
    id: watchlist.id,
    owner_user_id: watchlist.ownerUserId,
    name: watchlist.name,
    criteria_json: watchlist.criteriaJson,
    cadence: watchlist.cadence ?? null,
    enabled: watchlist.enabled ? 1 : 0,
    created_at: watchlist.createdAt,
    updated_at: watchlist.updatedAt,
  };
}

export function rowToWatchlist(row: IMaWatchlistRow): Watchlist {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    criteriaJson: row.criteria_json,
    cadence: row.cadence ?? undefined,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function watchlistHitToRow(hit: WatchlistHit): IMaWatchlistHitRow {
  return {
    id: hit.id,
    watchlist_id: hit.watchlistId,
    payload_json: hit.payloadJson,
    matched_at: hit.matchedAt,
    seen_at: hit.seenAt ?? null,
  };
}

export function rowToWatchlistHit(row: IMaWatchlistHitRow): WatchlistHit {
  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    payloadJson: row.payload_json,
    matchedAt: row.matched_at,
    seenAt: row.seen_at ?? undefined,
  };
}
