/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for v28 migration (M&A data spine)
 * Tests that migration v28 creates all required tables and indexes
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

describeOrSkip('Migration v28 - M&A Data Spine', () => {
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

  describe('Migration v28 up', () => {
    beforeEach(async () => {
      runMigrations(driver, 0, 28);
    });

    it('should create ma_companies table', () => {
      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_companies'")
        .get();
      expect(tableInfo).toBeDefined();
    });

    it('should create ma_contacts table', () => {
      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_contacts'")
        .get();
      expect(tableInfo).toBeDefined();
    });

    it('should create ma_watchlists table', () => {
      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_watchlists'")
        .get();
      expect(tableInfo).toBeDefined();
    });

    it('should create ma_watchlist_hits table', () => {
      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_watchlist_hits'")
        .get();
      expect(tableInfo).toBeDefined();
    });

    it('should create ma_datagouv_cache table', () => {
      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_datagouv_cache'")
        .get();
      expect(tableInfo).toBeDefined();
    });

    it('should create ma_kb_sources table', () => {
      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_kb_sources'")
        .get();
      expect(tableInfo).toBeDefined();
    });

    it('should create ma_documents_chunks table', () => {
      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_documents_chunks'")
        .get();
      expect(tableInfo).toBeDefined();
    });

    it('should create ma_chatflow_registry table', () => {
      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_chatflow_registry'")
        .get();
      expect(tableInfo).toBeDefined();
    });

    it('should create ma_prompt_versions table', () => {
      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_prompt_versions'")
        .get();
      expect(tableInfo).toBeDefined();
    });

    it('should create index on ma_companies.siren', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_companies_siren'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should create index on ma_contacts.company_id', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_contacts_company_id'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should create index on ma_watchlists.owner_user_id', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_watchlists_owner_user_id'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should create index on ma_watchlist_hits.watchlist_id', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_watchlist_hits_watchlist_id'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should create index on ma_datagouv_cache.api_surface', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_datagouv_cache_api_surface'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should create index on ma_kb_sources.scope', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_kb_sources_scope'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should create index on ma_documents_chunks.document_id', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_documents_chunks_document_id'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should create index on ma_chatflow_registry.flow_id', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_chatflow_registry_flow_id'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should create index on ma_prompt_versions.flow_key', () => {
      const indexInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ma_prompt_versions_flow_key'")
        .get();
      expect(indexInfo).toBeDefined();
    });

    it('should enforce unique constraint on ma_companies.siren', () => {
      const siren = '123456789';
      driver
        .prepare('INSERT INTO ma_companies (id, siren, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run('c1', siren, 'Company 1', Date.now(), Date.now());
      expect(() => {
        driver
          .prepare('INSERT INTO ma_companies (id, siren, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
          .run('c2', siren, 'Company 2', Date.now(), Date.now());
      }).toThrow();
    });

    it('should enforce unique constraint on ma_kb_sources(scope, scope_id)', () => {
      driver
        .prepare(
          'INSERT INTO ma_kb_sources (id, scope, scope_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run('kb1', 'deal', 'deal1', 'pending', Date.now(), Date.now());
      expect(() => {
        driver
          .prepare(
            'INSERT INTO ma_kb_sources (id, scope, scope_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .run('kb2', 'deal', 'deal1', 'pending', Date.now(), Date.now());
      }).toThrow();
    });

    it('should set foreign key on ma_contacts.company_id', () => {
      const tableInfo = driver.prepare('PRAGMA table_info(ma_contacts)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'company_id')).toBe(true);
    });

    it('should set foreign key on ma_contacts.deal_id', () => {
      const tableInfo = driver.prepare('PRAGMA table_info(ma_contacts)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'deal_id')).toBe(true);
    });

    it('should set foreign key on ma_watchlist_hits.watchlist_id', () => {
      const tableInfo = driver.prepare('PRAGMA table_info(ma_watchlist_hits)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'watchlist_id')).toBe(true);
    });

    it('should set foreign key on ma_documents_chunks.document_id', () => {
      const tableInfo = driver.prepare('PRAGMA table_info(ma_documents_chunks)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'document_id')).toBe(true);
    });

    it('should set foreign key on ma_documents_chunks.deal_id', () => {
      const tableInfo = driver.prepare('PRAGMA table_info(ma_documents_chunks)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'deal_id')).toBe(true);
    });

    it('should set foreign key on ma_prompt_versions.flow_key', () => {
      const tableInfo = driver.prepare('PRAGMA table_info(ma_prompt_versions)').all() as Array<{ name: string }>;
      expect(tableInfo.some((col) => col.name === 'flow_key')).toBe(true);
    });

    it('should insert and retrieve company data', () => {
      const id = 'company_test_1';
      const siren = '123456789';
      const now = Date.now();
      driver
        .prepare('INSERT INTO ma_companies (id, siren, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, siren, 'Test Company', now, now);
      const row = driver.prepare('SELECT * FROM ma_companies WHERE id = ?').get(id) as any;
      expect(row).toBeDefined();
      expect(row.siren).toBe(siren);
      expect(row.name).toBe('Test Company');
    });

    it('should insert and retrieve contact data', () => {
      const id = 'contact_test_1';
      const now = Date.now();
      driver
        .prepare('INSERT INTO ma_contacts (id, full_name, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .run(id, 'John Doe', now, now);
      const row = driver.prepare('SELECT * FROM ma_contacts WHERE id = ?').get(id) as any;
      expect(row).toBeDefined();
      expect(row.full_name).toBe('John Doe');
    });

    it('should insert and retrieve watchlist data', () => {
      const id = 'watchlist_test_1';
      const now = Date.now();
      driver
        .prepare(
          'INSERT INTO ma_watchlists (id, owner_user_id, name, criteria_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(id, 'user1', 'Test Watchlist', '{}', now, now);
      const row = driver.prepare('SELECT * FROM ma_watchlists WHERE id = ?').get(id) as any;
      expect(row).toBeDefined();
      expect(row.name).toBe('Test Watchlist');
    });

    it('should insert and retrieve KB source data', () => {
      const id = 'kbsource_test_1';
      const now = Date.now();
      driver
        .prepare(
          'INSERT INTO ma_kb_sources (id, scope, scope_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(id, 'deal', 'deal1', 'pending', now, now);
      const row = driver.prepare('SELECT * FROM ma_kb_sources WHERE id = ?').get(id) as any;
      expect(row).toBeDefined();
      expect(row.scope).toBe('deal');
    });

    it('should insert and retrieve document chunk data', () => {
      const id = 'chunk_test_1';
      const now = Date.now();
      driver
        .prepare(
          'INSERT INTO ma_documents_chunks (id, document_id, chunk_index, text, created_at) VALUES (?, ?, ?, ?, ?)'
        )
        .run(id, 'doc1', 0, 'Test chunk text', now);
      const row = driver.prepare('SELECT * FROM ma_documents_chunks WHERE id = ?').get(id) as any;
      expect(row).toBeDefined();
      expect(row.text).toBe('Test chunk text');
    });

    it('should insert and retrieve chatflow registry data', () => {
      const flowKey = 'flow_test_1';
      const now = Date.now();
      driver
        .prepare('INSERT INTO ma_chatflow_registry (flow_key, flow_id, status, updated_at) VALUES (?, ?, ?, ?)')
        .run(flowKey, 'flow1', 'active', now);
      const row = driver.prepare('SELECT * FROM ma_chatflow_registry WHERE flow_key = ?').get(flowKey) as any;
      expect(row).toBeDefined();
      expect(row.flow_id).toBe('flow1');
    });

    it('should insert and retrieve prompt version data', () => {
      const id = 'promptver_test_1';
      const now = Date.now();
      driver
        .prepare('INSERT INTO ma_prompt_versions (id, flow_key, hash, payload_json, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, 'flow1', 'hash123', '{}', now);
      const row = driver.prepare('SELECT * FROM ma_prompt_versions WHERE id = ?').get(id) as any;
      expect(row).toBeDefined();
      expect(row.hash).toBe('hash123');
    });
  });

  describe('Migration v28 down', () => {
    beforeEach(async () => {
      runMigrations(driver, 0, 28);
    });

    it('should drop all v28 tables on rollback', () => {
      rollbackMigrations(driver, 28, 27);

      const tables = [
        'ma_companies',
        'ma_contacts',
        'ma_watchlists',
        'ma_watchlist_hits',
        'ma_datagouv_cache',
        'ma_kb_sources',
        'ma_documents_chunks',
        'ma_chatflow_registry',
        'ma_prompt_versions',
      ];

      for (const table of tables) {
        const tableInfo = driver.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`).get();
        expect(tableInfo).toBeUndefined();
      }
    });

    it('should drop all v28 indexes on rollback', () => {
      rollbackMigrations(driver, 28, 27);

      const indexes = [
        'idx_ma_companies_siren',
        'idx_ma_companies_siret',
        'idx_ma_companies_name',
        'idx_ma_companies_sector',
        'idx_ma_contacts_company_id',
        'idx_ma_contacts_deal_id',
        'idx_ma_contacts_email',
        'idx_ma_watchlists_owner_user_id',
        'idx_ma_watchlists_enabled',
        'idx_ma_watchlist_hits_watchlist_id',
        'idx_ma_watchlist_hits_matched_at',
        'idx_ma_watchlist_hits_seen_at',
        'idx_ma_datagouv_cache_api_surface',
        'idx_ma_datagouv_cache_fetched_at',
        'idx_ma_kb_sources_scope',
        'idx_ma_kb_sources_status',
        'idx_ma_documents_chunks_document_id',
        'idx_ma_documents_chunks_deal_id',
        'idx_ma_documents_chunks_chunk_index',
        'idx_ma_documents_chunks_flowise_chunk_id',
        'idx_ma_chatflow_registry_flow_id',
        'idx_ma_chatflow_registry_status',
        'idx_ma_prompt_versions_flow_key',
        'idx_ma_prompt_versions_hash',
      ];

      for (const index of indexes) {
        const indexInfo = driver.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name='${index}'`).get();
        expect(indexInfo).toBeUndefined();
      }
    });
  });

  describe('Migration v28 on existing v27 database', () => {
    beforeEach(async () => {
      runMigrations(driver, 0, 27);
    });

    it('should apply v28 migration cleanly', () => {
      expect(() => {
        runMigrations(driver, 27, 28);
      }).not.toThrow();

      const tableInfo = driver
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ma_companies'")
        .get();
      expect(tableInfo).toBeDefined();
    });

    it('should preserve existing v27 tables', () => {
      runMigrations(driver, 27, 28);

      const tables = [
        'ma_deals',
        'ma_documents',
        'ma_analyses',
        'ma_risk_findings',
        'ma_flowise_sessions',
        'ma_integration_connections',
      ];

      for (const table of tables) {
        const tableInfo = driver.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`).get();
        expect(tableInfo).toBeDefined();
      }
    });
  });
});
