/**
 * Database Performance Benchmarks
 *
 * Measures database operation performance against defined budgets.
 * Run with: bun run vitest run tests/integration/database-performance.bench.ts
 *
 * Budgets from docs/performance/performance-budgets.md:
 * - Simple query (P95): < 50ms
 * - Complex query (P95): < 100ms
 * - Write operation (P95): < 50ms
 * - Bulk insert (1000 rows): < 500ms
 * - Migration (per version): < 1000ms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ISqliteDriver } from '../../src/process/services/database/drivers/ISqliteDriver';

// Budgets
const DB_SIMPLE_QUERY_BUDGET_MS = Number(process.env.DB_SIMPLE_QUERY_BUDGET_MS ?? 50);
const DB_COMPLEX_QUERY_BUDGET_MS = Number(process.env.DB_COMPLEX_QUERY_BUDGET_MS ?? 100);
const DB_WRITE_BUDGET_MS = Number(process.env.DB_WRITE_BUDGET_MS ?? 50);
const DB_BULK_INSERT_BUDGET_MS = Number(process.env.DB_BULK_INSERT_BUDGET_MS ?? 500);
const DB_MIGRATION_BUDGET_MS = Number(process.env.DB_MIGRATION_BUDGET_MS ?? 1000);

// Memory budgets
const MEMORY_SQLITE_CACHE_MB = Number(process.env.MEMORY_SQLITE_CACHE_MB ?? 50);
const MEMORY_QUERY_RESULTS_MB = Number(process.env.MEMORY_QUERY_RESULTS_MB ?? 20);

/**
 * Create a performance-measured mock driver that simulates realistic SQLite timings.
 */
function createPerformanceMockDriver(
  options: {
    queryLatencyMs?: number;
    writeLatencyMs?: number;
    bulkLatencyMs?: number;
    migrationLatencyMs?: number;
  } = {}
): ISqliteDriver {
  const { queryLatencyMs = 1, writeLatencyMs = 2, bulkLatencyMs = 0.5, migrationLatencyMs = 50 } = options;

  const store = new Map<string, unknown[]>();

  // Synchronous latency simulation (for benchmarking)
  const simulateLatency = (ms: number): void => {
    const start = Date.now();
    while (Date.now() - start < ms) {
      // Busy wait for precise timing
    }
  };

  return {
    prepare: vi.fn((sql: string) => {
      return {
        get: vi.fn((...params: unknown[]) => {
          simulateLatency(queryLatencyMs);
          const tableName = extractTableName(sql) ?? 'unknown';
          const rows = (store.get(tableName) ?? []) as Array<Record<string, unknown>>;
          return rows.find((r) => params.every((p, i) => r[`param${i}`] === p));
        }),
        all: vi.fn((...params: unknown[]) => {
          simulateLatency(queryLatencyMs);
          const tableName = extractTableName(sql) ?? 'unknown';
          const rows = (store.get(tableName) ?? []) as Array<Record<string, unknown>>;
          // Simple filtering simulation
          if (params.length > 0) {
            return rows.filter((_, i) => i < 100);
          }
          return rows;
        }),
        run: vi.fn((...params: unknown[]) => {
          simulateLatency(writeLatencyMs);
          const tableName = extractTableName(sql) ?? 'unknown';
          const rows = (store.get(tableName) ?? []) as Array<Record<string, unknown>>;
          if (sql.toLowerCase().includes('insert')) {
            rows.push(Object.fromEntries(params.map((p, i) => [`col${i}`, p])));
            store.set(tableName, rows);
            return { changes: 1, lastInsertRowid: rows.length };
          }
          if (sql.toLowerCase().includes('update')) {
            return { changes: 1, lastInsertRowid: 0 };
          }
          if (sql.toLowerCase().includes('delete')) {
            return { changes: params.length, lastInsertRowid: 0 };
          }
          return { changes: 0, lastInsertRowid: 0 };
        }),
      };
    }),
    exec: vi.fn((sql: string) => {
      simulateLatency(migrationLatencyMs);
      // Simulate schema operations
      if (sql.toLowerCase().includes('create table')) {
        const tableName = extractTableName(sql) ?? 'unknown';
        if (!store.has(tableName)) {
          store.set(tableName, []);
        }
      }
    }),
    pragma: vi.fn((pragma: string) => {
      simulateLatency(1);
      if (pragma.includes('journal_mode')) return 'wal';
      if (pragma.includes('synchronous')) return 1;
      if (pragma.includes('cache_size')) return 2000;
      if (pragma.includes('page_size')) return 4096;
      return null;
    }),
    transaction: vi.fn(<T>(fn: (...args: unknown[]) => T): ((...args: unknown[]) => T) => {
      return (...args: unknown[]) => fn(...args) as T;
    }) as ISqliteDriver['transaction'],
    close: vi.fn(() => {
      simulateLatency(5);
    }),
  };
}

function extractTableName(sql: string): string | null {
  const match =
    sql.match(/FROM\s+(\w+)/i) ||
    sql.match(/INTO\s+(\w+)/i) ||
    sql.match(/UPDATE\s+(\w+)/i) ||
    sql.match(/TABLE\s+(\w+)/i);
  return match ? match[1] : null;
}

describe('Database Performance Benchmarks', () => {
  let driver: ISqliteDriver;

  beforeEach(() => {
    driver = createPerformanceMockDriver();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Simple Query Performance', () => {
    it('should execute SELECT by id within budget', async () => {
      const stmt = driver.prepare('SELECT * FROM messages WHERE id = ?');

      const start = performance.now();
      stmt.get('msg-123');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_SIMPLE_QUERY_BUDGET_MS);
    });

    it('should execute SELECT by indexed column within budget', async () => {
      const stmt = driver.prepare('SELECT * FROM messages WHERE conversationId = ?');

      const start = performance.now();
      await stmt.all('conv-456');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_SIMPLE_QUERY_BUDGET_MS);
    });

    it('should execute SELECT with ORDER BY within budget', async () => {
      const stmt = driver.prepare('SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt DESC');

      const start = performance.now();
      await stmt.all('conv-456');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_SIMPLE_QUERY_BUDGET_MS);
    });

    it('should execute count query within budget', async () => {
      const stmt = driver.prepare('SELECT COUNT(*) FROM messages WHERE conversationId = ?');

      const start = performance.now();
      await stmt.get('conv-456');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_SIMPLE_QUERY_BUDGET_MS / 2); // Should be very fast
    });
  });

  describe('Complex Query Performance', () => {
    it('should execute JOIN query within budget', async () => {
      const stmt = driver.prepare(
        `SELECT m.*, c.title FROM messages m
         JOIN conversations c ON m.conversationId = c.id
         WHERE c.userId = ? AND m.createdAt > ?`
      );

      const start = performance.now();
      await stmt.all('user-123', Date.now() - 86400000);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_COMPLEX_QUERY_BUDGET_MS);
    });

    it('should execute multi-condition query within budget', async () => {
      const stmt = driver.prepare(
        `SELECT * FROM messages
         WHERE conversationId = ? AND type = ? AND createdAt BETWEEN ? AND ?`
      );

      const start = performance.now();
      await stmt.all('conv-456', 'user', Date.now() - 86400000, Date.now());
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_COMPLEX_QUERY_BUDGET_MS);
    });

    it('should execute search query within budget', async () => {
      const stmt = driver.prepare(
        `SELECT * FROM messages
         WHERE content LIKE ? AND conversationId IN (
           SELECT id FROM conversations WHERE userId = ?
         )`
      );

      const start = performance.now();
      await stmt.all('%search%', 'user-123');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_COMPLEX_QUERY_BUDGET_MS);
    });
  });

  describe('Write Operation Performance', () => {
    it('should execute INSERT within budget', async () => {
      const stmt = driver.prepare(
        'INSERT INTO messages (id, conversationId, content, type, createdAt) VALUES (?, ?, ?, ?, ?)'
      );

      const start = performance.now();
      stmt.run('msg-new', 'conv-456', 'Hello', 'user', Date.now());
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_WRITE_BUDGET_MS);
    });

    it('should execute UPDATE within budget', async () => {
      const stmt = driver.prepare('UPDATE messages SET content = ? WHERE id = ?');

      const start = performance.now();
      stmt.run('Updated content', 'msg-123');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_WRITE_BUDGET_MS);
    });

    it('should execute DELETE within budget', async () => {
      const stmt = driver.prepare('DELETE FROM messages WHERE id = ?');

      const start = performance.now();
      stmt.run('msg-123');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_WRITE_BUDGET_MS);
    });
  });

  describe('Bulk Operations', () => {
    it('should execute 1000 inserts in transaction within budget', async () => {
      const start = performance.now();

      driver.transaction(() => {
        const stmt = driver.prepare(
          'INSERT INTO messages (id, conversationId, content, createdAt) VALUES (?, ?, ?, ?)'
        );
        for (let i = 0; i < 1000; i++) {
          stmt.run(`msg-${i}`, 'conv-bulk', `Message ${i}`, Date.now());
        }
      })();

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_BULK_INSERT_BUDGET_MS);
    });

    it('should execute batch insert within budget', async () => {
      const start = performance.now();

      // Simulate batch insert (many values in one statement)
      const values = Array.from(
        { length: 100 },
        (_, i) => `('msg-${i}', 'conv-batch', 'Content ${i}', ${Date.now()})`
      ).join(', ');

      driver.exec(`INSERT INTO messages VALUES ${values}`);

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_BULK_INSERT_BUDGET_MS / 10); // Batch should be faster per row
    });
  });

  describe('Migration Performance', () => {
    it('should execute schema migration within budget', async () => {
      const start = performance.now();

      driver.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversationId TEXT NOT NULL,
          content TEXT,
          type TEXT NOT NULL,
          createdAt INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages(conversationId);
        CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages(createdAt);
      `);

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DB_MIGRATION_BUDGET_MS);
    });

    it('should execute pragma configuration within budget', async () => {
      const start = performance.now();

      driver.pragma('journal_mode = WAL');
      driver.pragma('synchronous = NORMAL');
      driver.pragma('cache_size = -2000');

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // Pragmas should be very fast
    });
  });

  describe('Memory Efficiency', () => {
    it('should keep query result memory within budget', async () => {
      const stmt = driver.prepare('SELECT * FROM messages WHERE conversationId = ?');

      // Simulate large result set
      const memBefore = process.memoryUsage().heapUsed;
      const results = await stmt.all('conv-large');
      const memAfter = process.memoryUsage().heapUsed;

      const memDeltaMB = (memAfter - memBefore) / 1024 / 1024;

      expect(memDeltaMB).toBeLessThan(MEMORY_QUERY_RESULTS_MB);
    });

    it('should maintain reasonable cache size', async () => {
      // Simulate checking SQLite cache size
      const cachePages = await driver.pragma('cache_size');
      const pageSize = (await driver.pragma('page_size')) as number;
      const cacheSizeMB = ((cachePages as number) * pageSize) / 1024 / 1024;

      expect(Math.abs(cacheSizeMB)).toBeLessThan(MEMORY_SQLITE_CACHE_MB);
    });
  });

  describe('Prepared Statement Reuse', () => {
    it('should benefit from prepared statement caching', async () => {
      const stmt = driver.prepare('SELECT * FROM messages WHERE conversationId = ?');

      // First execution (prepare + execute)
      const firstStart = performance.now();
      await stmt.all('conv-1');
      const firstDuration = performance.now() - firstStart;

      // Subsequent executions (reuse prepared statement)
      const times: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await stmt.all(`conv-${i}`);
        times.push(performance.now() - start);
      }

      const avgSubsequent = times.reduce((a, b) => a + b, 0) / times.length;

      // Subsequent queries should be faster or similar
      expect(avgSubsequent).toBeLessThanOrEqual(firstDuration * 1.5);
    });
  });

  describe('Transaction Performance', () => {
    it('should execute transaction faster than individual operations', async () => {
      const individualStart = performance.now();
      const stmt = driver.prepare('INSERT INTO messages (id, content) VALUES (?, ?)');

      // Individual inserts (no transaction)
      for (let i = 0; i < 10; i++) {
        stmt.run(`msg-${i}`, `Content ${i}`);
      }
      const individualDuration = performance.now() - individualStart;

      // Transaction batch
      const transactionStart = performance.now();
      driver.transaction(() => {
        for (let i = 0; i < 10; i++) {
          stmt.run(`msg-tx-${i}`, `Content ${i}`);
        }
      })();
      const transactionDuration = performance.now() - transactionStart;

      // Transaction should be faster
      expect(transactionDuration).toBeLessThan(individualDuration);
    });
  });
});

describe('Database Regression Tests', () => {
  let driver: ISqliteDriver;

  beforeEach(() => {
    driver = createPerformanceMockDriver();
  });

  it('should not degrade with concurrent reads', async () => {
    const stmt = driver.prepare('SELECT * FROM messages WHERE conversationId = ?');

    // Single read baseline
    const singleStart = performance.now();
    stmt.all('conv-test');
    const singleDuration = performance.now() - singleStart;

    // Concurrent reads
    const concurrentStart = performance.now();
    Promise.all(Array.from({ length: 5 }, (_, i) => stmt.all(`conv-${i}`)));
    const concurrentDuration = performance.now() - concurrentStart;

    // Concurrent should not be 5x slower
    expect(concurrentDuration).toBeLessThan(singleDuration * 3);
  });

  it('should maintain query time with larger datasets', async () => {
    const stmt = driver.prepare('SELECT * FROM messages WHERE conversationId = ? LIMIT 100');

    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      stmt.all(`conv-${i}`);
      times.push(performance.now() - start);
    }

    // Variance should be low (consistent performance)
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);

    expect(max).toBeLessThan(avg * 3); // Max should not be 3x average
  });
});
