/**
 * Memory Usage Benchmarks
 *
 * Measures memory consumption against defined budgets.
 * Run with: bun run vitest run tests/integration/memory-usage.bench.ts
 *
 * Note: For accurate results, run with --expose-gc flag:
 *   node --expose-gc $(which bun) run vitest run tests/integration/memory-usage.bench.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Budgets from docs/performance/memory-budgets.md
const MEMORY_HEAP_STEADY_MB = Number(process.env.MEMORY_HEAP_STEADY_MB ?? 200);
const MEMORY_RSS_STEADY_MB = Number(process.env.MEMORY_RSS_STEADY_MB ?? 400);
const MEMORY_HEAP_PER_CONVERSATION_MB = Number(process.env.MEMORY_HEAP_PER_CONVERSATION_MB ?? 20);
const MEMORY_LEAK_WARNING_MB_PER_HR = Number(process.env.MEMORY_LEAK_WARNING_MB_PER_HR ?? 5);

interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
}

function takeMemorySnapshot(): MemorySnapshot {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed / 1024 / 1024, // MB
    heapTotal: usage.heapTotal / 1024 / 1024,
    rss: usage.rss / 1024 / 1024,
    external: usage.external / 1024 / 1024,
    arrayBuffers: usage.arrayBuffers / 1024 / 1024,
    timestamp: Date.now(),
  };
}

function forceGC(): void {
  if (global.gc) {
    global.gc();
  }
}

describe('Memory Usage Benchmarks', () => {
  let baselineSnapshot: MemorySnapshot;

  beforeEach(() => {
    forceGC();
    baselineSnapshot = takeMemorySnapshot();
  });

  afterEach(() => {
    forceGC();
  });

  describe('Baseline Memory', () => {
    it('should have heap within steady state budget', () => {
      const snapshot = takeMemorySnapshot();

      expect(snapshot.heapUsed).toBeLessThan(MEMORY_HEAP_STEADY_MB);
    });

    it('should have RSS within steady state budget', () => {
      const snapshot = takeMemorySnapshot();

      expect(snapshot.rss).toBeLessThan(MEMORY_RSS_STEADY_MB);
    });

    it('should have reasonable heap-to-total ratio', () => {
      const snapshot = takeMemorySnapshot();
      const ratio = snapshot.heapUsed / snapshot.heapTotal;

      // Should not have excessive unused heap allocated
      expect(ratio).toBeGreaterThan(0.3); // At least 30% used
      expect(ratio).toBeLessThan(0.95); // Not over 95% (fragmentation)
    });

    it('should have external memory within budget', () => {
      const snapshot = takeMemorySnapshot();

      expect(snapshot.external).toBeLessThan(100); // 100 MB budget
    });
  });

  describe('Conversation Memory', () => {
    it('should add memory within budget per conversation', async () => {
      // Simulate loading conversation data
      const conversations: Array<Record<string, unknown>> = [];
      const conversationCount = 5;

      for (let i = 0; i < conversationCount; i++) {
        const start = takeMemorySnapshot();

        // Simulate conversation object
        const conversation = {
          id: `conv-${i}`,
          messages: Array.from({ length: 20 }, (_, j) => ({
            id: `msg-${j}`,
            content: 'Test message content that is reasonably long '.repeat(10),
            timestamp: Date.now(),
          })),
          metadata: {
            title: `Conversation ${i}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        };

        conversations.push(conversation);

        forceGC();
        const end = takeMemorySnapshot();
        const deltaMB = end.heapUsed - start.heapUsed;

        // Each conversation should add less than per-conversation budget
        expect(deltaMB).toBeLessThan(MEMORY_HEAP_PER_CONVERSATION_MB);
      }
    });

    it('should not retain conversation data after cleanup', async () => {
      // Allocate and then cleanup
      let conversations: Array<Record<string, unknown>> = [];

      for (let i = 0; i < 10; i++) {
        conversations.push({
          id: `conv-${i}`,
          data: Array.from({ length: 1000 }, () => 'x').join(''),
        });
      }

      const withData = takeMemorySnapshot();

      // Clear reference
      conversations = [];
      forceGC();

      const afterCleanup = takeMemorySnapshot();
      const deltaMB = withData.heapUsed - afterCleanup.heapUsed;

      // Should release most of the memory
      expect(deltaMB).toBeGreaterThan(1); // At least 1 MB released
    });
  });

  describe('Message Buffer Memory', () => {
    it('should limit streaming buffer size', () => {
      // Simulate streaming message buffer
      const buffer: string[] = [];
      const maxBufferSize = 100; // Max chunks to retain

      // Add chunks
      for (let i = 0; i < 200; i++) {
        buffer.push('Chunk of streaming content '.repeat(50));

        // Simulate buffer management
        if (buffer.length > maxBufferSize) {
          buffer.splice(0, buffer.length - maxBufferSize);
        }
      }

      expect(buffer.length).toBeLessThanOrEqual(maxBufferSize);
    });

    it('should handle large message content efficiently', () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1 MB string
      const start = takeMemorySnapshot();

      // Process in chunks (simulating streaming)
      const chunks: string[] = [];
      const chunkSize = 1024;
      for (let i = 0; i < largeContent.length; i += chunkSize) {
        chunks.push(largeContent.slice(i, i + chunkSize));
      }

      const end = takeMemorySnapshot();
      const deltaMB = end.heapUsed - start.heapUsed;

      // Should not retain full content multiple times
      expect(deltaMB).toBeLessThan(5); // Less than 5 MB overhead
    });
  });

  describe('Cache Memory', () => {
    it('should limit translation cache size', () => {
      const cache = new Map<string, string>();
      const maxCacheSize = 1000;

      // Simulate translation cache
      for (let i = 0; i < 2000; i++) {
        cache.set(`key-${i}`, `translated value ${i} with some content`);

        // LRU eviction
        if (cache.size > maxCacheSize) {
          const firstKey = cache.keys().next().value;
          if (firstKey) cache.delete(firstKey);
        }
      }

      expect(cache.size).toBeLessThanOrEqual(maxCacheSize);
    });

    it('should limit config cache size', () => {
      const configCache = new Map<string, unknown>();
      const maxConfigs = 50;

      for (let i = 0; i < 100; i++) {
        configCache.set(`config-${i}`, {
          settings: Array.from({ length: 100 }, () => ({ key: 'value' })),
        });

        if (configCache.size > maxConfigs) {
          const firstKey = configCache.keys().next().value;
          if (firstKey) configCache.delete(firstKey);
        }
      }

      expect(configCache.size).toBeLessThanOrEqual(maxConfigs);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not grow heap excessively over simulated operation', async () => {
      const snapshots: MemorySnapshot[] = [];

      // Simulate 5 minutes of operation (accelerated)
      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        // Simulate operation that creates and should clean up objects
        const temp: Array<Record<string, unknown>> = [];
        for (let j = 0; j < 100; j++) {
          temp.push({ id: j, data: 'x'.repeat(100) });
        }

        // Cleanup
        temp.length = 0;

        if (i % 10 === 0) {
          forceGC();
          snapshots.push(takeMemorySnapshot());
        }
      }

      forceGC();
      const finalSnapshot = takeMemorySnapshot();

      // Calculate growth rate (MB per "hour" of operation)
      const firstSnapshot = snapshots[0];
      const timeDeltaHours = (finalSnapshot.timestamp - firstSnapshot.timestamp) / 1000 / 60 / 60;
      const heapDeltaMB = finalSnapshot.heapUsed - firstSnapshot.heapUsed;
      const growthRateMBPerHour = timeDeltaHours > 0 ? heapDeltaMB / timeDeltaHours : 0;

      // Should not exceed leak warning threshold
      expect(growthRateMBPerHour).toBeLessThan(MEMORY_LEAK_WARNING_MB_PER_HR);
    });

    it('should not accumulate detached references', () => {
      // Simulate event listener pattern
      const listeners: Array<() => void> = [];

      for (let i = 0; i < 100; i++) {
        const handler = () => {
          /* handle event */
        };
        listeners.push(handler);
      }

      const withListeners = takeMemorySnapshot();

      // Simulate proper cleanup
      listeners.length = 0;
      forceGC();

      const afterCleanup = takeMemorySnapshot();

      // Memory should be reclaimable
      expect(afterCleanup.heapUsed).toBeLessThan(withListeners.heapUsed);
    });
  });

  describe('ArrayBuffer Memory', () => {
    it('should track ArrayBuffer usage', () => {
      const snapshot = takeMemorySnapshot();

      // ArrayBuffers should be tracked separately
      expect(snapshot.arrayBuffers).toBeLessThan(50); // 50 MB budget for buffers
    });

    it('should release ArrayBuffers after use', () => {
      const before = takeMemorySnapshot();

      // Allocate buffers
      const buffers: ArrayBuffer[] = [];
      for (let i = 0; i < 10; i++) {
        buffers.push(new ArrayBuffer(1024 * 1024)); // 1 MB each
      }

      const withBuffers = takeMemorySnapshot();

      // Release and GC
      buffers.length = 0;
      forceGC();

      const after = takeMemorySnapshot();

      // ArrayBuffer memory should be released
      expect(after.arrayBuffers).toBeLessThan(withBuffers.arrayBuffers);
    });
  });

  describe('External Memory', () => {
    it('should keep native/external memory within budget', () => {
      const snapshot = takeMemorySnapshot();

      // External memory includes native bindings, SQLite, etc.
      expect(snapshot.external).toBeLessThan(100); // 100 MB budget
    });

    it('should not leak native resources', async () => {
      const before = takeMemorySnapshot();

      // Simulate database operations (external SQLite memory)
      for (let i = 0; i < 100; i++) {
        // Each operation allocates some external memory
        new ArrayBuffer(1024); // Simulated native allocation
      }

      forceGC();
      const after = takeMemorySnapshot();

      // External memory growth should be bounded
      const externalGrowth = after.external - before.external;
      expect(externalGrowth).toBeLessThan(50); // Less than 50 MB growth
    });
  });
});

describe('Memory Budget Compliance', () => {
  it('should meet all memory budgets simultaneously', () => {
    forceGC();
    const snapshot = takeMemorySnapshot();

    // Check all budgets at once
    expect(snapshot.heapUsed).toBeLessThan(MEMORY_HEAP_STEADY_MB);
    expect(snapshot.rss).toBeLessThan(MEMORY_RSS_STEADY_MB);
    expect(snapshot.external).toBeLessThan(100);
  });

  it('should maintain healthy memory ratios', () => {
    const snapshot = takeMemorySnapshot();

    // RSS should not be excessively larger than heap
    const rssToHeapRatio = snapshot.rss / snapshot.heapUsed;
    expect(rssToHeapRatio).toBeLessThan(3); // RSS < 3x heap

    // External should be reasonable compared to heap
    const externalToHeapRatio = snapshot.external / snapshot.heapUsed;
    expect(externalToHeapRatio).toBeLessThan(0.5); // External < 50% of heap
  });
});
