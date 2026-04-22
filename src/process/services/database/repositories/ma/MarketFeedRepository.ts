/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Repository for ma_feed_items and ma_feed_sources operations.
 * Provides CRUD, freshness-based queries, and source management.
 */

import { getDatabase } from '@process/services/database';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';
import type {
  FeedItem,
  CreateFeedItemInput,
  UpdateFeedItemInput,
  IMaFeedItemRow,
  FeedSource,
  CreateFeedSourceInput,
  UpdateFeedSourceInput,
  IMaFeedSourceRow,
  FeedItemType,
} from '@/common/ma/marketFeed/schema';
import { feedItemToRow, rowToFeedItem, feedSourceToRow, rowToFeedSource } from '@/common/ma/marketFeed/schema';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';
import { computeFreshness } from '@/common/ma/sourceCache/schema';

export class MarketFeedRepository {
  // ==========================================================================
  // Feed Item Operations
  // ==========================================================================

  /**
   * Create a new feed item
   */
  async createItem(input: CreateFeedItemInput): Promise<IQueryResult<FeedItem>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `feed_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();
      const fetchedAt = input.fetchedAt ?? now;
      const ttlMs = input.ttlMs ?? 300000;
      const freshness: FreshnessStatus = input.freshness ?? computeFreshness(fetchedAt, ttlMs, now);

      const item: FeedItem = {
        id,
        type: input.type,
        symbol: input.symbol,
        name: input.name,
        value: input.value,
        change: input.change,
        changePercent: input.changePercent,
        currency: input.currency,
        unit: input.unit,
        source: input.source,
        exchange: input.exchange,
        timestamp: input.timestamp,
        metadataJson: input.metadataJson,
        provenanceJson: input.provenanceJson,
        freshness,
        fetchedAt,
        ttlMs,
        createdAt: now,
        updatedAt: now,
      };

      const row = feedItemToRow(item);
      const stmt = driver.prepare(`
        INSERT INTO ma_feed_items (id, type, symbol, name, value, change, change_percent,
          currency, unit, source, exchange, timestamp, metadata_json, provenance_json,
          freshness, fetched_at, ttl_ms, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.type,
        row.symbol,
        row.name,
        row.value,
        row.change,
        row.change_percent,
        row.currency,
        row.unit,
        row.source,
        row.exchange,
        row.timestamp,
        row.metadata_json,
        row.provenance_json,
        row.freshness,
        row.fetched_at,
        row.ttl_ms,
        row.created_at,
        row.updated_at
      );

      return { success: true, data: item };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a feed item by ID
   */
  async getItem(id: string): Promise<IQueryResult<FeedItem | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_feed_items WHERE id = ?').get(id) as IMaFeedItemRow | undefined;

      return {
        success: true,
        data: row ? rowToFeedItem(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Get a feed item by symbol
   */
  async getItemBySymbol(symbol: string): Promise<IQueryResult<FeedItem | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver
        .prepare('SELECT * FROM ma_feed_items WHERE symbol = ? ORDER BY updated_at DESC LIMIT 1')
        .get(symbol) as IMaFeedItemRow | undefined;

      return {
        success: true,
        data: row ? rowToFeedItem(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a feed item
   */
  async updateItem(id: string, input: UpdateFeedItemInput): Promise<IQueryResult<FeedItem>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = driver.prepare('SELECT * FROM ma_feed_items WHERE id = ?').get(id) as IMaFeedItemRow | undefined;

      if (!existing) {
        return { success: false, error: `Feed item ${id} not found` };
      }

      const now = Date.now();
      const fetchedAt = input.fetchedAt ?? existing.fetched_at;
      const ttlMs = input.ttlMs ?? existing.ttl_ms;
      const freshness: FreshnessStatus = input.freshness ?? computeFreshness(fetchedAt, ttlMs, now);

      const setClauses: string[] = [];
      const values: unknown[] = [];

      if (input.type !== undefined) {
        setClauses.push('type = ?');
        values.push(input.type);
      }
      if (input.symbol !== undefined) {
        setClauses.push('symbol = ?');
        values.push(input.symbol);
      }
      if (input.name !== undefined) {
        setClauses.push('name = ?');
        values.push(input.name);
      }
      if (input.value !== undefined) {
        setClauses.push('value = ?');
        values.push(input.value);
      }
      if (input.change !== undefined) {
        setClauses.push('change = ?');
        values.push(input.change);
      }
      if (input.changePercent !== undefined) {
        setClauses.push('change_percent = ?');
        values.push(input.changePercent);
      }
      if (input.currency !== undefined) {
        setClauses.push('currency = ?');
        values.push(input.currency);
      }
      if (input.unit !== undefined) {
        setClauses.push('unit = ?');
        values.push(input.unit);
      }
      if (input.source !== undefined) {
        setClauses.push('source = ?');
        values.push(input.source);
      }
      if (input.exchange !== undefined) {
        setClauses.push('exchange = ?');
        values.push(input.exchange);
      }
      if (input.timestamp !== undefined) {
        setClauses.push('timestamp = ?');
        values.push(input.timestamp);
      }
      if (input.metadataJson !== undefined) {
        setClauses.push('metadata_json = ?');
        values.push(input.metadataJson);
      }
      if (input.provenanceJson !== undefined) {
        setClauses.push('provenance_json = ?');
        values.push(input.provenanceJson);
      }

      setClauses.push('freshness = ?');
      values.push(freshness);
      setClauses.push('fetched_at = ?');
      values.push(fetchedAt);
      setClauses.push('ttl_ms = ?');
      values.push(ttlMs);
      setClauses.push('updated_at = ?');
      values.push(now);
      values.push(id);

      driver.prepare(`UPDATE ma_feed_items SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

      const updated = driver.prepare('SELECT * FROM ma_feed_items WHERE id = ?').get(id) as IMaFeedItemRow;

      return { success: true, data: rowToFeedItem(updated) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Upsert a feed item by symbol (update if exists, create if not)
   */
  async upsertBySymbol(input: CreateFeedItemInput): Promise<IQueryResult<FeedItem>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = driver
        .prepare('SELECT * FROM ma_feed_items WHERE symbol = ? ORDER BY updated_at DESC LIMIT 1')
        .get(input.symbol) as IMaFeedItemRow | undefined;

      if (existing) {
        return this.updateItem(existing.id, input);
      }

      return this.createItem(input);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a feed item
   */
  async deleteItem(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_feed_items WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List feed items by type
   */
  async listByType(type: FeedItemType, page = 0, pageSize = 50): Promise<IPaginatedResult<FeedItem>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver.prepare('SELECT COUNT(*) as count FROM ma_feed_items WHERE type = ?').get(type) as {
        count: number;
      };

      const rows = driver
        .prepare('SELECT * FROM ma_feed_items WHERE type = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?')
        .all(type, pageSize, page * pageSize) as IMaFeedItemRow[];

      return {
        data: rows.map(rowToFeedItem),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[MarketFeedRepository] List by type error:', error);
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }
  }

  /**
   * List feed items by freshness status
   */
  async listByFreshness(freshness: FreshnessStatus, page = 0, pageSize = 50): Promise<IPaginatedResult<FeedItem>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_feed_items WHERE freshness = ?')
        .get(freshness) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_feed_items WHERE freshness = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?')
        .all(freshness, pageSize, page * pageSize) as IMaFeedItemRow[];

      return {
        data: rows.map(rowToFeedItem),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[MarketFeedRepository] List by freshness error:', error);
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }
  }

  /**
   * Search feed items by symbol or name
   */
  async search(query: string, page = 0, pageSize = 50): Promise<IPaginatedResult<FeedItem>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const searchPattern = `%${query}%`;
      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_feed_items WHERE symbol LIKE ? OR name LIKE ?')
        .get(searchPattern, searchPattern) as { count: number };

      const rows = driver
        .prepare(
          'SELECT * FROM ma_feed_items WHERE symbol LIKE ? OR name LIKE ? ORDER BY timestamp DESC LIMIT ? OFFSET ?'
        )
        .all(searchPattern, searchPattern, pageSize, page * pageSize) as IMaFeedItemRow[];

      return {
        data: rows.map(rowToFeedItem),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[MarketFeedRepository] Search error:', error);
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }
  }

  /**
   * Recompute freshness for all feed items
   */
  async recomputeFreshness(): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const now = Date.now();
      const rows = driver.prepare('SELECT id, fetched_at, ttl_ms FROM ma_feed_items').all() as Array<{
        id: string;
        fetched_at: number;
        ttl_ms: number;
      }>;

      let updated = 0;
      const updateStmt = driver.prepare('UPDATE ma_feed_items SET freshness = ?, updated_at = ? WHERE id = ?');

      for (const row of rows) {
        const freshness = computeFreshness(row.fetched_at, row.ttl_ms, now);
        updateStmt.run(freshness, now, row.id);
        updated++;
      }

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  // ==========================================================================
  // Feed Source Operations
  // ==========================================================================

  /**
   * Create a new feed source
   */
  async createSource(input: CreateFeedSourceInput): Promise<IQueryResult<FeedSource>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `source_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const source: FeedSource = {
        id,
        provider: input.provider,
        name: input.name,
        feedTypes: input.feedTypes,
        endpoint: input.endpoint,
        configJson: input.configJson,
        apiKeyRef: input.apiKeyRef,
        refreshIntervalMs: input.refreshIntervalMs ?? 300000,
        status: input.status ?? 'active',
        provenanceJson: input.provenanceJson,
        createdAt: now,
        updatedAt: now,
      };

      const row = feedSourceToRow(source);
      const stmt = driver.prepare(`
        INSERT INTO ma_feed_sources (id, provider, name, feed_types_json, endpoint, config_json,
          api_key_ref, refresh_interval_ms, status, error_message, last_fetch_at, last_fetch_count,
          provenance_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.provider,
        row.name,
        row.feed_types_json,
        row.endpoint,
        row.config_json,
        row.api_key_ref,
        row.refresh_interval_ms,
        row.status,
        row.error_message,
        row.last_fetch_at,
        row.last_fetch_count,
        row.provenance_json,
        row.created_at,
        row.updated_at
      );

      return { success: true, data: source };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get a feed source by ID
   */
  async getSource(id: string): Promise<IQueryResult<FeedSource | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_feed_sources WHERE id = ?').get(id) as IMaFeedSourceRow | undefined;

      return {
        success: true,
        data: row ? rowToFeedSource(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update a feed source
   */
  async updateSource(id: string, input: UpdateFeedSourceInput): Promise<IQueryResult<FeedSource>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = driver.prepare('SELECT * FROM ma_feed_sources WHERE id = ?').get(id) as
        | IMaFeedSourceRow
        | undefined;

      if (!existing) {
        return { success: false, error: `Feed source ${id} not found` };
      }

      const now = Date.now();
      const setClauses: string[] = [];
      const values: unknown[] = [];

      if (input.provider !== undefined) {
        setClauses.push('provider = ?');
        values.push(input.provider);
      }
      if (input.name !== undefined) {
        setClauses.push('name = ?');
        values.push(input.name);
      }
      if (input.feedTypes !== undefined) {
        setClauses.push('feed_types_json = ?');
        values.push(JSON.stringify(input.feedTypes));
      }
      if (input.endpoint !== undefined) {
        setClauses.push('endpoint = ?');
        values.push(input.endpoint);
      }
      if (input.configJson !== undefined) {
        setClauses.push('config_json = ?');
        values.push(input.configJson);
      }
      if (input.apiKeyRef !== undefined) {
        setClauses.push('api_key_ref = ?');
        values.push(input.apiKeyRef);
      }
      if (input.refreshIntervalMs !== undefined) {
        setClauses.push('refresh_interval_ms = ?');
        values.push(input.refreshIntervalMs);
      }
      if (input.status !== undefined) {
        setClauses.push('status = ?');
        values.push(input.status);
      }
      if (input.errorMessage !== undefined) {
        setClauses.push('error_message = ?');
        values.push(input.errorMessage);
      }
      if (input.lastFetchAt !== undefined) {
        setClauses.push('last_fetch_at = ?');
        values.push(input.lastFetchAt);
      }
      if (input.lastFetchCount !== undefined) {
        setClauses.push('last_fetch_count = ?');
        values.push(input.lastFetchCount);
      }
      if (input.provenanceJson !== undefined) {
        setClauses.push('provenance_json = ?');
        values.push(input.provenanceJson);
      }

      setClauses.push('updated_at = ?');
      values.push(now);
      values.push(id);

      driver.prepare(`UPDATE ma_feed_sources SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

      const updated = driver.prepare('SELECT * FROM ma_feed_sources WHERE id = ?').get(id) as IMaFeedSourceRow;

      return { success: true, data: rowToFeedSource(updated) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a feed source
   */
  async deleteSource(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_feed_sources WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List all feed sources
   */
  async listSources(page = 0, pageSize = 50): Promise<IPaginatedResult<FeedSource>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver.prepare('SELECT COUNT(*) as count FROM ma_feed_sources').get() as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_feed_sources ORDER BY name ASC LIMIT ? OFFSET ?')
        .all(pageSize, page * pageSize) as IMaFeedSourceRow[];

      return {
        data: rows.map(rowToFeedSource),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[MarketFeedRepository] List sources error:', error);
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }
  }

  /**
   * List feed sources by status
   */
  async listSourcesByStatus(status: string, page = 0, pageSize = 50): Promise<IPaginatedResult<FeedSource>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver
        .prepare('SELECT COUNT(*) as count FROM ma_feed_sources WHERE status = ?')
        .get(status) as { count: number };

      const rows = driver
        .prepare('SELECT * FROM ma_feed_sources WHERE status = ? ORDER BY name ASC LIMIT ? OFFSET ?')
        .all(status, pageSize, page * pageSize) as IMaFeedSourceRow[];

      return {
        data: rows.map(rowToFeedSource),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[MarketFeedRepository] List sources by status error:', error);
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }
  }
}

// Singleton instance
let marketFeedRepositoryInstance: MarketFeedRepository | null = null;

export function getMarketFeedRepository(): MarketFeedRepository {
  if (!marketFeedRepositoryInstance) {
    marketFeedRepositoryInstance = new MarketFeedRepository();
  }
  return marketFeedRepositoryInstance;
}
