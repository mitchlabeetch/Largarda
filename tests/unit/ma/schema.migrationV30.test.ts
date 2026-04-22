/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for v30 migration (M&A data spine provenance/freshness)
 * Tests that migration v30 creates ma_source_cache table and adds
 * provenance_json/freshness columns to ma_companies, ma_contacts, ma_kb_sources
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initSchema, CURRENT_DB_VERSION } from '@process/services/database/schema';
import { runMigrations, rollbackMigrations } from '@process/services/database/migrations';
import { BetterSqlite3Driver } from '@process/services/database/drivers/BetterSqlite3Driver';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';

// Check if native module is available
let nativeModuleAvailable = true;
try {
  const d = new BetterSqlite3Driver(':memory:');
  d.close();
} catch (e) {
  nativeModuleAvailable = false;
}

const describeOrSkip = nativeModuleAvailable ? describe : describe.skip;

describeOrSkip('Migration v30 - Source Cache & Provenance/Freshness', () => {
  let driver: ISqliteDriver;

  beforeEach(async () => {
    driver = new BetterSqlite3Driver(':memory:');
    initSchema(driver);
  });

  afterEach(() => {
    if (driver) {
      driver.close();
    }
  });

  describe('Migration v30 up', () => {
    beforeEach(async () => {
      runMigrations(driver, 0, 30);
    });

    // ── ma_source_cache table ──────────────────────────────────────

    it('should create ma_source_cache table', () => {
      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_source_cache'")
        .get();
      expect(tableInfo).toBeDefined();
    });

    it('should enforce UNIQUE(surface, lookup_key) on ma_source_cache', () => {
      const now = Date.now();
      driver
        .prepare(
          'INSERT INTO ma_source_cache (id, surface, lookup_key, payload_json, provenance_json, fetched_at, ttl_ms, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run('sc1', 'sirene', '123456789', '{}', '{}', now, 3600000, now, now);
      expect(() => {
        driver
          .prepare(
            'INSERT INTO ma_source_cache (id, surface, lookup_key, payload_json, provenance_json, fetched_at, ttl_ms, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .run('sc2', 'sirene', '123456789', '{}', '{}', now, 3600000, now, now);
      }).toThrow();
    });

    it('should create index on ma_source_cache.surface', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_source_cache_surface'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should create index on ma_source_cache.freshness', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_source_cache_freshness'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should create index on ma_source_cache.fetched_at', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_source_cache_fetched_at'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should create composite index on ma_source_cache(surface, lookup_key)', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_source_cache_surface_lookup'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should insert and retrieve source cache data', () => {
      const now = Date.now();
      driver
        .prepare(
          'INSERT INTO ma_source_cache (id, surface, lookup_key, payload_json, provenance_json, fetched_at, ttl_ms, freshness, source_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          'sc1',
          'pappers',
          '987654321',
          '{"name":"Test"}',
          '{"source":"pappers"}',
          now,
          7200000,
          'fresh',
          'https://api.pappers.fr/v2/987654321',
          now,
          now
        );
      const row = driver.prepare('SELECT * FROM ma_source_cache WHERE id = ?').get('sc1') as any;
      expect(row).toBeDefined();
      expect(row.surface).toBe('pappers');
      expect(row.lookup_key).toBe('987654321');
      expect(row.freshness).toBe('fresh');
      expect(row.source_url).toBe('https://api.pappers.fr/v2/987654321');
    });

    // ── ma_companies provenance/freshness ──────────────────────────

    it('should add provenance_json column to ma_companies', () => {
      const tableInfo = driver.prepare('PRAGMA table_info(ma_companies)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'provenance_json')).toBe(true);
    });

    it('should add freshness column to ma_companies', () => {
      const tableInfo = driver.prepare('PRAGMA table_info(ma_companies)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'freshness')).toBe(true);
    });

    it('should default ma_companies.freshness to unknown', () => {
      const now = Date.now();
      driver
        .prepare('INSERT INTO ma_companies (id, siren, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run('c1', '123456789', 'Test Co', now, now);
      const row = driver.prepare('SELECT freshness FROM ma_companies WHERE id = ?').get('c1') as any;
      expect(row.freshness).toBe('unknown');
    });

    // ── ma_contacts provenance/freshness ──────────────────────────

    it('should add provenance_json column to ma_contacts', () => {
      const tableInfo = driver.prepare('PRAGMA table_info(ma_contacts)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'provenance_json')).toBe(true);
    });

    it('should add freshness column to ma_contacts', () => {
      const tableInfo = driver.prepare('PRAGMA table_info(ma_contacts)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'freshness')).toBe(true);
    });

    it('should default ma_contacts.freshness to unknown', () => {
      const now = Date.now();
      driver
        .prepare('INSERT INTO ma_contacts (id, full_name, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .run('ct1', 'Jane Doe', now, now);
      const row = driver.prepare('SELECT freshness FROM ma_contacts WHERE id = ?').get('ct1') as any;
      expect(row.freshness).toBe('unknown');
    });

    // ── ma_kb_sources provenance/freshness ─────────────────────────

    it('should add provenance_json column to ma_kb_sources', () => {
      const tableInfo = driver.prepare('PRAGMA table_info(ma_kb_sources)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'provenance_json')).toBe(true);
    });

    it('should add freshness column to ma_kb_sources', () => {
      const tableInfo = driver.prepare('PRAGMA table_info(ma_kb_sources)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'freshness')).toBe(true);
    });

    it('should default ma_kb_sources.freshness to unknown', () => {
      const now = Date.now();
      driver
        .prepare(
          'INSERT INTO ma_kb_sources (id, scope, scope_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run('kb1', 'deal', 'deal1', 'pending', now, now);
      const row = driver.prepare('SELECT freshness FROM ma_kb_sources WHERE id = ?').get('kb1') as any;
      expect(row.freshness).toBe('unknown');
    });
  });

  describe('Migration v30 down', () => {
    beforeEach(async () => {
      runMigrations(driver, 0, 30);
    });

    it('should drop ma_source_cache table on rollback', () => {
      rollbackMigrations(driver, 30, 29);

      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_source_cache'")
        .get();
      expect(tableInfo).toBeUndefined();
    });

    it('should drop all ma_source_cache indexes on rollback', () => {
      rollbackMigrations(driver, 30, 29);

      const indexes = [
        'idx_ma_source_cache_surface',
        'idx_ma_source_cache_freshness',
        'idx_ma_source_cache_fetched_at',
        'idx_ma_source_cache_surface_lookup',
      ];

      for (const index of indexes) {
        const indexInfo = driver.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name='${index}'`).get();
        expect(indexInfo).toBeUndefined();
      }
    });

    it('should remove provenance_json and freshness from ma_companies on rollback', () => {
      rollbackMigrations(driver, 30, 29);

      const tableInfo = driver.prepare('PRAGMA table_info(ma_companies)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'provenance_json')).toBe(false);
      expect(tableInfo.some((col) => col.name === 'freshness')).toBe(false);
    });

    it('should remove provenance_json and freshness from ma_contacts on rollback', () => {
      rollbackMigrations(driver, 30, 29);

      const tableInfo = driver.prepare('PRAGMA table_info(ma_contacts)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'provenance_json')).toBe(false);
      expect(tableInfo.some((col) => col.name === 'freshness')).toBe(false);
    });

    it('should remove provenance_json and freshness from ma_kb_sources on rollback', () => {
      rollbackMigrations(driver, 30, 29);

      const tableInfo = driver.prepare('PRAGMA table_info(ma_kb_sources)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'provenance_json')).toBe(false);
      expect(tableInfo.some((col) => col.name === 'freshness')).toBe(false);
    });

    it('should preserve company data through rollback', () => {
      const now = Date.now();
      driver
        .prepare('INSERT INTO ma_companies (id, siren, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run('c1', '123456789', 'Preserved Co', now, now);

      rollbackMigrations(driver, 30, 29);

      const row = driver.prepare('SELECT * FROM ma_companies WHERE id = ?').get('c1') as any;
      expect(row).toBeDefined();
      expect(row.name).toBe('Preserved Co');
      expect(row.siren).toBe('123456789');
    });
  });

  describe('Migration v30 on existing v29 database', () => {
    beforeEach(async () => {
      runMigrations(driver, 0, 29);
    });

    it('should apply v30 migration cleanly', () => {
      expect(() => {
        runMigrations(driver, 29, 30);
      }).not.toThrow();

      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_source_cache'")
        .get();
      expect(tableInfo).toBeDefined();
    });

    it('should preserve existing v29 tables', () => {
      runMigrations(driver, 29, 30);

      const tables = [
        'ma_deals',
        'ma_documents',
        'ma_companies',
        'ma_contacts',
        'ma_watchlists',
        'ma_watchlist_hits',
        'ma_kb_sources',
        'ma_datagouv_cache',
      ];

      for (const table of tables) {
        const tableInfo = driver.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`).get();
        expect(tableInfo).toBeDefined();
      }
    });

    it('should add provenance/freshness columns to tables with existing data', () => {
      const now = Date.now();
      driver
        .prepare('INSERT INTO ma_companies (id, siren, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run('c1', '111111111', 'Pre-existing Co', now, now);

      runMigrations(driver, 29, 30);

      const row = driver.prepare('SELECT * FROM ma_companies WHERE id = ?').get('c1') as any;
      expect(row).toBeDefined();
      expect(row.provenance_json).toBeNull();
      expect(row.freshness).toBe('unknown');
    });
  });
});
