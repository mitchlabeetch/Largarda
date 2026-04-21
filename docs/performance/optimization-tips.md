# Optimization Guidelines

## Overview

Best practices and optimization techniques for improving Largo performance across all layers of the application.

## General Principles

### Profile First, Optimize Later

- Use profiling tools to identify actual bottlenecks
- Don't optimize without measurements
- Focus on hot paths that impact user experience

### Measure Everything

- Track key metrics (startup time, response time, memory usage)
- Establish baselines before optimization
- Verify optimizations with benchmarks

### Consider Trade-offs

- Performance vs code complexity
- Memory vs CPU
- Latency vs throughput

---

## Database Optimization

### Use Prepared Statements

```typescript
// Bad: Vulnerable to SQL injection and slower
const result = db.query(`SELECT * FROM messages WHERE id = '${id}'`);

// Good: Safe and faster (query plan cached)
const stmt = db.prepare('SELECT * FROM messages WHERE id = ?');
const result = stmt.get(id);
```

### Add Appropriate Indexes

```sql
-- Index frequently queried columns
CREATE INDEX idx_messages_conversationId ON messages(conversationId);
CREATE INDEX idx_messages_createdAt ON messages(createdAt DESC);

-- Composite index for common query patterns
CREATE INDEX idx_messages_conversation_created
ON messages(conversationId, createdAt DESC);
```

### Use Transactions for Bulk Operations

```typescript
// Bad: Multiple round trips to database
for (const msg of messages) {
  db.insert('messages', msg);
}

// Good: Single transaction
db.transaction(() => {
  for (const msg of messages) {
    db.insert('messages', msg);
  }
})();
```

### Fetch Only Needed Columns

```typescript
// Bad: Fetches all columns
const messages = db.query('SELECT * FROM messages');

// Good: Fetches only needed columns
const messages = db.query('SELECT id, content, createdAt FROM messages');
```

### Enable WAL Mode

```typescript
// Better concurrency for read/write operations
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
```

---

## Renderer Optimization

### Use React.memo for Expensive Components

```tsx
// Prevents unnecessary re-renders
const Message = React.memo(
  ({ content, timestamp }) => {
    return <div>{content}</div>;
  },
  (prevProps, nextProps) => {
    // Custom comparison if needed
    return prevProps.content === nextProps.content;
  }
);
```

### Virtual Scrolling for Long Lists

```tsx
// Bad: Renders all items (slow for large lists)
<div>
  {messages.map((msg) => (
    <Message key={msg.id} {...msg} />
  ))}
</div>;

// Good: Only renders visible items
import { Virtuoso } from 'react-virtuoso';
<Virtuoso data={messages} itemContent={(index) => <Message {...messages[index]} />} />;
```

### Debounce User Input

```typescript
import { debounce } from 'lodash-es'

const debouncedSearch = debounce((query: string) => {
  performSearch(query)
}, 300)

<input onChange={(e) => debouncedSearch(e.target.value)} />
```

### Lazy Load Components

```tsx
import { lazy, Suspense } from 'react'

const HeavyComponent = lazy(() => import('./HeavyComponent'))

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### Use CSS Transforms for Animations

```css
/* Bad: Triggers layout recalculation */
.left-panel {
  left: 0;
  transition: left 0.3s;
}

/* Good: GPU accelerated */
.left-panel {
  transform: translateX(0);
  transition: transform 0.3s;
}
```

### Avoid Inline Functions in Render

```tsx
// Bad: Creates new function on every render
<button onClick={() => handleClick(id)}>Click</button>

// Good: Stable function reference
<button onClick={handleClick}>Click</button>
```

---

## IPC Communication Optimization

### Batch IPC Calls

```typescript
// Bad: Multiple round trips
await window.electronAPI.conversation.get(id);
await window.electronAPI.messages.list(id);
await window.electronAPI.settings.get();

// Good: Single batch call
const data = await window.electronAPI.batch.get({
  conversation: { id },
  messages: { conversationId: id },
  settings: {},
});
```

### Use Streaming for Large Data

```typescript
// Bad: Loads entire dataset into memory
const data = await window.electronAPI.largeData.getAll();

// Good: Streams data in chunks
const stream = await window.electronAPI.largeData.stream();
for await (const chunk of stream) {
  processChunk(chunk);
}
```

### Minimize Data Transfer

```typescript
// Bad: Transfers entire object
const fullConversation = await window.electronAPI.conversation.get(id);

// Good: Transfers only needed fields
const conversationSummary = await window.electronAPI.conversation.getSummary(id);
```

### Cache Frequently Accessed Data

```typescript
// Cache in renderer
const cache = new Map<string, any>();

async function getCachedData(key: string, fetcher: () => Promise<any>) {
  if (cache.has(key)) return cache.get(key);
  const data = await fetcher();
  cache.set(key, data);
  return data;
}
```

---

## File System Optimization

### Use Async Operations

```typescript
// Bad: Blocks event loop
const content = fs.readFileSync(path);

// Good: Non-blocking
const content = await fs.readFile(path, 'utf-8');
```

### Stream Large Files

```typescript
// Bad: Loads entire file into memory
const content = fs.readFileSync(largeFile);
process(content);

// Good: Processes in chunks
const stream = fs.createReadStream(largeFile);
stream.on('data', (chunk) => processChunk(chunk));
```

### Debounce File Watch Events

```typescript
import { debounce } from 'lodash-es';

const debouncedHandler = debounce((path: string) => {
  handleFileChange(path);
}, 100);

watcher.on('change', debouncedHandler);
```

### Use Efficient File Watching

```typescript
// Bad: Watch entire node_modules
watch('./', { recursive: true }, handler);

// Good: Watch specific directories
watch('./src', { recursive: true }, handler);
ignore('./node_modules');
```

---

## Memory Management

### Clear Unused References

```typescript
// Bad: Accumulates references
const cache = new Map();
cache.set(id, largeObject); // Never cleared

// Good: Implement cleanup
const cache = new Map();
cache.set(id, largeObject);
setTimeout(() => cache.delete(id), TTL);
```

### Use WeakMap for Temporary Storage

```typescript
// Bad: Prevents garbage collection
const cache = new Map<object, Data>();

// Good: Allows garbage collection
const cache = new WeakMap<object, Data>();
```

### Avoid Memory Leaks in Event Listeners

```tsx
// Bad: Listener not cleaned up
useEffect(() => {
  window.addEventListener('resize', handler);
}, []);

// Good: Cleanup on unmount
useEffect(() => {
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

### Limit Cache Size

```typescript
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  set(key: K, value: V) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

---

## Agent Optimization

### Cache Agent Responses

```typescript
const responseCache = new Map<string, AgentResponse>();

async function getAgentResponse(prompt: string) {
  const cacheKey = hash(prompt);
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey);
  }
  const response = await agent.generate(prompt);
  responseCache.set(cacheKey, response);
  return response;
}
```

### Use Streaming for Long Responses

```typescript
// Bad: Waits for complete response
const response = await agent.generate(prompt);
display(response);

// Good: Streams tokens as they arrive
const stream = await agent.generateStream(prompt);
for await (const token of stream) {
  display(token);
}
```

### Parallel Independent Tasks

```typescript
// Bad: Sequential execution
const resultA = await agentA.execute(taskA);
const resultB = await agentB.execute(taskB);
const resultC = await agentC.execute(taskC);

// Good: Parallel execution
const [resultA, resultB, resultC] = await Promise.all([
  agentA.execute(taskA),
  agentB.execute(taskB),
  agentC.execute(taskC),
]);
```

### Batch Tool Calls

```typescript
// Bad: One tool call at a time
for (const tool of tools) {
  await agent.callTool(tool);
}

// Good: Batch tool calls
await agent.callTools(tools);
```

---

## Extension Optimization

### Lazy Load Extensions

```typescript
// Bad: Load all extensions at startup
const extensions = await loadAllExtensions();

// Good: Load on demand
async function getExtension(id: string) {
  if (!loadedExtensions.has(id)) {
    loadedExtensions.set(id, await loadExtension(id));
  }
  return loadedExtensions.get(id);
}
```

### Minimize Extension Permissions

```json
{
  "permissions": [
    "fs:read", // Only what's needed
    "ipc:bridge:conversation"
  ]
}
```

### Use Worker Processes for Heavy Tasks

```typescript
// Extension handler runs in worker
export default {
  async execute(context) {
    const worker = fork('./heavy-task');
    const result = await worker.execute(context.data);
    return result;
  },
};
```

---

## Build Optimization

### Code Splitting

```typescript
// vite.renderer.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-arco': ['@arco-design/web-react'],
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
};
```

### Tree Shaking

```json
// package.json
{
  "sideEffects": false
}
```

### Minify Production Builds

```typescript
// electron.vite.config.ts
export default {
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
};
```

### Optimize Dependencies

```typescript
// vite.renderer.config.ts
export default {
  optimizeDeps: {
    include: ['react', 'react-dom', '@arco-design/web-react'],
    exclude: ['electron'],
  },
};
```

---

## Testing Performance

### Benchmark Critical Paths

```typescript
import { bench, describe } from 'vitest';

describe('Database queries', () => {
  bench('select by conversationId', async () => {
    await db.query('SELECT * FROM messages WHERE conversationId = ?', [id]);
  });

  bench('select with index', async () => {
    await db.query('SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt DESC', [id]);
  });
});
```

### Load Testing

```typescript
// Test with large datasets
const largeConversation = generateConversation(10000);
const time = performance.now();
await conversationService.load(largeConversation.id);
console.log(`Load time: ${performance.now() - time}ms`);
```

### Memory Profiling

```typescript
// Check for memory leaks
const initialMemory = process.memoryUsage().heapUsed;
// ... perform operations
const finalMemory = process.memoryUsage().heapUsed;
console.log(`Memory delta: ${finalMemory - initialMemory} bytes`);
```

---

## Monitoring

### Key Metrics to Track

- **Startup time**: Time to first render
- **Response time**: AI response latency
- **Memory usage**: Peak and average memory
- **Database query time**: Slow query identification
- **IPC call duration**: Bridge performance
- **Render time**: Component render duration

### Performance Budgets

- Startup time: < 3 seconds
- First contentful paint: < 1.5 seconds
- Time to interactive: < 5 seconds
- AI response: < 5 seconds (first token)
- Database query: < 100ms (95th percentile)

### Alerting

- Set up alerts for performance regressions
- Monitor trends over time
- Compare against baselines

---

## Related Documentation

- [docs/performance/critical-paths.md](./critical-paths.md) - Performance-critical paths
- [docs/troubleshooting/](../troubleshooting/) - Performance issues
- [docs/data-flows/](../data-flows/) - Data flow optimization
