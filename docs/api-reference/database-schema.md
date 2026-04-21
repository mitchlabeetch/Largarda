# Database Schema Reference

## Overview

Largo uses SQLite (better-sqlite3) for data persistence. This document describes the database schema, tables, indexes, and relationships.

## Schema Version

Current version: 1 (tracked in `schema_migrations` table)

## Tables

### `conversations`

Stores conversation metadata.

| Column      | Type              | Description                      |
| ----------- | ----------------- | -------------------------------- |
| `id`        | TEXT PRIMARY KEY  | Unique conversation ID           |
| `title`     | TEXT NOT NULL     | Conversation title               |
| `createdAt` | INTEGER NOT NULL  | Creation timestamp (Unix ms)     |
| `updatedAt` | INTEGER NOT NULL  | Last update timestamp (Unix ms)  |
| `settings`  | TEXT              | JSON settings                    |
| `agentId`   | TEXT              | Associated agent ID              |
| `archived`  | INTEGER (boolean) | Whether conversation is archived |

**Indexes:**

- `idx_conversations_createdAt` on `createdAt DESC`
- `idx_conversations_agentId` on `agentId`

---

### `messages`

Stores individual messages in conversations.

| Column           | Type             | Description                          |
| ---------------- | ---------------- | ------------------------------------ |
| `id`             | TEXT PRIMARY KEY | Unique message ID                    |
| `conversationId` | TEXT NOT NULL    | Foreign key to conversations         |
| `role`           | TEXT NOT NULL    | Message role (user/assistant/system) |
| `content`        | TEXT NOT NULL    | Message content                      |
| `createdAt`      | INTEGER NOT NULL | Creation timestamp (Unix ms)         |
| `metadata`       | TEXT             | JSON metadata                        |
| `attachments`    | TEXT             | JSON array of attachment IDs         |

**Indexes:**

- `idx_messages_conversationId` on `conversationId`
- `idx_messages_createdAt` on `createdAt DESC`
- `idx_messages_conversationId_createdAt` on `(conversationId, createdAt)`

**Foreign Keys:**

- `conversationId` → `conversations(id)` ON DELETE CASCADE

---

### `channels`

Stores communication channel configurations.

| Column      | Type              | Description                              |
| ----------- | ----------------- | ---------------------------------------- |
| `id`        | TEXT PRIMARY KEY  | Unique channel ID                        |
| `type`      | TEXT NOT NULL     | Channel type (feishu/wecom/telegram/etc) |
| `name`      | TEXT NOT NULL     | Channel name                             |
| `config`    | TEXT NOT NULL     | JSON configuration                       |
| `enabled`   | INTEGER (boolean) | Whether channel is enabled               |
| `createdAt` | INTEGER NOT NULL  | Creation timestamp                       |
| `updatedAt` | INTEGER NOT NULL  | Last update timestamp                    |

---

### `extensions`

Stores installed extensions.

| Column        | Type              | Description                  |
| ------------- | ----------------- | ---------------------------- |
| `id`          | TEXT PRIMARY KEY  | Extension ID (name)          |
| `version`     | TEXT NOT NULL     | Extension version            |
| `manifest`    | TEXT NOT NULL     | JSON manifest                |
| `enabled`     | INTEGER (boolean) | Whether extension is enabled |
| `installedAt` | INTEGER NOT NULL  | Installation timestamp       |

---

### `cron_jobs`

Stores scheduled cron jobs.

| Column           | Type              | Description              |
| ---------------- | ----------------- | ------------------------ |
| `id`             | TEXT PRIMARY KEY  | Job ID                   |
| `name`           | TEXT NOT NULL     | Job name                 |
| `cronExpression` | TEXT NOT NULL     | Cron expression          |
| `handler`        | TEXT NOT NULL     | Handler function name    |
| `enabled`        | INTEGER (boolean) | Whether job is enabled   |
| `lastRunAt`      | INTEGER           | Last execution timestamp |
| `nextRunAt`      | INTEGER           | Next scheduled execution |
| `createdAt`      | INTEGER NOT NULL  | Creation timestamp       |

**Indexes:**

- `idx_cron_jobs_nextRunAt` on `nextRunAt`

---

### `cron_job_executions`

Stores cron job execution history.

| Column        | Type             | Description                       |
| ------------- | ---------------- | --------------------------------- |
| `id`          | TEXT PRIMARY KEY | Execution ID                      |
| `jobId`       | TEXT NOT NULL    | Foreign key to cron_jobs          |
| `status`      | TEXT NOT NULL    | Execution status (success/failed) |
| `startedAt`   | INTEGER NOT NULL | Start timestamp                   |
| `completedAt` | INTEGER          | Completion timestamp              |
| `error`       | TEXT             | Error message if failed           |
| `output`      | TEXT             | Execution output                  |

**Indexes:**

- `idx_cron_executions_jobId` on `jobId`
- `idx_cron_executions_startedAt` on `startedAt DESC`

**Foreign Keys:**

- `jobId` → `cron_jobs(id)` ON DELETE CASCADE

---

### `workspaces`

Stores workspace snapshots.

| Column      | Type             | Description           |
| ----------- | ---------------- | --------------------- |
| `id`        | TEXT PRIMARY KEY | Workspace ID          |
| `name`      | TEXT NOT NULL    | Workspace name        |
| `path`      | TEXT NOT NULL    | Workspace path        |
| `snapshot`  | TEXT NOT NULL    | JSON snapshot data    |
| `createdAt` | INTEGER NOT NULL | Creation timestamp    |
| `updatedAt` | INTEGER NOT NULL | Last update timestamp |

---

### `attachments`

Stores file attachment metadata.

| Column      | Type             | Description           |
| ----------- | ---------------- | --------------------- |
| `id`        | TEXT PRIMARY KEY | Attachment ID         |
| `messageId` | TEXT             | Associated message ID |
| `filename`  | TEXT NOT NULL    | Original filename     |
| `path`      | TEXT NOT NULL    | File path             |
| `mimeType`  | TEXT             | MIME type             |
| `size`      | INTEGER          | File size in bytes    |
| `createdAt` | INTEGER NOT NULL | Creation timestamp    |

**Indexes:**

- `idx_attachments_messageId` on `messageId`

**Foreign Keys:**

- `messageId` → `messages(id)` ON DELETE CASCADE

---

### `schema_migrations`

Tracks database schema migrations.

| Column      | Type                | Description           |
| ----------- | ------------------- | --------------------- |
| `version`   | INTEGER PRIMARY KEY | Migration version     |
| `appliedAt` | INTEGER NOT NULL    | Application timestamp |

---

### `settings`

Stores application settings.

| Column      | Type             | Description           |
| ----------- | ---------------- | --------------------- |
| `key`       | TEXT PRIMARY KEY | Setting key           |
| `value`     | TEXT NOT NULL    | Setting value (JSON)  |
| `updatedAt` | INTEGER NOT NULL | Last update timestamp |

---

## Relationships

```
conversations (1) ----< (N) messages
                           |
                           v
                      attachments (0..N)

cron_jobs (1) ----< (N) cron_job_executions
```

## Migration System

Migrations are defined in `src/process/services/database/migrations.ts`.

### Example Migration

```typescript
{
  version: 2,
  up: (db: Database) => {
    db.exec(`
      ALTER TABLE conversations ADD COLUMN tags TEXT;
      CREATE INDEX idx_conversations_tags ON conversations(tags);
    `)
  },
  down: (db: Database) => {
    db.exec(`
      DROP INDEX IF EXISTS idx_conversations_tags;
      ALTER TABLE conversations DROP COLUMN tags;
    `)
  }
}
```

## Query Patterns

### Get conversation with messages

```sql
SELECT c.*, m.id as messageId, m.role, m.content, m.createdAt
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversationId
WHERE c.id = ?
ORDER BY m.createdAt ASC
```

### Search conversations

```sql
SELECT * FROM conversations
WHERE title LIKE ?
  AND archived = 0
ORDER BY updatedAt DESC
LIMIT 20
```

### Get pending cron jobs

```sql
SELECT * FROM cron_jobs
WHERE enabled = 1
  AND nextRunAt <= ?
ORDER BY nextRunAt ASC
```

### Get message statistics

```sql
SELECT
  conversationId,
  COUNT(*) as messageCount,
  MAX(createdAt) as lastMessageAt
FROM messages
GROUP BY conversationId
```

## Performance Considerations

### Indexing

- All foreign keys are indexed
- Frequently queried columns are indexed
- Composite indexes for common query patterns

### WAL Mode

Database runs in WAL (Write-Ahead Logging) mode for better concurrency:

```sql
PRAGMA journal_mode = WAL;
```

### Transactions

Always use transactions for multi-step operations:

```typescript
const transaction = db.transaction(() => {
  // Multiple operations
});
transaction();
```

## Backup and Restore

### Backup

```typescript
const backup = db.backup(backupPath);
await backup.step(-1); // Backup entire database
backup.close();
```

### Restore

```typescript
fs.copyFileSync(backupPath, dbPath);
```

## Related Documentation

- [src/process/services/database/](../../src/process/services/database/) - Database service
- [src/process/services/database/README.md](../../src/process/services/database/README.md) - Database documentation
- [docs/data-flows/database-queries.md](../data-flows/database-queries.md) - Query patterns
