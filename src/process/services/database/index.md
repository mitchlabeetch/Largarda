# src/process/services/database/ - Database Service

## Overview

Database service layer using SQLite (better-sqlite3) for data persistence. Handles conversations, channels, messages, and workspace snapshots with migrations and repository pattern.

## Directory Structure

### Core Files

- **index.ts** (49KB) - Database service main entry point
  - Database initialization
  - Connection management
  - Service orchestration
  - Transaction handling

- **README.md** (13KB) - Database documentation
  - Schema documentation
  - Usage examples
  - Migration guide
  - Best practices

- **schema.ts** (5.6KB) - Database schema definitions
  - Table definitions
  - Indexes
  - Constraints
  - Relationships

- **migrations.ts** (68KB) - Database migrations
  - Schema evolution
  - Data migrations
  - Version management
  - Rollback support

- **types.ts** (6KB) - Database-specific types
  - Entity types
  - Query result types
  - Repository interfaces
  - Type utilities

### Repositories

- **IConversationRepository.ts** (1.7KB) - Conversation repository interface
- **SqliteConversationRepository.ts** (3.3KB) - SQLite conversation implementation
- **IChannelRepository.ts** (544B) - Channel repository interface
- **SqliteChannelRepository.ts** (2KB) - SQLite channel implementation
- **repositories/** (6 items) - Additional repository implementations

### Drivers

- **drivers/** (5 items) - Database drivers
  - better-sqlite3 driver
  - Connection pooling
  - Driver adapters
  - Platform-specific configurations

### Utilities

- **StreamingMessageBuffer.ts** (4.8KB) - Streaming message buffer
  - Message buffering for streaming responses
  - Chunk aggregation
  - Flush logic
  - Memory management

- **export.ts** (840B) - Module exports

## Database Schema

### Core Tables

- **conversations** - Conversation metadata and state
- **messages** - Individual messages with content
- **channels** - Communication channel configurations
- **workspaces** - Workspace snapshots and state
- **attachments** - File attachments and references

### Relationships

- Conversations → Messages (one-to-many)
- Conversations → Channels (many-to-one)
- Messages → Attachments (one-to-many)
- Workspaces → Conversations (one-to-many)

## Repository Pattern

### Interfaces

Repository interfaces define contracts:

- **IConversationRepository** - CRUD operations for conversations
- **IChannelRepository** - CRUD operations for channels
- Type-safe method signatures
- Clear separation of concerns

### Implementations

SQLite implementations provide:

- SQL query execution
- Parameter binding
- Transaction management
- Error handling

## Key Features

### Migrations

Comprehensive migration system:

- Versioned schema changes
- Up and down migrations
- Data preservation
- Automatic migration on startup

### Transactions

ACID transaction support:

- Begin/commit/rollback
- Nested transactions
- Savepoints
- Automatic retry on conflicts

### Streaming Support

Efficient streaming message handling:

- StreamingMessageBuffer for chunked data
- Memory-efficient buffering
- Automatic flush on completion
- Progress tracking

### Performance Optimizations

- Prepared statements
- Indexed queries
- Connection pooling
- Batch operations

## Usage Patterns

### Database Initialization

```typescript
import { DatabaseService } from '@/process/services/database';

const db = new DatabaseService({
  path: './data/largo.db',
});
await db.initialize();
```

### Repository Usage

```typescript
const conversationRepo = db.getConversationRepository();
const conversation = await conversationRepo.findById(id);
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  await tx.conversations.create(data);
  await tx.messages.create(messageData);
});
```

## Migration System

### Migration Files

Each migration includes:

- Version number
- Up SQL
- Down SQL
- Data transformation logic

### Running Migrations

```typescript
await db.migrate();
// or
await db.migrateTo(version);
```

## Related Documentation

- [README.md](README.md) - Detailed database documentation
- [schema.ts](schema.ts) - Schema definitions
- [migrations.ts](migrations.ts) - Migration history
