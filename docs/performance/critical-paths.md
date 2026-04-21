# Performance Critical Paths

## Overview

Performance-critical code paths in Largo that require special attention for optimization. These paths directly impact user experience and application responsiveness.

## Streaming Message Handling

### Path Description

AI responses are streamed token-by-token from the provider to the renderer for real-time display.

### Critical Components

- **StreamingMessageBuffer** (`src/common/chat/streaming/`) - Buffers streaming chunks
- **IPC Bridge** (`src/process/bridge/conversationBridge.ts`) - Forwards streaming data
- **Message Renderer** (`src/renderer/components/chat/`) - Renders streaming tokens

### Performance Considerations

- **Chunk size**: Too small = excessive IPC overhead, too large = delayed updates
- **Buffer management**: Prevent memory buildup during long streams
- **UI updates**: Throttle DOM updates to avoid blocking main thread
- **Cancellation**: Proper cleanup when user cancels streaming

### Optimization Strategies

```typescript
// Optimal chunk size (balance latency vs overhead)
const CHUNK_SIZE = 50; // tokens

// Throttle UI updates (60fps target)
const UPDATE_INTERVAL = 16; // ms

// Use requestAnimationFrame for smooth rendering
requestAnimationFrame(() => {
  updateMessageDisplay(chunk);
});
```

### Bottlenecks

1. **IPC serialization** - Large message objects serialize slowly
2. **DOM manipulation** - Frequent re-renders cause layout thrashing
3. **Memory pressure** - Long conversations accumulate buffered chunks

### Monitoring

- Track time-to-first-token (TTF)
- Measure tokens-per-second throughput
- Monitor memory usage during streaming
- Profile IPC call frequency

---

## Large Document Processing

### Path Description

Processing large documents (PDFs, Word, etc.) for AI context and preview generation.

### Critical Components

- **ConversionService** (`src/process/services/conversionService.ts`) - Document conversion
- **Worker Processes** (`src/process/worker/`) - CPU-intensive processing
- **Preview Generation** (`src/process/services/previewHistoryService.ts`) - Preview creation

### Performance Considerations

- **File size**: Large files take longer to convert
- **CPU usage**: Conversion is CPU-intensive
- **Memory**: Large documents consume significant memory
- **Blocking**: Main process must not block during conversion

### Optimization Strategies

```typescript
// Use worker processes for CPU-intensive tasks
const worker = fork('./src/process/worker/conversion');
worker.send({ filePath, options });

// Stream processing for large files
const stream = fs.createReadStream(filePath);
stream.on('data', (chunk) => processChunk(chunk));

// Progress reporting
worker.on('progress', (percent) => {
  updateUI(percent);
});
```

### Bottlenecks

1. **Single-threaded conversion** - Some conversion libraries are single-threaded
2. **Memory spikes** - Loading entire document into memory
3. **I/O blocking** - Synchronous file operations
4. **Preview generation** - Image generation is slow

### Monitoring

- Track conversion time by file size
- Monitor CPU usage during conversion
- Measure memory peaks
- Profile I/O operations

---

## Database Query Optimization

### Path Description

Database operations for conversations, messages, settings, and other persistent data.

### Critical Components

- **Database Service** (`src/process/services/database/`) - SQLite operations
- **Conversation Repository** - Conversation CRUD operations
- **Message Repository** - Message history queries

### Performance Considerations

- **Query complexity**: Complex joins and subqueries are slow
- **Index usage**: Missing indexes cause full table scans
- **Transaction overhead**: Transactions add overhead
- **Connection pool**: SQLite doesn't pool, but connection management matters

### Optimization Strategies

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_messages_conversationId_createdAt
ON messages(conversationId, createdAt DESC);

-- Use prepared statements
const stmt = db.prepare('SELECT * FROM messages WHERE conversationId = ?');
const messages = stmt.all(conversationId);

-- Use transactions for bulk operations
db.transaction(() => {
  for (const msg of messages) {
    db.insert(msg)
  }
})()
```

### Bottlenecks

1. **Missing indexes** - Full table scans on large tables
2. **N+1 queries** - Querying related data one-by-one
3. **Large result sets** - Fetching too much data
4. **Synchronous operations** - Blocking the event loop

### Monitoring

- Track query execution time
- Monitor database file size
- Profile slow queries
- Check index usage statistics

---

## Agent Orchestration

### Path Description

Coordinating multiple agents in team mode for complex tasks.

### Critical Components

- **Team Service** (`src/process/team/`) - Team management
- **Agent Communication** - Message passing between agents
- **Workflow Engine** - Task orchestration and scheduling

### Performance Considerations

- **Agent count**: More agents = more coordination overhead
- **Message passing**: Inter-agent communication adds latency
- **Parallel execution**: Parallel tasks compete for resources
- **State management**: Tracking agent state is expensive

### Optimization Strategies

```typescript
// Parallel execution for independent tasks
const results = await Promise.all([agentA.execute(taskA), agentB.execute(taskB), agentC.execute(taskC)]);

// Batch message passing
const messages = [
  { to: agentA, content: '...' },
  { to: agentB, content: '...' },
];
await teamService.broadcast(messages);

// Cache agent responses
const cache = new Map();
const cached = cache.get(taskId);
if (cached) return cached;
```

### Bottlenecks

1. **Sequential execution** - Waiting for one agent before starting next
2. **Message serialization** - Large messages serialize slowly
3. **Resource contention** - Agents compete for CPU/API quotas
4. **State synchronization** - Keeping agent states consistent

### Monitoring

- Track agent execution time
- Measure inter-agent communication latency
- Monitor API quota usage
- Profile resource contention

---

## Extension Loading

### Path Description

Loading and initializing extensions at application startup.

### Critical Components

- **Extension Lifecycle** (`src/process/extensions/lifecycle/`) - Extension management
- **Sandbox** (`src/process/extensions/sandbox/`) - Extension isolation
- **Resolver** (`src/process/extensions/resolvers/`) - Dependency resolution

### Performance Considerations

- **Extension count**: More extensions = slower startup
- **Dependency resolution**: Resolving dependencies is expensive
- **Sandbox overhead**: Sandboxing adds initialization cost
- **Manifest validation**: Parsing and validating manifests

### Optimization Strategies

```typescript
// Lazy load extensions
const extension = await loadExtension(extensionId);

// Cache resolved dependencies
const dependencyCache = new Map();

// Parallel extension loading
await Promise.all(extensions.map(loadExtension));

// Validate manifests during build, not runtime
```

### Bottlenecks

1. **Synchronous loading** - Blocking startup on extension load
2. **Dependency resolution** - Recursive dependency checks
3. **Manifest parsing** - JSON parsing for each extension
4. **Sandbox initialization** - Creating isolated contexts

### Monitoring

- Track extension loading time
- Measure startup time with different extension counts
- Profile dependency resolution
- Monitor sandbox initialization cost

---

## UI Rendering

### Path Description

Rendering the React UI, especially for complex components like chat and settings.

### Critical Components

- **React Components** (`src/renderer/components/`) - UI components
- **Virtual Scrolling** - Rendering large lists efficiently
- **Markdown Rendering** - Converting markdown to HTML

### Performance Considerations

- **Component re-renders**: Unnecessary re-renders cause slowdowns
- **Virtual scrolling**: Large lists need virtualization
- **Markdown parsing**: Complex markdown is slow to parse
- **DOM size**: Large DOM trees cause layout thrashing

### Optimization Strategies

```tsx
// Use React.memo to prevent unnecessary re-renders
const Message = React.memo(({ content }) => {
  return <div>{content}</div>
})

// Use virtual scrolling for long lists
<Virtuoso
  data={messages}
  itemContent={(index) => <Message {...messages[index]} />}
/>

// Debounce expensive operations
const debouncedSearch = debounce(search, 300)

// Use CSS transforms for animations (GPU accelerated)
<div style={{ transform: 'translateX(100px)' }} />
```

### Bottlenecks

1. **Unnecessary re-renders** - Components re-render without prop changes
2. **Large DOM trees** - Too many DOM elements
3. **Layout thrashing** - Frequent layout recalculations
4. **Markdown parsing** - Complex markdown is slow

### Monitoring

- Use React DevTools Profiler
- Track render time per component
- Monitor DOM node count
- Profile layout recalculations

---

## File System Operations

### Path Description

File system operations for reading/writing files, watching for changes, and managing workspaces.

### Critical Components

- **FS Bridge** (`src/process/bridge/fsBridge.ts`) - File operations
- **File Watcher** (`src/process/bridge/fileWatchBridge.ts`) - File watching
- **Workspace Snapshot** (`src/process/services/WorkspaceSnapshotService.ts`) - Workspace state

### Performance Considerations

- **I/O latency**: File operations are slow
- **Recursive watching**: Watching large directories is expensive
- **Snapshot size**: Large snapshots take time to save/load
- **Synchronous operations**: Blocking the event loop

### Optimization Strategies

```typescript
// Use async file operations
const content = await fs.readFile(path, 'utf-8');

// Debounce file watch events
const debouncedHandler = debounce(handleChange, 100);

// Incremental snapshots
const delta = calculateDelta(previousState, currentState);
await saveDelta(delta);

// Use streaming for large files
const stream = fs.createReadStream(path);
```

### Bottlenecks

1. **Synchronous I/O** - Blocking operations
2. **Recursive watching** - Watching node_modules or large directories
3. **Large snapshots** - Saving/loading entire workspace state
4. **No caching** - Re-reading files repeatedly

### Monitoring

- Track file operation duration
- Monitor file watch event frequency
- Measure snapshot size and save time
- Profile I/O operations

---

## Related Documentation

- [docs/performance/optimization-tips.md](./optimization-tips.md) - Optimization guidelines
- [docs/data-flows/](../data-flows/) - Data flow patterns
- [docs/api-reference/database-schema.md](../api-reference/database-schema.md) - Database schema
