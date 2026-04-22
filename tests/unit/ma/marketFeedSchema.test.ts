/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for MarketFeed schema
 * Tests schema validation, type safety, and row mapping
 */

import { describe, it, expect } from 'vitest';
import {
  FeedItemSchema,
  CreateFeedItemInputSchema,
  UpdateFeedItemInputSchema,
  FeedSourceSchema,
  CreateFeedSourceInputSchema,
  feedItemToRow,
  rowToFeedItem,
  feedSourceToRow,
  rowToFeedSource,
} from '@/common/ma/marketFeed/schema';
import type {
  FeedItem,
  CreateFeedItemInput,
  UpdateFeedItemInput,
  FeedSource,
  CreateFeedSourceInput,
  IMaFeedItemRow,
  IMaFeedSourceRow,
} from '@/common/ma/marketFeed/schema';

describe('MarketFeed Schema', () => {
  const now = Date.now();

  describe('FeedItemSchema', () => {
    it('should validate a valid feed item', () => {
      const validItem: FeedItem = {
        id: 'feed_123',
        type: 'stock_price',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        value: 150.25,
        change: 2.5,
        changePercent: 1.69,
        currency: 'USD',
        source: 'bloomberg',
        timestamp: now,
        freshness: 'fresh',
        fetchedAt: now,
        ttlMs: 300000,
        createdAt: now,
        updatedAt: now,
      };

      const result = FeedItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should reject a feed item without required fields', () => {
      const invalidItem = {
        id: 'feed_123',
        type: 'stock_price',
        // missing symbol
        name: 'Apple',
        value: 150,
        source: 'bloomberg',
        timestamp: now,
        freshness: 'fresh',
        fetchedAt: now,
        ttlMs: 300000,
        createdAt: now,
        updatedAt: now,
      };

      const result = FeedItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should default ttlMs to 300000 (5 minutes)', () => {
      const itemWithoutTtl = {
        id: 'feed_123',
        type: 'index_value',
        symbol: 'SPX',
        name: 'S&P 500',
        value: 4000,
        source: 'yahoo',
        timestamp: now,
        freshness: 'fresh',
        fetchedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      const result = FeedItemSchema.safeParse(itemWithoutTtl);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ttlMs).toBe(300000);
      }
    });

    it('should accept all feed item types', () => {
      const types = [
        'stock_price',
        'index_value',
        'interest_rate',
        'fx_rate',
        'commodity_price',
        'economic_indicator',
        'sector_multiple',
      ] as const;

      for (const type of types) {
        const item = {
          id: `feed_${type}`,
          type,
          symbol: 'TEST',
          name: 'Test',
          value: 100,
          source: 'test',
          timestamp: now,
          freshness: 'fresh',
          fetchedAt: now,
          ttlMs: 300000,
          createdAt: now,
          updatedAt: now,
        };

        const result = FeedItemSchema.safeParse(item);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid feed item type', () => {
      const itemWithInvalidType = {
        id: 'feed_123',
        type: 'invalid_type',
        symbol: 'TEST',
        name: 'Test',
        value: 100,
        source: 'test',
        timestamp: now,
        freshness: 'fresh',
        fetchedAt: now,
        ttlMs: 300000,
        createdAt: now,
        updatedAt: now,
      };

      const result = FeedItemSchema.safeParse(itemWithInvalidType);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateFeedItemInputSchema', () => {
    it('should validate create input with required fields', () => {
      const validInput: CreateFeedItemInput = {
        type: 'stock_price',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        value: 150.25,
        source: 'bloomberg',
        timestamp: now,
      };

      const result = CreateFeedItemInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept full create input with change values', () => {
      const fullInput: CreateFeedItemInput = {
        type: 'stock_price',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        value: 150.25,
        change: 2.5,
        changePercent: 1.69,
        currency: 'USD',
        unit: 'USD',
        source: 'bloomberg',
        exchange: 'NASDAQ',
        timestamp: now,
        freshness: 'fresh',
        fetchedAt: now,
        ttlMs: 60000,
      };

      const result = CreateFeedItemInputSchema.safeParse(fullInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty symbol', () => {
      const invalidInput = {
        type: 'stock_price',
        symbol: '',
        name: 'Test',
        value: 100,
        source: 'test',
        timestamp: now,
      };

      const result = CreateFeedItemInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject negative TTL', () => {
      const invalidInput = {
        type: 'stock_price',
        symbol: 'TEST',
        name: 'Test',
        value: 100,
        source: 'test',
        timestamp: now,
        ttlMs: -1000,
      };

      const result = CreateFeedItemInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('FeedItem row mapping', () => {
    const mockItem: FeedItem = {
      id: 'feed_123',
      type: 'stock_price',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      value: 150.25,
      change: 2.5,
      changePercent: 1.69,
      currency: 'USD',
      unit: 'USD',
      source: 'bloomberg',
      exchange: 'NASDAQ',
      timestamp: now,
      metadataJson: JSON.stringify({ volume: 50000000 }),
      provenanceJson: JSON.stringify({ source: 'bloomberg', fetchedAt: now, policy: 'canonical' }),
      freshness: 'fresh',
      fetchedAt: now,
      ttlMs: 300000,
      createdAt: now,
      updatedAt: now,
    };

    it('should convert feed item to row format', () => {
      const row = feedItemToRow(mockItem);

      expect(row.id).toBe('feed_123');
      expect(row.type).toBe('stock_price');
      expect(row.symbol).toBe('AAPL');
      expect(row.change).toBe(2.5);
      expect(row.change_percent).toBe(1.69);
      expect(row.provenance_json).toBeTruthy();
      expect(row.freshness).toBe('fresh');
      expect(row.ttl_ms).toBe(300000);
    });

    it('should handle null values in row conversion', () => {
      const minimalItem: FeedItem = {
        id: 'feed_456',
        type: 'index_value',
        symbol: 'SPX',
        name: 'S&P 500',
        value: 4000,
        source: 'yahoo',
        timestamp: now,
        freshness: 'fresh',
        fetchedAt: now,
        ttlMs: 300000,
        createdAt: now,
        updatedAt: now,
      };

      const row = feedItemToRow(minimalItem);
      expect(row.change).toBeNull();
      expect(row.change_percent).toBeNull();
      expect(row.currency).toBeNull();
      expect(row.metadata_json).toBeNull();
    });

    it('should convert row back to item format', () => {
      const row: IMaFeedItemRow = {
        id: 'feed_789',
        type: 'fx_rate',
        symbol: 'EURUSD',
        name: 'EUR/USD',
        value: 1.085,
        change: 0.002,
        change_percent: 0.18,
        currency: 'USD',
        unit: null,
        source: 'refinitiv',
        exchange: null,
        timestamp: now,
        metadata_json: null,
        provenance_json: JSON.stringify({ source: 'refinitiv', fetchedAt: now }),
        freshness: 'stale',
        fetched_at: now,
        ttl_ms: 60000,
        created_at: now,
        updated_at: now,
      };

      const item = rowToFeedItem(row);

      expect(item.id).toBe('feed_789');
      expect(item.symbol).toBe('EURUSD');
      expect(item.change).toBe(0.002);
      expect(item.freshness).toBe('stale');
      expect(item.ttlMs).toBe(60000);
    });

    it('should round-trip conversion without data loss', () => {
      const row = feedItemToRow(mockItem);
      const recovered = rowToFeedItem(row);

      expect(recovered.id).toBe(mockItem.id);
      expect(recovered.symbol).toBe(mockItem.symbol);
      expect(recovered.value).toBe(mockItem.value);
      expect(recovered.freshness).toBe(mockItem.freshness);
      expect(recovered.provenanceJson).toBe(mockItem.provenanceJson);
      expect(recovered.ttlMs).toBe(mockItem.ttlMs);
    });
  });

  describe('FeedSource row mapping', () => {
    const mockSource: FeedSource = {
      id: 'source_123',
      provider: 'bloomberg',
      name: 'Bloomberg Terminal',
      feedTypes: ['stock_price', 'index_value', 'fx_rate'],
      endpoint: 'https://api.bloomberg.com/v1',
      configJson: JSON.stringify({ apiVersion: 'v1' }),
      apiKeyRef: 'bloomberg_key',
      refreshIntervalMs: 60000,
      status: 'active',
      lastFetchAt: now,
      lastFetchCount: 150,
      createdAt: now,
      updatedAt: now,
    };

    it('should convert feed source to row format', () => {
      const row = feedSourceToRow(mockSource);

      expect(row.id).toBe('source_123');
      expect(row.provider).toBe('bloomberg');
      expect(row.feed_types_json).toBe(JSON.stringify(['stock_price', 'index_value', 'fx_rate']));
      expect(row.refresh_interval_ms).toBe(60000);
      expect(row.status).toBe('active');
    });

    it('should convert row back to source format', () => {
      const row: IMaFeedSourceRow = {
        id: 'source_456',
        provider: 'alpha_vantage',
        name: 'Alpha Vantage',
        feed_types_json: JSON.stringify(['stock_price', 'economic_indicator']),
        endpoint: 'https://www.alphavantage.co/query',
        config_json: JSON.stringify({ apiKey: 'demo' }),
        api_key_ref: 'alpha_vantage_key',
        refresh_interval_ms: 300000,
        status: 'paused',
        error_message: 'Rate limit exceeded',
        last_fetch_at: now,
        last_fetch_count: 25,
        provenance_json: null,
        created_at: now,
        updated_at: now,
      };

      const source = rowToFeedSource(row);

      expect(source.id).toBe('source_456');
      expect(source.provider).toBe('alpha_vantage');
      expect(source.feedTypes).toEqual(['stock_price', 'economic_indicator']);
      expect(source.status).toBe('paused');
      expect(source.errorMessage).toBe('Rate limit exceeded');
    });

    it('should round-trip source conversion', () => {
      const row = feedSourceToRow(mockSource);
      const recovered = rowToFeedSource(row);

      expect(recovered.id).toBe(mockSource.id);
      expect(recovered.provider).toBe(mockSource.provider);
      expect(recovered.feedTypes).toEqual(mockSource.feedTypes);
      expect(recovered.refreshIntervalMs).toBe(mockSource.refreshIntervalMs);
    });
  });
});
