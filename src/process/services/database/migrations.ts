/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ISqliteDriver } from './drivers/ISqliteDriver';

/**
 * Migration script definition
 */
export interface IMigration {
  version: number; // Target version after this migration
  name: string; // Migration name for logging
  up: (db: ISqliteDriver) => void; // Upgrade script
  down: (db: ISqliteDriver) => void; // Downgrade script (for rollback)
}

/**
 * Migration v0 -> v1: Initial schema
 * This is handled by initSchema() in schema.ts
 */
const migration_v1: IMigration = {
  version: 1,
  name: 'Initial schema',
  up: (_db) => {
    // Already handled by initSchema()
    console.log('[Migration v1] Initial schema created by initSchema()');
  },
  down: (db) => {
    // Drop all tables (only core tables now)
    db.exec('DROP TABLE IF EXISTS messages');
    db.exec('DROP TABLE IF EXISTS conversations');
    db.exec('DROP TABLE IF EXISTS users');
    console.log('[Migration v1] Rolled back: All tables dropped');
  },
};

/**
 * Migration v1 -> v2: Add indexes for better performance
 * Example of a schema change migration
 */
const migration_v2: IMigration = {
  version: 2,
  name: 'Add performance indexes',
  up: (db) => {
    // Add composite index for conversation messages lookup
    db.exec('CREATE INDEX IF NOT EXISTS idx_messages_conv_created_desc ON messages(conversation_id, created_at DESC)');
    // Add index for message search by type
    db.exec('CREATE INDEX IF NOT EXISTS idx_messages_type_created ON messages(type, created_at DESC)');
    // Add index for user conversations lookup
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_type ON conversations(user_id, type)');
    console.log('[Migration v2] Added performance indexes');
  },
  down: (db) => {
    db.exec('DROP INDEX IF EXISTS idx_messages_conv_created_desc');
    db.exec('DROP INDEX IF EXISTS idx_messages_type_created');
    db.exec('DROP INDEX IF EXISTS idx_conversations_user_type');
    console.log('[Migration v2] Rolled back: Removed performance indexes');
  },
};

/**
 * Migration v2 -> v3: Add full-text search support [REMOVED]
 *
 * Note: FTS functionality has been removed as it's not currently needed.
 * Will be re-implemented when search functionality is added to the UI.
 */
const migration_v3: IMigration = {
  version: 3,
  name: 'Add full-text search (skipped)',
  up: (_db) => {
    // FTS removed - will be re-added when search functionality is implemented
    console.log('[Migration v3] FTS support skipped (removed, will be added back later)');
  },
  down: (db) => {
    // Clean up FTS table if it exists from older versions
    db.exec('DROP TABLE IF EXISTS messages_fts');
    console.log('[Migration v3] Rolled back: Removed full-text search');
  },
};

/**
 * Migration v3 -> v4: Removed (user_preferences table no longer needed)
 */
const migration_v4: IMigration = {
  version: 4,
  name: 'Removed user_preferences table',
  up: (_db) => {
    // user_preferences table removed from schema
    console.log('[Migration v4] Skipped (user_preferences table removed)');
  },
  down: (_db) => {
    console.log('[Migration v4] Rolled back: No-op (user_preferences table removed)');
  },
};

/**
 * Migration v4 -> v5: Remove FTS table
 * Cleanup for FTS removal - ensures all databases have consistent schema
 */
const migration_v5: IMigration = {
  version: 5,
  name: 'Remove FTS table',
  up: (db) => {
    // Remove FTS table created by old v3 migration
    db.exec('DROP TABLE IF EXISTS messages_fts');
    console.log('[Migration v5] Removed FTS table (cleanup for FTS removal)');
  },
  down: (_db) => {
    // If rolling back, we don't recreate FTS table (it's deprecated)
    console.log('[Migration v5] Rolled back: FTS table remains removed (deprecated feature)');
  },
};

/**
 * Migration v5 -> v6: Add jwt_secret column to users table
 * Store JWT secret per user for better security and management
 */
const migration_v6: IMigration = {
  version: 6,
  name: 'Add jwt_secret to users table',
  up: (db) => {
    // Check if jwt_secret column already exists
    const tableInfo = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
    const hasJwtSecret = tableInfo.some((col) => col.name === 'jwt_secret');

    if (!hasJwtSecret) {
      // Add jwt_secret column to users table
      db.exec('ALTER TABLE users ADD COLUMN jwt_secret TEXT');
      console.log('[Migration v6] Added jwt_secret column to users table');
    } else {
      console.log('[Migration v6] jwt_secret column already exists, skipping');
    }
  },
  down: (db) => {
    // SQLite doesn't support DROP COLUMN directly, need to recreate table
    db.exec(
      'CREATE TABLE users_backup AS SELECT id, username, email, password_hash, avatar_path, created_at, updated_at, last_login FROM users'
    );
    db.exec('DROP TABLE users');
    db.exec('ALTER TABLE users_backup RENAME TO users');
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    console.log('[Migration v6] Rolled back: Removed jwt_secret column from users table');
  },
};

/**
 * Migration v6 -> v7: Add Personal Assistant tables
 * Supports remote interaction through messaging platforms (Telegram, Slack, Discord)
 */
const migration_v7: IMigration = {
  version: 7,
  name: 'Add Personal Assistant tables',
  up: (db) => {
    // Assistant plugins configuration
    db.exec(`CREATE TABLE IF NOT EXISTS assistant_plugins (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('telegram', 'slack', 'discord')),
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 0,
        config TEXT NOT NULL,
        status TEXT CHECK(status IN ('created', 'initializing', 'ready', 'starting', 'running', 'stopping', 'stopped', 'error')),
        last_connected INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_plugins_type ON assistant_plugins(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_plugins_enabled ON assistant_plugins(enabled)');

    // Authorized users whitelist
    db.exec(`CREATE TABLE IF NOT EXISTS assistant_users (
        id TEXT PRIMARY KEY,
        platform_user_id TEXT NOT NULL,
        platform_type TEXT NOT NULL,
        display_name TEXT,
        authorized_at INTEGER NOT NULL,
        last_active INTEGER,
        session_id TEXT,
        UNIQUE(platform_user_id, platform_type)
      )`);
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_assistant_users_platform ON assistant_users(platform_type, platform_user_id)'
    );

    // User sessions
    db.exec(`CREATE TABLE IF NOT EXISTS assistant_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        agent_type TEXT NOT NULL CHECK(agent_type IN ('gemini', 'acp', 'codex')),
        conversation_id TEXT,
        workspace TEXT,
        created_at INTEGER NOT NULL,
        last_activity INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES assistant_users(id) ON DELETE CASCADE,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_sessions_user ON assistant_sessions(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_sessions_conversation ON assistant_sessions(conversation_id)');

    // Pending pairing requests
    db.exec(`CREATE TABLE IF NOT EXISTS assistant_pairing_codes (
        code TEXT PRIMARY KEY,
        platform_user_id TEXT NOT NULL,
        platform_type TEXT NOT NULL,
        display_name TEXT,
        requested_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'expired'))
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_pairing_expires ON assistant_pairing_codes(expires_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_pairing_status ON assistant_pairing_codes(status)');

    console.log('[Migration v7] Added Personal Assistant tables');
  },
  down: (db) => {
    db.exec('DROP TABLE IF EXISTS assistant_pairing_codes');
    db.exec('DROP TABLE IF EXISTS assistant_sessions');
    db.exec('DROP TABLE IF EXISTS assistant_users');
    db.exec('DROP TABLE IF EXISTS assistant_plugins');
    console.log('[Migration v7] Rolled back: Removed Personal Assistant tables');
  },
};

/**
 * Migration v7 -> v8: Add source column to conversations table
 */
const migration_v8: IMigration = {
  version: 8,
  name: 'Add source column to conversations',
  up: (db) => {
    // Add source column to conversations table
    db.exec(`ALTER TABLE conversations ADD COLUMN source TEXT CHECK(source IN ('aionui', 'telegram'))`);

    // Create index for efficient source-based queries
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');

    console.log('[Migration v8] Added source column to conversations table');
  },
  down: (db) => {
    // SQLite doesn't support DROP COLUMN directly, need to recreate table
    // For simplicity, just drop the indexes (column will remain)
    db.exec('DROP INDEX IF EXISTS idx_conversations_source');
    db.exec('DROP INDEX IF EXISTS idx_conversations_source_updated');
    console.log('[Migration v8] Rolled back: Removed source indexes');
  },
};

/**
 * Migration v8 -> v9: Add cron_jobs table for scheduled tasks
 */
const migration_v9: IMigration = {
  version: 9,
  name: 'Add cron_jobs table',
  up: (db) => {
    db.exec(`CREATE TABLE IF NOT EXISTS cron_jobs (
        -- Basic info
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,

        -- Schedule
        schedule_kind TEXT NOT NULL,       -- 'at' | 'every' | 'cron'
        schedule_value TEXT NOT NULL,      -- timestamp | ms | cron expr
        schedule_tz TEXT,                  -- timezone (optional)
        schedule_description TEXT NOT NULL, -- human-readable description

        -- Target
        payload_message TEXT NOT NULL,

        -- Metadata (for management)
        conversation_id TEXT NOT NULL,     -- Which conversation created this
        conversation_title TEXT,           -- For display in UI
        agent_type TEXT NOT NULL,          -- 'gemini' | 'claude' | 'codex' | etc.
        created_by TEXT NOT NULL,          -- 'user' | 'agent'
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),

        -- Runtime state
        next_run_at INTEGER,
        last_run_at INTEGER,
        last_status TEXT,                  -- 'ok' | 'error' | 'skipped'
        last_error TEXT,                   -- Error message if failed
        run_count INTEGER DEFAULT 0,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3
      )`);
    // Index for querying jobs by conversation (frontend management)
    db.exec('CREATE INDEX IF NOT EXISTS idx_cron_jobs_conversation ON cron_jobs(conversation_id)');
    // Index for scheduler to find next jobs to run
    db.exec('CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run ON cron_jobs(next_run_at) WHERE enabled = 1');
    // Index for querying by agent type (if needed)
    db.exec('CREATE INDEX IF NOT EXISTS idx_cron_jobs_agent_type ON cron_jobs(agent_type)');
    console.log('[Migration v9] Added cron_jobs table');
  },
  down: (db) => {
    db.exec('DROP INDEX IF EXISTS idx_cron_jobs_agent_type');
    db.exec('DROP INDEX IF EXISTS idx_cron_jobs_next_run');
    db.exec('DROP INDEX IF EXISTS idx_cron_jobs_conversation');
    db.exec('DROP TABLE IF EXISTS cron_jobs');
    console.log('[Migration v9] Rolled back: Removed cron_jobs table');
  },
};

/**
 * Migration v9 -> v10: Add 'lark' to assistant_plugins type constraint
 */
const migration_v10: IMigration = {
  version: 10,
  name: 'Add lark to assistant_plugins type constraint',
  up: (db) => {
    // SQLite doesn't support ALTER TABLE to modify CHECK constraints
    // We need to recreate the table with the new constraint
    db.exec(`CREATE TABLE IF NOT EXISTS assistant_plugins_new (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('telegram', 'slack', 'discord', 'lark')),
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 0,
        config TEXT NOT NULL,
        status TEXT CHECK(status IN ('created', 'initializing', 'ready', 'starting', 'running', 'stopping', 'stopped', 'error')),
        last_connected INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`);
    db.exec('INSERT OR IGNORE INTO assistant_plugins_new SELECT * FROM assistant_plugins');
    db.exec('DROP TABLE IF EXISTS assistant_plugins');
    db.exec('ALTER TABLE assistant_plugins_new RENAME TO assistant_plugins');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_plugins_type ON assistant_plugins(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_plugins_enabled ON assistant_plugins(enabled)');

    console.log('[Migration v10] Added lark to assistant_plugins type constraint');
  },
  down: (db) => {
    // Rollback: recreate table without lark type (data with lark type will be lost)
    db.exec(`CREATE TABLE IF NOT EXISTS assistant_plugins_old (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('telegram', 'slack', 'discord')),
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 0,
        config TEXT NOT NULL,
        status TEXT CHECK(status IN ('created', 'initializing', 'ready', 'starting', 'running', 'stopping', 'stopped', 'error')),
        last_connected INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`);
    db.exec(`INSERT OR IGNORE INTO assistant_plugins_old SELECT * FROM assistant_plugins WHERE type != 'lark'`);
    db.exec('DROP TABLE IF EXISTS assistant_plugins');
    db.exec('ALTER TABLE assistant_plugins_old RENAME TO assistant_plugins');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_plugins_type ON assistant_plugins(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_plugins_enabled ON assistant_plugins(enabled)');
    console.log('[Migration v10] Rolled back: Removed lark from assistant_plugins type constraint');
  },
};

/**
 * Migration v10 -> v11: Add 'openclaw-gateway' to conversations type constraint
 */
const migration_v11: IMigration = {
  version: 11,
  name: 'Add openclaw-gateway to conversations type constraint',
  up: (db) => {
    // SQLite doesn't support ALTER TABLE to modify CHECK constraints.
    // We recreate the table with the new constraint.
    // NOTE: The migration runner disables foreign_keys before the transaction,
    // so DROP TABLE will NOT trigger ON DELETE CASCADE on the messages table.

    // Clean up any invalid source values before copying
    db.exec(`UPDATE conversations SET source = NULL WHERE source IS NOT NULL AND source NOT IN ('aionui', 'telegram')`);

    db.exec(`CREATE TABLE IF NOT EXISTS conversations_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex', 'openclaw-gateway')),
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT CHECK(source IS NULL OR source IN ('aionui', 'telegram')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_new (id, user_id, name, type, extra, model, status, source, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, created_at, updated_at FROM conversations`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_new RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');

    console.log('[Migration v11] Added openclaw-gateway to conversations type constraint');
  },
  down: (db) => {
    // Rollback: recreate table without openclaw-gateway type
    // (data with openclaw-gateway type will be lost)
    // NOTE: foreign_keys is disabled by the migration runner before the transaction.
    db.exec(`CREATE TABLE IF NOT EXISTS conversations_rollback (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex')),
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT CHECK(source IS NULL OR source IN ('aionui', 'telegram')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_rollback (id, user_id, name, type, extra, model, status, source, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, created_at, updated_at FROM conversations WHERE type != 'openclaw-gateway'`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_rollback RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');

    console.log('[Migration v11] Rolled back: Removed openclaw-gateway from conversations type constraint');
  },
};

/**
 * Migration v11 -> v12: Add 'lark' to conversations source CHECK constraint
 */
const migration_v12: IMigration = {
  version: 12,
  name: 'Add lark to conversations source constraint',
  up: (db) => {
    // SQLite doesn't support ALTER TABLE to modify CHECK constraints.
    // We recreate the table with the updated constraint that includes 'lark'.
    // NOTE: The migration runner disables foreign_keys before the transaction,
    // so DROP TABLE will NOT trigger ON DELETE CASCADE on the messages table.

    // Clean up any invalid source values before copying
    db.exec(
      `UPDATE conversations SET source = NULL WHERE source IS NOT NULL AND source NOT IN ('aionui', 'telegram', 'lark')`
    );

    db.exec(`CREATE TABLE IF NOT EXISTS conversations_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex', 'openclaw-gateway')),
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT CHECK(source IS NULL OR source IN ('aionui', 'telegram', 'lark')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_new (id, user_id, name, type, extra, model, status, source, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, created_at, updated_at FROM conversations`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_new RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');

    console.log('[Migration v12] Added lark to conversations source constraint');
  },
  down: (db) => {
    // Rollback: recreate table without 'lark' in source constraint
    // NOTE: foreign_keys is disabled by the migration runner before the transaction.

    // Clean up lark source values before copying to table with stricter constraint
    db.exec(`UPDATE conversations SET source = NULL WHERE source = 'lark'`);

    db.exec(`CREATE TABLE IF NOT EXISTS conversations_rollback (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex', 'openclaw-gateway')),
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT CHECK(source IS NULL OR source IN ('aionui', 'telegram')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_rollback (id, user_id, name, type, extra, model, status, source, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, created_at, updated_at FROM conversations`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_rollback RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');

    console.log('[Migration v12] Rolled back: Removed lark from conversations source constraint');
  },
};

/**
 * Migration v12 -> v13: Add 'nanobot' to conversations type CHECK constraint
 */
const migration_v13: IMigration = {
  version: 13,
  name: 'Add nanobot to conversations type constraint',
  up: (db) => {
    // SQLite doesn't support ALTER TABLE to modify CHECK constraints.
    // We recreate the table with the updated constraint that includes 'nanobot'.
    // NOTE: The migration runner disables foreign_keys before the transaction,
    // so DROP TABLE will NOT trigger ON DELETE CASCADE on the messages table.

    db.exec(`CREATE TABLE IF NOT EXISTS conversations_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex', 'openclaw-gateway', 'nanobot')),
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT CHECK(source IS NULL OR source IN ('aionui', 'telegram', 'lark')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_new (id, user_id, name, type, extra, model, status, source, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, created_at, updated_at FROM conversations`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_new RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');

    console.log('[Migration v13] Added nanobot to conversations type constraint');
  },
  down: (db) => {
    // Rollback: recreate table without 'nanobot' in type constraint
    // NOTE: foreign_keys is disabled by the migration runner before the transaction.

    // Remove nanobot conversations before copying to table with stricter constraint
    db.exec(`DELETE FROM conversations WHERE type = 'nanobot'`);

    db.exec(`CREATE TABLE IF NOT EXISTS conversations_rollback (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex', 'openclaw-gateway')),
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT CHECK(source IS NULL OR source IN ('aionui', 'telegram', 'lark')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_rollback (id, user_id, name, type, extra, model, status, source, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, created_at, updated_at FROM conversations`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_rollback RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');

    console.log('[Migration v13] Rolled back: Removed nanobot from conversations type constraint');
  },
};

/**
 * Migration v13 -> v14: Add 'dingtalk' to assistant_plugins type and conversations source CHECK constraints
 */
const migration_v14: IMigration = {
  version: 14,
  name: 'Add dingtalk to assistant_plugins type and conversations source constraints',
  up: (db) => {
    // 1. Recreate assistant_plugins with 'dingtalk' in type constraint
    db.exec(`CREATE TABLE IF NOT EXISTS assistant_plugins_new (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('telegram', 'slack', 'discord', 'lark', 'dingtalk')),
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 0,
        config TEXT NOT NULL,
        status TEXT CHECK(status IN ('created', 'initializing', 'ready', 'starting', 'running', 'stopping', 'stopped', 'error')),
        last_connected INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`);
    db.exec('INSERT OR IGNORE INTO assistant_plugins_new SELECT * FROM assistant_plugins');
    db.exec('DROP TABLE IF EXISTS assistant_plugins');
    db.exec('ALTER TABLE assistant_plugins_new RENAME TO assistant_plugins');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_plugins_type ON assistant_plugins(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_plugins_enabled ON assistant_plugins(enabled)');

    // 2. Recreate conversations with 'dingtalk' in source constraint
    // NOTE: The migration runner disables foreign_keys before the transaction,
    // so DROP TABLE will NOT trigger ON DELETE CASCADE on the messages table.
    db.exec(
      `UPDATE conversations SET source = NULL WHERE source IS NOT NULL AND source NOT IN ('aionui', 'telegram', 'lark', 'dingtalk')`
    );

    db.exec(`CREATE TABLE IF NOT EXISTS conversations_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex', 'openclaw-gateway', 'nanobot')),
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT CHECK(source IS NULL OR source IN ('aionui', 'telegram', 'lark', 'dingtalk')),
        channel_chat_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_new (id, user_id, name, type, extra, model, status, source, channel_chat_id, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, NULL, created_at, updated_at FROM conversations`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_new RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_conversations_source_chat ON conversations(source, channel_chat_id, updated_at DESC)'
    );

    // 3. Add chat_id to assistant_sessions for per-chat session isolation
    const sessTableInfo = db.prepare('PRAGMA table_info(assistant_sessions)').all() as Array<{ name: string }>;
    if (!sessTableInfo.some((col) => col.name === 'chat_id')) {
      db.exec('ALTER TABLE assistant_sessions ADD COLUMN chat_id TEXT');
    }

    console.log('[Migration v14] Added dingtalk support and channel_chat_id for per-chat isolation');
  },
  down: (db) => {
    // Rollback assistant_plugins: remove 'dingtalk'
    db.exec(`DELETE FROM assistant_plugins WHERE type = 'dingtalk'`);

    db.exec(`CREATE TABLE IF NOT EXISTS assistant_plugins_old (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('telegram', 'slack', 'discord', 'lark')),
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 0,
        config TEXT NOT NULL,
        status TEXT CHECK(status IN ('created', 'initializing', 'ready', 'starting', 'running', 'stopping', 'stopped', 'error')),
        last_connected INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`);
    db.exec(`INSERT OR IGNORE INTO assistant_plugins_old SELECT * FROM assistant_plugins WHERE type != 'dingtalk'`);
    db.exec('DROP TABLE IF EXISTS assistant_plugins');
    db.exec('ALTER TABLE assistant_plugins_old RENAME TO assistant_plugins');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_plugins_type ON assistant_plugins(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_plugins_enabled ON assistant_plugins(enabled)');

    // Rollback conversations: remove 'dingtalk' from source
    db.exec(`UPDATE conversations SET source = NULL WHERE source = 'dingtalk'`);

    db.exec(`CREATE TABLE IF NOT EXISTS conversations_rollback (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex', 'openclaw-gateway', 'nanobot')),
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT CHECK(source IS NULL OR source IN ('aionui', 'telegram', 'lark')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_rollback (id, user_id, name, type, extra, model, status, source, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, created_at, updated_at FROM conversations`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_rollback RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');

    console.log('[Migration v14] Rolled back: Removed dingtalk and channel_chat_id');
  },
};

/**
 * All migrations in order
 */
/**
 * Migration v14 -> v15: Remove strict CHECK constraints on type/source
 * to allow extension-contributed channel plugins.
 */
const migration_v15: IMigration = {
  version: 15,
  name: 'Remove strict constraints for extension channels',
  up: (db) => {
    // 1. Recreate assistant_plugins without strict type constraint
    db.exec(`CREATE TABLE IF NOT EXISTS assistant_plugins_new (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL, -- Removed CHECK constraint
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 0,
        config TEXT NOT NULL,
        status TEXT CHECK(status IN ('created', 'initializing', 'ready', 'starting', 'running', 'stopping', 'stopped', 'error')),
        last_connected INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`);
    db.exec('INSERT OR IGNORE INTO assistant_plugins_new SELECT * FROM assistant_plugins');
    db.exec('DROP TABLE IF EXISTS assistant_plugins');
    db.exec('ALTER TABLE assistant_plugins_new RENAME TO assistant_plugins');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_plugins_type ON assistant_plugins(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_assistant_plugins_enabled ON assistant_plugins(enabled)');

    // 2. Recreate conversations without strict source constraint
    db.exec(`CREATE TABLE IF NOT EXISTS conversations_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex', 'openclaw-gateway', 'nanobot')),
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT, -- Removed CHECK constraint
        channel_chat_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_new (id, user_id, name, type, extra, model, status, source, channel_chat_id, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, channel_chat_id, created_at, updated_at FROM conversations`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_new RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_conversations_source_chat ON conversations(source, channel_chat_id, updated_at DESC)'
    );

    console.log('[Migration v15] Removed strict constraints for extension channels');
  },
  down: (_db) => {
    // Cannot safely rollback if there are custom types/sources in the database.
    // For now, we just log a warning and do nothing, or we could delete them.
    console.warn('[Migration v15] Rollback skipped to prevent data loss of extension channels.');
  },
};

/**
 * Migration v15 -> v16: Add remote_agents table + 'remote' to conversations type
 */
const migration_v16: IMigration = {
  version: 16,
  name: 'Add remote_agents table and remote conversation type',
  up: (db) => {
    // 1. Create remote_agents table
    db.exec(`CREATE TABLE IF NOT EXISTS remote_agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        protocol TEXT NOT NULL DEFAULT 'openclaw',
        url TEXT NOT NULL,
        auth_type TEXT NOT NULL DEFAULT 'bearer',
        auth_token TEXT,
        avatar TEXT,
        description TEXT,
        status TEXT DEFAULT 'unknown',
        last_connected_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_remote_agents_protocol ON remote_agents(protocol)');

    // 2. Recreate conversations with 'remote' added to type CHECK
    db.exec(`CREATE TABLE IF NOT EXISTS conversations_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex', 'openclaw-gateway', 'nanobot', 'remote')),
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT,
        channel_chat_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_new (id, user_id, name, type, extra, model, status, source, channel_chat_id, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, channel_chat_id, created_at, updated_at FROM conversations`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_new RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_conversations_source_chat ON conversations(source, channel_chat_id, updated_at DESC)'
    );

    console.log('[Migration v16] Added remote_agents table and remote conversation type');
  },
  down: (db) => {
    db.exec('DROP INDEX IF EXISTS idx_remote_agents_protocol');
    db.exec('DROP TABLE IF EXISTS remote_agents');
    console.log('[Migration v16] Rolled back: Removed remote_agents table');
  },
};

/**
 * Migration v16 -> v17: Add device identity columns to remote_agents
 */
const migration_v17: IMigration = {
  version: 17,
  name: 'Add device identity columns to remote_agents',
  up: (db) => {
    const columns = new Set((db.pragma('table_info(remote_agents)') as Array<{ name: string }>).map((c) => c.name));
    if (!columns.has('device_id')) {
      db.exec('ALTER TABLE remote_agents ADD COLUMN device_id TEXT');
    }
    if (!columns.has('device_public_key')) {
      db.exec('ALTER TABLE remote_agents ADD COLUMN device_public_key TEXT');
    }
    if (!columns.has('device_private_key')) {
      db.exec('ALTER TABLE remote_agents ADD COLUMN device_private_key TEXT');
    }
    if (!columns.has('device_token')) {
      db.exec('ALTER TABLE remote_agents ADD COLUMN device_token TEXT');
    }
    console.log('[Migration v17] Added device identity columns to remote_agents');
  },
  down: (_db) => {
    // SQLite does not support DROP COLUMN before 3.35.0; skip rollback to prevent data loss.
    console.warn('[Migration v17] Rollback skipped: cannot drop columns safely.');
  },
};

/**
 * Migration v17 -> v18: Add allow_insecure column to remote_agents
 */
const migration_v18: IMigration = {
  version: 18,
  name: 'Add allow_insecure column to remote_agents',
  up: (db) => {
    const columns = new Set((db.pragma('table_info(remote_agents)') as Array<{ name: string }>).map((c) => c.name));
    if (!columns.has('allow_insecure')) {
      db.exec('ALTER TABLE remote_agents ADD COLUMN allow_insecure INTEGER DEFAULT 0');
    }
    console.log('[Migration v18] Added allow_insecure column to remote_agents');
  },
  down: (_db) => {
    // SQLite does not support DROP COLUMN before 3.35.0; skip rollback to prevent data loss.
    console.warn('[Migration v18] Rollback skipped: cannot drop columns safely.');
  },
};

/**
 * Migration v18 -> v19: Add teams table for Team mode
 *
 * NOTE: This migration intentionally omits `lead_agent_id`. That column was
 * added in v20 via ALTER TABLE. Users who upgrade directly to v20+ get the
 * column via the v20 migration; the omission here is a known historical gap,
 * not a bug. Do NOT add `lead_agent_id` here — it would conflict with v20.
 */
const migration_v19: IMigration = {
  version: 19,
  name: 'Add teams table',
  up: (db) => {
    db.exec(`CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      workspace TEXT NOT NULL,
      workspace_mode TEXT NOT NULL DEFAULT 'shared',
      agents TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_teams_updated_at ON teams(updated_at)');
  },
  down: (db) => {
    db.exec('DROP INDEX IF EXISTS idx_teams_updated_at');
    db.exec('DROP INDEX IF EXISTS idx_teams_user_id');
    db.exec('DROP TABLE IF EXISTS teams');
  },
};

const migration_v20: IMigration = {
  version: 20,
  name: 'Add lead_agent_id to teams, create mailbox and team_tasks tables',
  up: (db) => {
    // Ensure teams table exists (v19 should have created it, but guard against
    // dev databases where v19 ran without the teams migration content)
    db.exec(`CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      workspace TEXT NOT NULL,
      workspace_mode TEXT NOT NULL DEFAULT 'shared',
      agents TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_teams_updated_at ON teams(updated_at)');

    // Add lead_agent_id column (ignore if already exists from a prior v19 run)
    try {
      db.exec(`ALTER TABLE teams ADD COLUMN lead_agent_id TEXT NOT NULL DEFAULT ''`);
    } catch {
      // Column already exists — safe to ignore
    }
    db.exec(`CREATE TABLE IF NOT EXISTS mailbox (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      to_agent_id TEXT NOT NULL,
      from_agent_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'message',
      content TEXT NOT NULL,
      summary TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_mailbox_to ON mailbox(team_id, to_agent_id, read)');
    db.exec(`CREATE TABLE IF NOT EXISTS team_tasks (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      owner TEXT,
      blocked_by TEXT NOT NULL DEFAULT '[]',
      blocks TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_team ON team_tasks(team_id, status)');
  },
  down: (db) => {
    // SQLite does not support DROP COLUMN; leave lead_agent_id in place
    db.exec('DROP INDEX IF EXISTS idx_tasks_team');
    db.exec('DROP TABLE IF EXISTS team_tasks');
    db.exec('DROP INDEX IF EXISTS idx_mailbox_to');
    db.exec('DROP TABLE IF EXISTS mailbox');
  },
};

/**
 * Migration v20 -> v21: Add 'aionrs' to conversations type CHECK constraint
 */
const migration_v21: IMigration = {
  version: 21,
  name: "Add 'aionrs' to conversations type CHECK",
  up: (db) => {
    db.exec(`CREATE TABLE IF NOT EXISTS conversations_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex', 'openclaw-gateway', 'nanobot', 'remote', 'aionrs')),
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT,
        channel_chat_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_new (id, user_id, name, type, extra, model, status, source, channel_chat_id, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, channel_chat_id, created_at, updated_at FROM conversations`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_new RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_conversations_source_chat ON conversations(source, channel_chat_id, updated_at DESC)'
    );
    console.log("[Migration v21] Added 'aionrs' to conversations type CHECK");
  },
  down: (db) => {
    // Remove aionrs conversations before copying to table with stricter constraint
    db.exec(`DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE type = 'aionrs')`);
    db.exec(`DELETE FROM conversations WHERE type = 'aionrs'`);

    db.exec(`CREATE TABLE IF NOT EXISTS conversations_rollback (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex', 'openclaw-gateway', 'nanobot', 'remote')),
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT,
        channel_chat_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_rollback (id, user_id, name, type, extra, model, status, source, channel_chat_id, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, channel_chat_id, created_at, updated_at FROM conversations`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_rollback RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_conversations_source_chat ON conversations(source, channel_chat_id, updated_at DESC)'
    );

    console.log("[Migration v21] Rolled back: Removed 'aionrs' from conversations type CHECK");
  },
};

/**
 * Migration v21 -> v22: Remove CHECK constraint on conversations.type,
 * add cron job columns, hidden messages, and cronJobId index.
 *
 * The CHECK(type IN (...)) constraint forced a heavy table-rebuild migration
 * every time a new agent type was added (v10, v11, v14, v15, v16, v21 all did this).
 * By removing the constraint, new agent types only need TypeScript-level changes
 * (TChatConversation union + rowToConversation branch) — no database migration.
 */
const migration_v22: IMigration = {
  version: 22,
  name: 'Remove type CHECK, add cron columns, hidden messages',
  up: (db) => {
    // 1. Remove CHECK constraint on conversations.type
    db.exec(`CREATE TABLE IF NOT EXISTS conversations_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        extra TEXT NOT NULL,
        model TEXT,
        status TEXT CHECK(status IN ('pending', 'running', 'finished')),
        source TEXT,
        channel_chat_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    db.exec(`INSERT INTO conversations_new (id, user_id, name, type, extra, model, status, source, channel_chat_id, created_at, updated_at)
      SELECT id, user_id, name, type, extra, model, status, source, channel_chat_id, created_at, updated_at FROM conversations`);
    db.exec('DROP TABLE conversations');
    db.exec('ALTER TABLE conversations_new RENAME TO conversations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_source_updated ON conversations(source, updated_at DESC)');
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_conversations_source_chat ON conversations(source, channel_chat_id, updated_at DESC)'
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_conversations_cron_job_id ON conversations(json_extract(extra, '$.cronJobId'))`
    );

    // 2. Add cron job columns (execution_mode, agent_config)
    const cronColumns = new Set((db.pragma('table_info(cron_jobs)') as Array<{ name: string }>).map((c) => c.name));
    if (!cronColumns.has('execution_mode')) {
      db.exec(`ALTER TABLE cron_jobs ADD COLUMN execution_mode TEXT DEFAULT 'existing'`);
    }
    if (!cronColumns.has('agent_config')) {
      db.exec(`ALTER TABLE cron_jobs ADD COLUMN agent_config TEXT`);
    }
    // Fix legacy jobs: empty conversation_id means they were created before execution_mode existed
    db.exec(
      `UPDATE cron_jobs SET execution_mode = 'new_conversation' WHERE conversation_id = '' OR conversation_id IS NULL`
    );

    // 3. Add hidden column to messages
    const msgColumns = new Set((db.pragma('table_info(messages)') as Array<{ name: string }>).map((c) => c.name));
    if (!msgColumns.has('hidden')) {
      db.exec(`ALTER TABLE messages ADD COLUMN hidden INTEGER DEFAULT 0`);
    }

    console.log('[Migration v22] Removed type CHECK, added cron columns, hidden messages');
  },
  down: (_db) => {
    // Cannot safely rollback — re-adding CHECK would reject unknown types already in the table.
    console.warn('[Migration v22] Rollback skipped: re-adding CHECK constraint could reject existing data.');
  },
};

/**
 * Migration v22 -> v23: Add session_mode column to teams table
 * Persists the team-level session permission mode so newly spawned agents
 * inherit the correct mode without falling back to the lead agent's extra.
 */
const migration_v23: IMigration = {
  version: 23,
  name: 'Add session_mode to teams table',
  up: (db) => {
    const columns = new Set((db.pragma('table_info(teams)') as Array<{ name: string }>).map((c) => c.name));
    if (!columns.has('session_mode')) {
      db.exec('ALTER TABLE teams ADD COLUMN session_mode TEXT');
    }
    console.log('[Migration v23] Added session_mode column to teams table');
  },
  down: (_db) => {
    // SQLite does not support DROP COLUMN before 3.35.0; skip rollback to prevent data loss.
    console.warn('[Migration v23] Rollback skipped: cannot drop columns safely.');
  },
};

/**
 * Migration v23 -> v24: Add description to cron_jobs table
 */
const migration_v24: IMigration = {
  version: 24,
  name: 'Add description to cron_jobs table',
  up: (db) => {
    const cronColumns = new Set((db.pragma('table_info(cron_jobs)') as Array<{ name: string }>).map((c) => c.name));
    if (!cronColumns.has('description')) {
      db.exec('ALTER TABLE cron_jobs ADD COLUMN description TEXT');
    }
    console.log('[Migration v24] Added description column to cron_jobs table');
  },
  down: (_db) => {
    // SQLite does not support DROP COLUMN before 3.35.0; skip rollback to prevent data loss.
    console.warn('[Migration v24] Rollback skipped: cannot drop columns safely.');
  },
};

/**
 * Migration v24 -> v25: Add files column to mailbox table
 * Stores JSON-serialized file paths so team mode can forward attachments to agents.
 */
const migration_v25: IMigration = {
  version: 25,
  name: 'Add files column to mailbox table',
  up: (db) => {
    const columns = new Set((db.pragma('table_info(mailbox)') as Array<{ name: string }>).map((c) => c.name));
    if (!columns.has('files')) {
      db.exec('ALTER TABLE mailbox ADD COLUMN files TEXT');
      console.log('[Migration v25] Added files column to mailbox table');
    } else {
      console.log('[Migration v25] files column already exists, skipping');
    }
  },
  down: (_db) => {
    // SQLite does not support DROP COLUMN before 3.35.0; skip rollback to prevent data loss.
    console.warn('[Migration v25] Rollback skipped: cannot drop columns safely.');
  },
};

/**
 * Migration v25 -> v26: Add M&A Assistant tables
 * Tables for deal management, document processing, due diligence analysis, and Flowise sessions.
 */
const migration_v26: IMigration = {
  version: 26,
  name: 'Add M&A Assistant tables',
  up: (db) => {
    // Deals table - stores M&A deal context
    db.exec(`CREATE TABLE IF NOT EXISTS ma_deals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parties TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      target_company TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      extra TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_deals_status ON ma_deals(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_deals_created_at ON ma_deals(created_at)');

    // Documents table - stores uploaded M&A documents
    db.exec(`CREATE TABLE IF NOT EXISTS ma_documents (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_path TEXT NOT NULL,
      format TEXT NOT NULL,
      size INTEGER NOT NULL,
      text_content TEXT,
      chunks TEXT,
      metadata TEXT,
      status TEXT DEFAULT 'pending',
      error TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (deal_id) REFERENCES ma_deals(id) ON DELETE CASCADE
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_documents_deal_id ON ma_documents(deal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_documents_status ON ma_documents(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_documents_format ON ma_documents(format)');

    // Analyses table - stores due diligence and other analysis results
    db.exec(`CREATE TABLE IF NOT EXISTS ma_analyses (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL,
      type TEXT NOT NULL,
      flow_id TEXT,
      input TEXT NOT NULL,
      result TEXT,
      status TEXT DEFAULT 'pending',
      error TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      completed_at INTEGER,
      FOREIGN KEY (deal_id) REFERENCES ma_deals(id) ON DELETE CASCADE
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_analyses_deal_id ON ma_analyses(deal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_analyses_type ON ma_analyses(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_analyses_status ON ma_analyses(status)');

    // Risk findings table - stores individual risk findings from analyses
    db.exec(`CREATE TABLE IF NOT EXISTS ma_risk_findings (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      score INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      evidence TEXT,
      recommendation TEXT,
      source_document_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (analysis_id) REFERENCES ma_analyses(id) ON DELETE CASCADE,
      FOREIGN KEY (source_document_id) REFERENCES ma_documents(id) ON DELETE SET NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_risk_findings_analysis_id ON ma_risk_findings(analysis_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_risk_findings_category ON ma_risk_findings(category)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_risk_findings_severity ON ma_risk_findings(severity)');

    // Flowise sessions table - stores Flowise conversation sessions
    db.exec(`CREATE TABLE IF NOT EXISTS ma_flowise_sessions (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      flow_id TEXT NOT NULL,
      deal_id TEXT,
      session_key TEXT,
      config TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (deal_id) REFERENCES ma_deals(id) ON DELETE SET NULL
    )`);
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_ma_flowise_sessions_conversation_id ON ma_flowise_sessions(conversation_id)'
    );
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_flowise_sessions_flow_id ON ma_flowise_sessions(flow_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_flowise_sessions_deal_id ON ma_flowise_sessions(deal_id)');

    console.log('[Migration v26] Added M&A Assistant tables');
  },
  down: (db) => {
    db.exec('DROP TABLE IF EXISTS ma_flowise_sessions');
    db.exec('DROP TABLE IF EXISTS ma_risk_findings');
    db.exec('DROP TABLE IF EXISTS ma_analyses');
    db.exec('DROP TABLE IF EXISTS ma_documents');
    db.exec('DROP TABLE IF EXISTS ma_deals');
    console.log('[Migration v26] Rolled back: Removed M&A Assistant tables');
  },
};

/**
 * Migration v26 -> v27: Add M&A integration connections table
 */
const migration_v27: IMigration = {
  version: 27,
  name: 'Add M&A integration connections table',
  up: (db) => {
    db.exec(`CREATE TABLE IF NOT EXISTS ma_integration_connections (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL UNIQUE,
      provider_config_key TEXT NOT NULL,
      connection_id TEXT,
      status TEXT NOT NULL DEFAULT 'not_connected',
      display_name TEXT,
      metadata TEXT,
      last_error TEXT,
      connected_at INTEGER,
      last_synced_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )`);
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_ma_integration_connections_provider_config_key ON ma_integration_connections(provider_config_key)'
    );
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_integration_connections_status ON ma_integration_connections(status)');

    console.log('[Migration v27] Added M&A integration connections table');
  },
  down: (db) => {
    db.exec('DROP INDEX IF EXISTS idx_ma_integration_connections_status');
    db.exec('DROP INDEX IF EXISTS idx_ma_integration_connections_provider_config_key');
    db.exec('DROP TABLE IF EXISTS ma_integration_connections');

    console.log('[Migration v27] Rolled back: Removed M&A integration connections table');
  },
};

/**
 * Migration v27 -> v28: Add M&A data spine tables
 * Creates tables for company profiles, contacts, watchlists, data.gouv.fr cache,
 * knowledge base sources, document chunks, chatflow registry, and prompt versions.
 */
const migration_v28: IMigration = {
  version: 28,
  name: 'Add M&A data spine tables',
  up: (db) => {
    // ma_companies table - company profiles with enrichment data
    db.exec(`CREATE TABLE IF NOT EXISTS ma_companies (
        id TEXT PRIMARY KEY,
        siren TEXT NOT NULL UNIQUE,
        siret TEXT,
        name TEXT NOT NULL,
        legal_form TEXT,
        naf_code TEXT,
        sector_id TEXT,
        jurisdiction TEXT,
        headquarters_address TEXT,
        registered_at INTEGER,
        employee_count INTEGER,
        revenue REAL,
        sources_json TEXT,
        last_enriched_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_companies_siren ON ma_companies(siren)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_companies_siret ON ma_companies(siret)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_companies_name ON ma_companies(name)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_companies_sector ON ma_companies(sector_id)');

    // ma_contacts table - contacts linked to companies and deals
    db.exec(`CREATE TABLE IF NOT EXISTS ma_contacts (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        deal_id TEXT,
        full_name TEXT NOT NULL,
        role TEXT,
        email TEXT,
        phone TEXT,
        linkedin_url TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (company_id) REFERENCES ma_companies(id) ON DELETE SET NULL,
        FOREIGN KEY (deal_id) REFERENCES ma_deals(id) ON DELETE CASCADE
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_contacts_company_id ON ma_contacts(company_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_contacts_deal_id ON ma_contacts(deal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_contacts_email ON ma_contacts(email)');

    // ma_watchlists table - user-defined watchlists for company monitoring
    db.exec(`CREATE TABLE IF NOT EXISTS ma_watchlists (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        criteria_json TEXT NOT NULL,
        cadence TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_watchlists_owner_user_id ON ma_watchlists(owner_user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_watchlists_enabled ON ma_watchlists(enabled)');

    // ma_watchlist_hits table - matches when watchlist criteria are met
    db.exec(`CREATE TABLE IF NOT EXISTS ma_watchlist_hits (
        id TEXT PRIMARY KEY,
        watchlist_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        matched_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        seen_at INTEGER,
        FOREIGN KEY (watchlist_id) REFERENCES ma_watchlists(id) ON DELETE CASCADE
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_watchlist_hits_watchlist_id ON ma_watchlist_hits(watchlist_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_watchlist_hits_matched_at ON ma_watchlist_hits(matched_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_watchlist_hits_seen_at ON ma_watchlist_hits(seen_at)');

    // ma_datagouv_cache table - cache for data.gouv.fr API responses
    db.exec(`CREATE TABLE IF NOT EXISTS ma_datagouv_cache (
        id TEXT PRIMARY KEY,
        api_surface TEXT NOT NULL,
        key_json TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        fetched_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        ttl_ms INTEGER NOT NULL,
        source_url TEXT
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_datagouv_cache_api_surface ON ma_datagouv_cache(api_surface)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_datagouv_cache_fetched_at ON ma_datagouv_cache(fetched_at)');

    // ma_kb_sources table - knowledge base source tracking
    db.exec(`CREATE TABLE IF NOT EXISTS ma_kb_sources (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        scope_id TEXT NOT NULL,
        flowise_document_store_id TEXT,
        embedding_model TEXT,
        chunk_count INTEGER DEFAULT 0,
        last_ingested_at INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        error_text TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        UNIQUE(scope, scope_id)
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_kb_sources_scope ON ma_kb_sources(scope)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_kb_sources_status ON ma_kb_sources(status)');

    // ma_documents_chunks table - document chunks for RAG
    db.exec(`CREATE TABLE IF NOT EXISTS ma_documents_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        deal_id TEXT,
        chunk_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        token_count INTEGER,
        flowise_chunk_id TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (document_id) REFERENCES ma_documents(id) ON DELETE CASCADE,
        FOREIGN KEY (deal_id) REFERENCES ma_deals(id) ON DELETE CASCADE
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_documents_chunks_document_id ON ma_documents_chunks(document_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_documents_chunks_deal_id ON ma_documents_chunks(deal_id)');
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_ma_documents_chunks_chunk_index ON ma_documents_chunks(document_id, chunk_index)'
    );
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_ma_documents_chunks_flowise_chunk_id ON ma_documents_chunks(flowise_chunk_id)'
    );

    // ma_chatflow_registry table - chatflow version tracking
    db.exec(`CREATE TABLE IF NOT EXISTS ma_chatflow_registry (
        flow_key TEXT PRIMARY KEY,
        flow_id TEXT NOT NULL,
        prompt_version_id TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        description TEXT,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_chatflow_registry_flow_id ON ma_chatflow_registry(flow_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_chatflow_registry_status ON ma_chatflow_registry(status)');

    // ma_prompt_versions table - prompt version history
    db.exec(`CREATE TABLE IF NOT EXISTS ma_prompt_versions (
        id TEXT PRIMARY KEY,
        flow_key TEXT NOT NULL,
        hash TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        created_by TEXT,
        FOREIGN KEY (flow_key) REFERENCES ma_chatflow_registry(flow_key) ON DELETE CASCADE
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_prompt_versions_flow_key ON ma_prompt_versions(flow_key)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_prompt_versions_hash ON ma_prompt_versions(hash)');

    console.log('[Migration v28] Added M&A data spine tables');
  },
  down: (db) => {
    db.exec('DROP INDEX IF EXISTS idx_ma_prompt_versions_hash');
    db.exec('DROP INDEX IF EXISTS idx_ma_prompt_versions_flow_key');
    db.exec('DROP TABLE IF EXISTS ma_prompt_versions');

    db.exec('DROP INDEX IF EXISTS idx_ma_chatflow_registry_status');
    db.exec('DROP INDEX IF EXISTS idx_ma_chatflow_registry_flow_id');
    db.exec('DROP TABLE IF EXISTS ma_chatflow_registry');

    db.exec('DROP INDEX IF EXISTS idx_ma_documents_chunks_flowise_chunk_id');
    db.exec('DROP INDEX IF EXISTS idx_ma_documents_chunks_chunk_index');
    db.exec('DROP INDEX IF EXISTS idx_ma_documents_chunks_deal_id');
    db.exec('DROP INDEX IF EXISTS idx_ma_documents_chunks_document_id');
    db.exec('DROP TABLE IF EXISTS ma_documents_chunks');

    db.exec('DROP INDEX IF EXISTS idx_ma_kb_sources_status');
    db.exec('DROP INDEX IF EXISTS idx_ma_kb_sources_scope');
    db.exec('DROP TABLE IF EXISTS ma_kb_sources');

    db.exec('DROP INDEX IF EXISTS idx_ma_datagouv_cache_fetched_at');
    db.exec('DROP INDEX IF EXISTS idx_ma_datagouv_cache_api_surface');
    db.exec('DROP TABLE IF EXISTS ma_datagouv_cache');

    db.exec('DROP INDEX IF EXISTS idx_ma_watchlist_hits_seen_at');
    db.exec('DROP INDEX IF EXISTS idx_ma_watchlist_hits_matched_at');
    db.exec('DROP INDEX IF EXISTS idx_ma_watchlist_hits_watchlist_id');
    db.exec('DROP TABLE IF EXISTS ma_watchlist_hits');

    db.exec('DROP INDEX IF EXISTS idx_ma_watchlists_enabled');
    db.exec('DROP INDEX IF EXISTS idx_ma_watchlists_owner_user_id');
    db.exec('DROP TABLE IF EXISTS ma_watchlists');

    db.exec('DROP INDEX IF EXISTS idx_ma_contacts_email');
    db.exec('DROP INDEX IF EXISTS idx_ma_contacts_deal_id');
    db.exec('DROP INDEX IF EXISTS idx_ma_contacts_company_id');
    db.exec('DROP TABLE IF EXISTS ma_contacts');

    db.exec('DROP INDEX IF EXISTS idx_ma_companies_sector');
    db.exec('DROP INDEX IF EXISTS idx_ma_companies_name');
    db.exec('DROP INDEX IF EXISTS idx_ma_companies_siret');
    db.exec('DROP INDEX IF EXISTS idx_ma_companies_siren');
    db.exec('DROP TABLE IF EXISTS ma_companies');

    console.log('[Migration v28] Rolled back: Removed M&A data spine tables');
  },
};

const migration_v29: IMigration = {
  version: 29,
  name: 'Add durable active deal persistence to ma_deals',
  up: (db) => {
    // Add is_active column to ma_deals table for durable active deal tracking
    db.exec(`ALTER TABLE ma_deals ADD COLUMN is_active INTEGER DEFAULT 0`);

    // Create index for efficient active deal lookup
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_deals_is_active ON ma_deals(is_active)');

    console.log('[Migration v29] Added is_active column to ma_deals for durable active deal persistence');
  },
  down: (db) => {
    // SQLite doesn't support DROP COLUMN directly, need to recreate table
    db.exec(
      `CREATE TABLE ma_deals_backup AS SELECT id, name, parties, transaction_type, target_company, status, extra, created_at, updated_at FROM ma_deals`
    );
    db.exec('DROP TABLE ma_deals');
    db.exec(`CREATE TABLE ma_deals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parties TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      target_company TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      extra TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_deals_status ON ma_deals(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_deals_created_at ON ma_deals(created_at)');
    db.exec(
      `INSERT INTO ma_deals SELECT id, name, parties, transaction_type, target_company, status, extra, created_at, updated_at FROM ma_deals_backup`
    );
    db.exec('DROP TABLE ma_deals_backup');
    db.exec('DROP INDEX IF EXISTS idx_ma_deals_is_active');

    console.log('[Migration v29] Rolled back: Removed is_active column from ma_deals');
  },
};

/**
 * Migration v29 -> v30: Add ma_source_cache table + provenance/freshness columns
 *
 * Wave 5 / Batch 5A — M&A data spine schema hardening:
 *   - New `ma_source_cache` table for generic external API response caching
 *     with provenance, freshness, and canonical-source policy tracking.
 *   - Add `provenance_json` / `freshness` columns to `ma_companies`,
 *     `ma_contacts`, and `ma_kb_sources` so enrichment provenance and
 *     staleness are durable per-row without reopening schema later.
 */
const migration_v30: IMigration = {
  version: 30,
  name: 'Add ma_source_cache table and provenance/freshness columns',
  up: (db) => {
    // ── ma_source_cache ──────────────────────────────────────────────
    db.exec(`CREATE TABLE IF NOT EXISTS ma_source_cache (
        id TEXT PRIMARY KEY,
        surface TEXT NOT NULL,
        lookup_key TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        provenance_json TEXT NOT NULL,
        fetched_at INTEGER NOT NULL,
        ttl_ms INTEGER NOT NULL,
        freshness TEXT NOT NULL DEFAULT 'unknown',
        source_url TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        UNIQUE(surface, lookup_key)
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_source_cache_surface ON ma_source_cache(surface)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_source_cache_freshness ON ma_source_cache(freshness)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_source_cache_fetched_at ON ma_source_cache(fetched_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_source_cache_surface_lookup ON ma_source_cache(surface, lookup_key)');

    // ── ma_companies provenance/freshness ────────────────────────────
    const companyCols = new Set((db.pragma('table_info(ma_companies)') as Array<{ name: string }>).map((c) => c.name));
    if (!companyCols.has('provenance_json')) {
      db.exec('ALTER TABLE ma_companies ADD COLUMN provenance_json TEXT');
    }
    if (!companyCols.has('freshness')) {
      db.exec("ALTER TABLE ma_companies ADD COLUMN freshness TEXT NOT NULL DEFAULT 'unknown'");
    }

    // ── ma_contacts provenance/freshness ────────────────────────────
    const contactCols = new Set((db.pragma('table_info(ma_contacts)') as Array<{ name: string }>).map((c) => c.name));
    if (!contactCols.has('provenance_json')) {
      db.exec('ALTER TABLE ma_contacts ADD COLUMN provenance_json TEXT');
    }
    if (!contactCols.has('freshness')) {
      db.exec("ALTER TABLE ma_contacts ADD COLUMN freshness TEXT NOT NULL DEFAULT 'unknown'");
    }

    // ── ma_kb_sources provenance/freshness ───────────────────────────
    const kbCols = new Set((db.pragma('table_info(ma_kb_sources)') as Array<{ name: string }>).map((c) => c.name));
    if (!kbCols.has('provenance_json')) {
      db.exec('ALTER TABLE ma_kb_sources ADD COLUMN provenance_json TEXT');
    }
    if (!kbCols.has('freshness')) {
      db.exec("ALTER TABLE ma_kb_sources ADD COLUMN freshness TEXT NOT NULL DEFAULT 'unknown'");
    }

    console.log('[Migration v30] Added ma_source_cache table and provenance/freshness columns');
  },
  down: (db) => {
    // Drop ma_source_cache
    db.exec('DROP INDEX IF EXISTS idx_ma_source_cache_surface_lookup');
    db.exec('DROP INDEX IF EXISTS idx_ma_source_cache_fetched_at');
    db.exec('DROP INDEX IF EXISTS idx_ma_source_cache_freshness');
    db.exec('DROP INDEX IF EXISTS idx_ma_source_cache_surface');
    db.exec('DROP TABLE IF EXISTS ma_source_cache');

    // Recreate ma_companies without provenance_json / freshness
    db.exec(`CREATE TABLE IF NOT EXISTS ma_companies_backup AS
      SELECT id, siren, siret, name, legal_form, naf_code, sector_id,
             jurisdiction, headquarters_address, registered_at,
             employee_count, revenue, sources_json, last_enriched_at,
             created_at, updated_at
      FROM ma_companies`);
    db.exec('DROP TABLE ma_companies');
    db.exec(`CREATE TABLE ma_companies (
        id TEXT PRIMARY KEY,
        siren TEXT NOT NULL UNIQUE,
        siret TEXT,
        name TEXT NOT NULL,
        legal_form TEXT,
        naf_code TEXT,
        sector_id TEXT,
        jurisdiction TEXT,
        headquarters_address TEXT,
        registered_at INTEGER,
        employee_count INTEGER,
        revenue REAL,
        sources_json TEXT,
        last_enriched_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )`);
    db.exec('INSERT INTO ma_companies SELECT * FROM ma_companies_backup');
    db.exec('DROP TABLE ma_companies_backup');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_companies_siren ON ma_companies(siren)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_companies_siret ON ma_companies(siret)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_companies_name ON ma_companies(name)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_companies_sector ON ma_companies(sector_id)');

    // Recreate ma_contacts without provenance_json / freshness
    db.exec(`CREATE TABLE IF NOT EXISTS ma_contacts_backup AS
      SELECT id, company_id, deal_id, full_name, role, email, phone,
             linkedin_url, notes, created_at, updated_at
      FROM ma_contacts`);
    db.exec('DROP TABLE ma_contacts');
    db.exec(`CREATE TABLE ma_contacts (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        deal_id TEXT,
        full_name TEXT NOT NULL,
        role TEXT,
        email TEXT,
        phone TEXT,
        linkedin_url TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (company_id) REFERENCES ma_companies(id) ON DELETE SET NULL,
        FOREIGN KEY (deal_id) REFERENCES ma_deals(id) ON DELETE CASCADE
      )`);
    db.exec('INSERT INTO ma_contacts SELECT * FROM ma_contacts_backup');
    db.exec('DROP TABLE ma_contacts_backup');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_contacts_company_id ON ma_contacts(company_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_contacts_deal_id ON ma_contacts(deal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_contacts_email ON ma_contacts(email)');

    // Recreate ma_kb_sources without provenance_json / freshness
    db.exec(`CREATE TABLE IF NOT EXISTS ma_kb_sources_backup AS
      SELECT id, scope, scope_id, flowise_document_store_id, embedding_model,
             chunk_count, last_ingested_at, status, error_text, created_at, updated_at
      FROM ma_kb_sources`);
    db.exec('DROP TABLE ma_kb_sources');
    db.exec(`CREATE TABLE ma_kb_sources (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        scope_id TEXT NOT NULL,
        flowise_document_store_id TEXT,
        embedding_model TEXT,
        chunk_count INTEGER DEFAULT 0,
        last_ingested_at INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        error_text TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        UNIQUE(scope, scope_id)
      )`);
    db.exec('INSERT INTO ma_kb_sources SELECT * FROM ma_kb_sources_backup');
    db.exec('DROP TABLE ma_kb_sources_backup');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_kb_sources_scope ON ma_kb_sources(scope)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_kb_sources_status ON ma_kb_sources(status)');

    console.log('[Migration v30] Rolled back: Removed ma_source_cache and provenance/freshness columns');
  },
};

/**
 * Migration v30 -> v31: Add ma_sync_jobs table
 *
 * Wave 8 / Batch 8B — Email and CRM sync flows:
 *   - New `ma_sync_jobs` table for tracking email and CRM sync operations
 *     with state machine, retry logic, and progress tracking.
 */
const migration_v31: IMigration = {
  version: 31,
  name: 'Add ma_sync_jobs table for email/CRM sync flows',
  up: (db) => {
    db.exec(`CREATE TABLE IF NOT EXISTS ma_sync_jobs (
        id TEXT PRIMARY KEY,
        job_type TEXT NOT NULL CHECK(job_type IN ('email', 'crm')),
        provider_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'queued', 'connecting', 'fetching', 'processing', 'completed', 'failed', 'cancelled', 'retrying')),
        config TEXT,
        result TEXT,
        error TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        items_processed INTEGER NOT NULL DEFAULT 0,
        items_total INTEGER NOT NULL DEFAULT 0,
        started_at INTEGER,
        completed_at INTEGER,
        next_retry_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_sync_jobs_job_type ON ma_sync_jobs(job_type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_sync_jobs_provider_id ON ma_sync_jobs(provider_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_sync_jobs_status ON ma_sync_jobs(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_sync_jobs_next_retry_at ON ma_sync_jobs(next_retry_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ma_sync_jobs_created_at ON ma_sync_jobs(created_at DESC)');

    console.log('[Migration v31] Added ma_sync_jobs table for email/CRM sync flows');
  },
  down: (db) => {
    db.exec('DROP INDEX IF EXISTS idx_ma_sync_jobs_created_at');
    db.exec('DROP INDEX IF EXISTS idx_ma_sync_jobs_next_retry_at');
    db.exec('DROP INDEX IF EXISTS idx_ma_sync_jobs_status');
    db.exec('DROP INDEX IF EXISTS idx_ma_sync_jobs_provider_id');
    db.exec('DROP INDEX IF EXISTS idx_ma_sync_jobs_job_type');
    db.exec('DROP TABLE IF EXISTS ma_sync_jobs');

    console.log('[Migration v31] Rolled back: Removed ma_sync_jobs table');
  },
};

/**
 * Wave 11 / Batch 11A — RBAC and Audit Log:
 *   - permissions, roles, role_permissions, user_roles tables for RBAC
 *   - audit_logs table for compliance tracking
 *   - Support for permissioned actions and audit trails
 */
const migration_v32: IMigration = {
  version: 32,
  name: 'Add RBAC and audit log tables',
  up: (db) => {
    // Permissions table
    db.exec(`CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource_type, action)');

    // Roles table
    db.exec(`CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system)');

    // Role-Permission mapping table
    db.exec(`CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id)');

    // User-Role mapping table
    db.exec(`CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      assigned_at INTEGER NOT NULL,
      assigned_by TEXT,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id)');

    // Audit logs table
    db.exec(`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      user_id TEXT,
      username TEXT,
      action TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      description TEXT NOT NULL,
      metadata TEXT,
      ip_address TEXT,
      user_agent TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON audit_logs(action, timestamp DESC)');

    console.log('[Migration v32] Added RBAC and audit log tables');
  },
  down: (db) => {
    // Drop audit log indexes and table
    db.exec('DROP INDEX IF EXISTS idx_audit_logs_action_timestamp');
    db.exec('DROP INDEX IF EXISTS idx_audit_logs_user_timestamp');
    db.exec('DROP INDEX IF EXISTS idx_audit_logs_resource');
    db.exec('DROP INDEX IF EXISTS idx_audit_logs_severity');
    db.exec('DROP INDEX IF EXISTS idx_audit_logs_category');
    db.exec('DROP INDEX IF EXISTS idx_audit_logs_action');
    db.exec('DROP INDEX IF EXISTS idx_audit_logs_user');
    db.exec('DROP INDEX IF EXISTS idx_audit_logs_timestamp');
    db.exec('DROP TABLE IF EXISTS audit_logs');

    // Drop user_roles indexes and table
    db.exec('DROP INDEX IF EXISTS idx_user_roles_role');
    db.exec('DROP INDEX IF EXISTS idx_user_roles_user');
    db.exec('DROP TABLE IF EXISTS user_roles');

    // Drop role_permissions indexes and table
    db.exec('DROP INDEX IF EXISTS idx_role_permissions_permission');
    db.exec('DROP INDEX IF EXISTS idx_role_permissions_role');
    db.exec('DROP TABLE IF EXISTS role_permissions');

    // Drop roles indexes and table
    db.exec('DROP INDEX IF EXISTS idx_roles_is_system');
    db.exec('DROP INDEX IF EXISTS idx_roles_name');
    db.exec('DROP TABLE IF EXISTS roles');

    // Drop permissions indexes and table
    db.exec('DROP INDEX IF EXISTS idx_permissions_resource');
    db.exec('DROP INDEX IF EXISTS idx_permissions_name');
    db.exec('DROP TABLE IF EXISTS permissions');

    console.log('[Migration v32] Rolled back: Removed RBAC and audit log tables');
  },
};

/**
 * Migration v32 -> v33: Add GDPR and VDR compliance workflow tables
 * Tables for GDPR export requests, erasure requests, retention policies,
 * VDR access grants, compliance workflows, and destructive action reviews.
 */
const migration_v33: IMigration = {
  version: 33,
  name: 'Add GDPR and VDR compliance workflow tables',
  up: (db) => {
    // GDPR export requests table
    db.exec(`CREATE TABLE IF NOT EXISTS gdpr_export_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      request_type TEXT NOT NULL CHECK(request_type IN ('full_export', 'conversation_history', 'audit_trail')),
      requested_at INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending_review', 'awaiting_confirmation', 'in_progress', 'completed', 'cancelled', 'failed')),
      scope_conversations INTEGER NOT NULL DEFAULT 0,
      scope_audit_logs INTEGER NOT NULL DEFAULT 0,
      scope_settings INTEGER NOT NULL DEFAULT 0,
      scope_extensions INTEGER NOT NULL DEFAULT 0,
      date_range_start INTEGER,
      date_range_end INTEGER,
      reviewed_by TEXT,
      reviewed_at INTEGER,
      completed_at INTEGER,
      download_url TEXT,
      expires_at INTEGER,
      metadata TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_gdpr_export_user ON gdpr_export_requests(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_gdpr_export_status ON gdpr_export_requests(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_gdpr_export_requested_at ON gdpr_export_requests(requested_at)');

    // GDPR erasure requests table
    db.exec(`CREATE TABLE IF NOT EXISTS gdpr_erasure_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      request_type TEXT NOT NULL CHECK(request_type IN ('full_erasure', 'selective_erasure')),
      requested_at INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending_review', 'awaiting_confirmation', 'in_progress', 'completed', 'cancelled', 'failed')),
      scope_conversations TEXT,
      scope_messages TEXT,
      scope_user_data INTEGER NOT NULL DEFAULT 0,
      scope_audit_logs INTEGER NOT NULL DEFAULT 0,
      reviewed_by TEXT,
      reviewed_at INTEGER,
      executed_at INTEGER,
      completed_at INTEGER,
      dry_run_performed INTEGER NOT NULL DEFAULT 0,
      dry_run_results TEXT,
      actual_results TEXT,
      metadata TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_gdpr_erasure_user ON gdpr_erasure_requests(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_gdpr_erasure_status ON gdpr_erasure_requests(status)');

    // Retention policies table
    db.exec(`CREATE TABLE IF NOT EXISTS retention_policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      applies_to TEXT NOT NULL,
      retention_days INTEGER NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('archive', 'delete', 'anonymize')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_retention_active ON retention_policies(is_active)');

    // Retention enforcement jobs table
    db.exec(`CREATE TABLE IF NOT EXISTS retention_enforcement_jobs (
      id TEXT PRIMARY KEY,
      policy_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
      items_scanned INTEGER NOT NULL DEFAULT 0,
      items_processed INTEGER NOT NULL DEFAULT 0,
      items_skipped INTEGER NOT NULL DEFAULT 0,
      errors TEXT,
      FOREIGN KEY (policy_id) REFERENCES retention_policies(id) ON DELETE CASCADE
    )`);

    // VDR access grants table
    db.exec(`CREATE TABLE IF NOT EXISTS vdr_access_grants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      deal_id TEXT,
      document_ids TEXT NOT NULL,
      granted_at INTEGER NOT NULL,
      expires_at INTEGER,
      granted_by TEXT NOT NULL,
      access_level TEXT NOT NULL CHECK(access_level IN ('view', 'download', 'annotate', 'admin')),
      status TEXT NOT NULL CHECK(status IN ('active', 'expired', 'revoked')),
      revoked_at INTEGER,
      revoked_by TEXT,
      metadata TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (deal_id) REFERENCES ma_deals(id) ON DELETE CASCADE
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_vdr_grant_user ON vdr_access_grants(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_vdr_grant_deal ON vdr_access_grants(deal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_vdr_grant_status ON vdr_access_grants(status)');

    // VDR access requests table
    db.exec(`CREATE TABLE IF NOT EXISTS vdr_access_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      requested_at INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending_review', 'awaiting_confirmation', 'in_progress', 'completed', 'cancelled', 'failed')),
      purpose TEXT NOT NULL,
      requested_documents TEXT NOT NULL,
      requested_access_level TEXT NOT NULL CHECK(requested_access_level IN ('view', 'download', 'annotate', 'admin')),
      reviewed_by TEXT,
      reviewed_at INTEGER,
      approved INTEGER,
      rejection_reason TEXT,
      resulting_grant_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (resulting_grant_id) REFERENCES vdr_access_grants(id) ON DELETE SET NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_vdr_request_user ON vdr_access_requests(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_vdr_request_status ON vdr_access_requests(status)');

    // Compliance workflows table
    db.exec(`CREATE TABLE IF NOT EXISTS compliance_workflows (
      id TEXT PRIMARY KEY,
      workflow_type TEXT NOT NULL CHECK(workflow_type IN ('data_export', 'data_erasure', 'retention_enforcement', 'vdr_provision', 'vdr_revoke')),
      action_type TEXT NOT NULL CHECK(action_type IN ('export_user_data', 'export_conversation_history', 'export_audit_logs', 'erase_user_data', 'erase_conversation', 'enforce_retention_policy', 'create_vdr_access', 'revoke_vdr_access', 'archive_expired_data')),
      status TEXT NOT NULL CHECK(status IN ('pending_review', 'awaiting_confirmation', 'in_progress', 'completed', 'cancelled', 'failed')),
      initiated_by TEXT NOT NULL,
      initiated_at INTEGER NOT NULL,
      review_required INTEGER NOT NULL DEFAULT 1,
      reviewed_by TEXT,
      reviewed_at INTEGER,
      approved INTEGER,
      approval_notes TEXT,
      executed_at INTEGER,
      completed_at INTEGER,
      target_user_id TEXT,
      metadata TEXT,
      error_message TEXT,
      FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_compliance_workflow_type ON compliance_workflows(workflow_type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_compliance_workflow_status ON compliance_workflows(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_compliance_workflow_initiated ON compliance_workflows(initiated_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_compliance_workflow_target ON compliance_workflows(target_user_id)');

    // Destructive action reviews table
    db.exec(`CREATE TABLE IF NOT EXISTS destructive_action_reviews (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL UNIQUE,
      action_type TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      requested_at INTEGER NOT NULL,
      requires_dual_approval INTEGER NOT NULL DEFAULT 0,
      primary_reviewer TEXT,
      primary_approved_at INTEGER,
      secondary_reviewer TEXT,
      secondary_approved_at INTEGER,
      rejection_reason TEXT,
      dry_run_results TEXT,
      approved INTEGER NOT NULL DEFAULT 0,
      executed INTEGER NOT NULL DEFAULT 0,
      executed_at INTEGER,
      FOREIGN KEY (workflow_id) REFERENCES compliance_workflows(id) ON DELETE CASCADE,
      FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (primary_reviewer) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (secondary_reviewer) REFERENCES users(id) ON DELETE SET NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_destructive_review_workflow ON destructive_action_reviews(workflow_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_destructive_review_approved ON destructive_action_reviews(approved)');

    console.log('[Migration v33] Added GDPR and VDR compliance workflow tables');
  },
  down: (db) => {
    db.exec('DROP INDEX IF EXISTS idx_destructive_review_approved');
    db.exec('DROP INDEX IF EXISTS idx_destructive_review_workflow');
    db.exec('DROP TABLE IF EXISTS destructive_action_reviews');

    db.exec('DROP INDEX IF EXISTS idx_compliance_workflow_target');
    db.exec('DROP INDEX IF EXISTS idx_compliance_workflow_initiated');
    db.exec('DROP INDEX IF EXISTS idx_compliance_workflow_status');
    db.exec('DROP INDEX IF EXISTS idx_compliance_workflow_type');
    db.exec('DROP TABLE IF EXISTS compliance_workflows');

    db.exec('DROP INDEX IF EXISTS idx_vdr_request_status');
    db.exec('DROP INDEX IF EXISTS idx_vdr_request_user');
    db.exec('DROP TABLE IF EXISTS vdr_access_requests');

    db.exec('DROP INDEX IF EXISTS idx_vdr_grant_status');
    db.exec('DROP INDEX IF EXISTS idx_vdr_grant_deal');
    db.exec('DROP INDEX IF EXISTS idx_vdr_grant_user');
    db.exec('DROP TABLE IF EXISTS vdr_access_grants');

    db.exec('DROP TABLE IF EXISTS retention_enforcement_jobs');

    db.exec('DROP INDEX IF EXISTS idx_retention_active');
    db.exec('DROP TABLE IF EXISTS retention_policies');

    db.exec('DROP INDEX IF EXISTS idx_gdpr_erasure_status');
    db.exec('DROP INDEX IF EXISTS idx_gdpr_erasure_user');
    db.exec('DROP TABLE IF EXISTS gdpr_erasure_requests');

    db.exec('DROP INDEX IF EXISTS idx_gdpr_export_requested_at');
    db.exec('DROP INDEX IF EXISTS idx_gdpr_export_status');
    db.exec('DROP INDEX IF EXISTS idx_gdpr_export_user');
    db.exec('DROP TABLE IF EXISTS gdpr_export_requests');

    console.log('[Migration v33] Rolled back: Removed GDPR and VDR compliance workflow tables');
  },
};

/**
 * All migrations in order
 */
// prettier-ignore
export const ALL_MIGRATIONS: IMigration[] = [
  migration_v1, migration_v2, migration_v3, migration_v4, migration_v5, migration_v6,
  migration_v7, migration_v8, migration_v9, migration_v10, migration_v11, migration_v12,
  migration_v13, migration_v14, migration_v15, migration_v16, migration_v17, migration_v18,
  migration_v19, migration_v20, migration_v21, migration_v22, migration_v23, migration_v24,
  migration_v25, migration_v26, migration_v27, migration_v28, migration_v29, migration_v30,
  migration_v31, migration_v32, migration_v33,
];

/**
 * Get migrations needed to upgrade from one version to another
 */
export function getMigrationsToRun(fromVersion: number, toVersion: number): IMigration[] {
  return ALL_MIGRATIONS.filter((m) => m.version > fromVersion && m.version <= toVersion).toSorted(
    (a, b) => a.version - b.version
  );
}

/**
 * Get migrations needed to downgrade from one version to another
 */
export function getMigrationsToRollback(fromVersion: number, toVersion: number): IMigration[] {
  return ALL_MIGRATIONS.filter((m) => m.version > toVersion && m.version <= fromVersion).toSorted(
    (a, b) => b.version - a.version
  );
}

/**
 * Run migrations in a transaction
 */
export function runMigrations(db: ISqliteDriver, fromVersion: number, toVersion: number): void {
  if (fromVersion === toVersion) {
    console.log('[Migrations] Already at target version');
    return;
  }

  if (fromVersion > toVersion) {
    throw new Error(`[Migrations] Downgrade not supported in production. Use rollbackMigration() for testing only.`);
  }

  const migrations = getMigrationsToRun(fromVersion, toVersion);

  if (migrations.length === 0) {
    console.log(`[Migrations] No migrations needed from v${fromVersion} to v${toVersion}`);
    return;
  }

  console.log(`[Migrations] Running ${migrations.length} migrations from v${fromVersion} to v${toVersion}`);

  // Disable foreign keys BEFORE the transaction to allow table recreation
  // (DROP TABLE + CREATE TABLE). PRAGMA foreign_keys cannot be changed inside
  // a transaction — it is silently ignored.
  // See: https://www.sqlite.org/lang_altertable.html#otheralter
  db.pragma('foreign_keys = OFF');

  // Run all migrations in a single transaction
  const runAll = db.transaction(() => {
    for (const migration of migrations) {
      try {
        console.log(`[Migrations] Running migration v${migration.version}: ${migration.name}`);
        migration.up(db);

        console.log(`[Migrations] ✓ Migration v${migration.version} completed`);
      } catch (error) {
        console.error(`[Migrations] ✗ Migration v${migration.version} failed:`, error);
        throw error; // Transaction will rollback
      }
    }

    // Verify foreign key integrity after all migrations
    const fkViolations = db.pragma('foreign_key_check') as unknown[];
    if (fkViolations.length > 0) {
      console.error('[Migrations] Foreign key violations detected:', fkViolations);
      throw new Error(`[Migrations] Foreign key check failed: ${fkViolations.length} violation(s)`);
    }
  });

  try {
    runAll();
    console.log(`[Migrations] All migrations completed successfully`);
  } catch (error) {
    console.error('[Migrations] Migration failed, all changes rolled back:', error);
    throw error;
  } finally {
    // Re-enable foreign keys regardless of success or failure
    db.pragma('foreign_keys = ON');
  }
}

/**
 * Rollback migrations (for testing/emergency use)
 * WARNING: This can cause data loss!
 */
export function rollbackMigrations(db: ISqliteDriver, fromVersion: number, toVersion: number): void {
  if (fromVersion <= toVersion) {
    throw new Error('[Migrations] Cannot rollback to a higher or equal version');
  }

  const migrations = getMigrationsToRollback(fromVersion, toVersion);

  if (migrations.length === 0) {
    console.log(`[Migrations] No rollback needed from v${fromVersion} to v${toVersion}`);
    return;
  }

  console.log(`[Migrations] Rolling back ${migrations.length} migrations from v${fromVersion} to v${toVersion}`);
  console.warn('[Migrations] WARNING: This may cause data loss!');

  // Disable foreign keys BEFORE the transaction (same reason as runMigrations)
  db.pragma('foreign_keys = OFF');

  // Run all rollbacks in a single transaction
  const rollbackAll = db.transaction(() => {
    for (const migration of migrations) {
      try {
        console.log(`[Migrations] Rolling back migration v${migration.version}: ${migration.name}`);
        migration.down(db);

        console.log(`[Migrations] ✓ Rollback v${migration.version} completed`);
      } catch (error) {
        console.error(`[Migrations] ✗ Rollback v${migration.version} failed:`, error);
        throw error; // Transaction will rollback
      }
    }

    // Verify foreign key integrity after rollback
    const fkViolations = db.pragma('foreign_key_check') as unknown[];
    if (fkViolations.length > 0) {
      console.error('[Migrations] Foreign key violations detected after rollback:', fkViolations);
      throw new Error(`[Migrations] Foreign key check failed: ${fkViolations.length} violation(s)`);
    }
  });

  try {
    rollbackAll();
    console.log(`[Migrations] All rollbacks completed successfully`);
  } catch (error) {
    console.error('[Migrations] Rollback failed:', error);
    throw error;
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

/**
 * Get migration history
 * Now simplified - just returns the current version
 */
export function getMigrationHistory(db: ISqliteDriver): Array<{ version: number; name: string; timestamp: number }> {
  const currentVersion = db.pragma('user_version', { simple: true }) as number;

  // Return a simple array with just the current version
  return [
    {
      version: currentVersion,
      name: `Current schema version`,
      timestamp: Date.now(),
    },
  ];
}

/**
 * Check if a specific migration has been applied
 * Now simplified - checks if current version >= target version
 */
export function isMigrationApplied(db: ISqliteDriver, version: number): boolean {
  const currentVersion = db.pragma('user_version', { simple: true }) as number;
  return currentVersion >= version;
}
