# Database Query Patterns

## Overview

Documentation of database query patterns and data flow through the SQLite database service in Largo.

## Architecture

```
┌──────────────┐
│   Renderer   │
│   (Request)  │
└──────┬───────┘
       │ IPC
┌──────▼──────────────────────┐
│   Main Process              │
│   - databaseBridge          │
└──────┬──────────────────────┘
       │ Service call
┌──────▼──────────────────────┐
│   DatabaseService           │
│   - Connection management   │
│   - Transaction handling    │
└──────┬──────────────────────┘
       │ Repository call
┌──────▼──────────────────────┐
│   Repository                │
│   - SQL generation          │
│   - Parameter binding       │
└──────┬──────────────────────┘
       │ SQL query
┌──────▼──────────────────────┐
│   SQLite (better-sqlite3)   │
│   - Query execution         │
│   - Result parsing          │
└──────┬──────────────────────┘
       │ Result
┌──────▼──────────────────────┐
│   Repository                │
│   - Map to entities         │
└──────┬──────────────────────┘
       │ Entities
┌──────▼──────────────────────┐
│   Service                   │
│   - Business logic          │
└──────┬──────────────────────┘
       │ Response
┌──────▼──────────────────────┐
│   Bridge                    │
│   - IPC response            │
└──────┬──────────────────────┘
       │ IPC
┌──────▼──────────────────────┐
│   Renderer                  │
│   (Display)                 │
└─────────────────────────────┘
```

## Repository Pattern

### Interface Definition

```typescript
// src/process/services/database/IConversationRepository.ts
export interface IConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findAll(): Promise<Conversation[]>;
  create(conversation: Conversation): Promise<Conversation>;
  update(id: string, data: Partial<Conversation>): Promise<Conversation>;
  delete(id: string): Promise<void>;
}
```

### SQLite Implementation

```typescript
// src/process/services/database/SqliteConversationRepository.ts
export class SqliteConversationRepository implements IConversationRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Conversation | null> {
    const row = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as ConversationRow | undefined;

    return row ? this.mapToEntity(row) : null;
  }

  async create(conversation: Conversation): Promise<Conversation> {
    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, title, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(conversation.id, conversation.title, conversation.createdAt, conversation.updatedAt);

    return conversation;
  }

  private mapToEntity(row: ConversationRow): Conversation {
    return {
      id: row.id,
      title: row.title,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}
```

## Query Patterns

### Pattern 1: Simple Query

```typescript
// Repository
async findById(id: string): Promise<Conversation | null> {
  const row = this.db.prepare(
    'SELECT * FROM conversations WHERE id = ?'
  ).get(id)

  return row ? this.mapToEntity(row) : null
}
```

### Pattern 2: Query with Join

```typescript
async findWithMessages(conversationId: string): Promise<ConversationWithMessages> {
  const conversation = await this.findById(conversationId)
  if (!conversation) return null

  const messages = this.db.prepare(`
    SELECT * FROM messages
    WHERE conversationId = ?
    ORDER BY createdAt ASC
  `).all(conversationId) as MessageRow[]

  return {
    ...conversation,
    messages: messages.map(m => this.mapMessage(m))
  }
}
```

### Pattern 3: Batch Operations

```typescript
async createMany(messages: Message[]): Promise<void> {
  const stmt = this.db.prepare(`
    INSERT INTO messages (id, conversationId, role, content, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `)

  const transaction = this.db.transaction((msgs) => {
    for (const msg of msgs) {
      stmt.run(msg.id, msg.conversationId, msg.role, msg.content, msg.createdAt)
    }
  })

  transaction(messages)
}
```

### Pattern 4: Pagination

```typescript
async findPaginated(offset: number, limit: number): Promise<Conversation[]> {
  const rows = this.db.prepare(`
    SELECT * FROM conversations
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as ConversationRow[]

  return rows.map(row => this.mapToEntity(row))
}
```

### Pattern 5: Search with LIKE

```typescript
async searchByTitle(query: string): Promise<Conversation[]> {
  const rows = this.db.prepare(`
    SELECT * FROM conversations
    WHERE title LIKE ?
    ORDER BY createdAt DESC
  `).all(`%${query}%`) as ConversationRow[]

  return rows.map(row => this.mapToEntity(row))
}
```

## Transaction Patterns

### Single Transaction

```typescript
async createConversationWithMessages(
  conversation: Conversation,
  messages: Message[]
): Promise<void> {
  const transaction = this.db.transaction(() => {
    // Create conversation
    this.db.prepare(`
      INSERT INTO conversations (id, title, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
    `).run(conversation.id, conversation.title, conversation.createdAt, conversation.updatedAt)

    // Create messages
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversationId, role, content, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `)

    for (const msg of messages) {
      stmt.run(msg.id, msg.conversationId, msg.role, msg.content, msg.createdAt)
    }
  })

  transaction()
}
```

### Transaction with Error Handling

```typescript
async transferData(fromId: string, toId: string): Promise<void> {
  try {
    const transaction = this.db.transaction(() => {
      // Update source
      this.db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?')
        .run(amount, fromId)

      // Update destination
      this.db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')
        .run(amount, toId)
    })

    transaction()
  } catch (error) {
    // Transaction automatically rolled back on error
    throw new Error('Transfer failed: ' + error.message)
  }
}
```

## Performance Optimizations

### Prepared Statements

```typescript
// Bad: Re-prepare on every query
for (const id of ids) {
  const result = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
}

// Good: Prepare once, use many times
const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?');
for (const id of ids) {
  const result = stmt.get(id);
}
```

### Indexes

```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_conversations_createdAt ON conversations(createdAt);
CREATE INDEX idx_messages_conversationId ON messages(conversationId);
CREATE INDEX idx_messages_createdAt ON messages(createdAt);
```

### Batch Operations

```typescript
// Bad: Individual inserts
for (const msg of messages) {
  this.db.prepare('INSERT INTO messages ...').run(...)
}

// Good: Batch insert in transaction
const transaction = this.db.transaction((msgs) => {
  for (const msg of msgs) {
    this.db.prepare('INSERT INTO messages ...').run(...)
  }
})
transaction(messages)
```

## Connection Management

### Database Initialization

```typescript
// src/process/services/database/index.ts
class DatabaseService {
  private db: Database | null = null;

  async initialize(): Promise<void> {
    const dbPath = path.join(app.getPath('userData'), 'largo.db');
    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    // Run migrations
    await this.runMigrations();
  }

  getConnection(): Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
}
```

### Connection Pooling

SQLite doesn't need connection pooling like other databases, but for concurrent access:

```typescript
// WAL mode allows concurrent readers
this.db.pragma('journal_mode = WAL');
this.db.pragma('synchronous = NORMAL');
```

## Migration System

### Migration File

```typescript
// src/process/services/database/migrations.ts
export const migrations = [
  {
    version: 1,
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        )
      `);
    },
    down: (db: Database) => {
      db.exec('DROP TABLE IF EXISTS conversations');
    },
  },
  {
    version: 2,
    up: (db: Database) => {
      db.exec(`
        ALTER TABLE conversations ADD COLUMN settings TEXT
      `);
    },
    down: (db: Database) => {
      db.exec('ALTER TABLE conversations DROP COLUMN settings');
    },
  },
];
```

### Running Migrations

```typescript
async runMigrations(): Promise<void> {
  const currentVersion = this.db.prepare(
    'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1'
  ).get() as { version: number } | undefined

  const targetVersion = currentVersion?.version || 0

  for (const migration of migrations) {
    if (migration.version > targetVersion) {
      migration.up(this.db)
      this.db.prepare(
        'INSERT INTO schema_migrations (version) VALUES (?)'
      ).run(migration.version)
    }
  }
}
```

## Related Documentation

- [src/process/services/database/](../../src/process/services/database/) - Database service
- [src/process/services/database/README.md](../../src/process/services/database/README.md) - Database documentation
- [docs/data-flows/ipc-communication.md](./ipc-communication.md) - IPC patterns
