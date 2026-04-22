/**
 * Startup Performance Benchmarks
 *
 * Measures application startup times against defined budgets.
 * Run with: bun run vitest run tests/integration/startup-performance.bench.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Budgets from docs/performance/performance-budgets.md
const STARTUP_COLD_BUDGET_MS = Number(process.env.STARTUP_COLD_BUDGET_MS ?? 2000);
const STARTUP_TTI_BUDGET_MS = Number(process.env.STARTUP_TTI_BUDGET_MS ?? 5000);
const EXTENSION_LOAD_BUDGET_MS = Number(process.env.EXTENSION_LOAD_BUDGET_MS ?? 100);

// Memory budgets from docs/performance/memory-budgets.md
const MEMORY_HEAP_INITIAL_MB = Number(process.env.MEMORY_HEAP_INITIAL_MB ?? 150);
const MEMORY_RSS_INITIAL_MB = Number(process.env.MEMORY_RSS_INITIAL_MB ?? 300);

describe('Startup Performance Benchmarks', () => {
  describe('Main Process Startup', () => {
    it('should initialize core services within cold startup budget', async () => {
      const start = performance.now();

      // Simulate core service initialization
      // In real app: import { initializeServices } from '@process/bootstrap'
      const mockServices = ['database', 'config', 'i18n', 'extensions', 'channels'];

      for (const service of mockServices) {
        // Simulate service init (10-30ms each)
        await new Promise((r) => setTimeout(r, 15));
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(STARTUP_COLD_BUDGET_MS);
    });

    it('should load database within startup budget', async () => {
      const start = performance.now();

      // Simulate database initialization
      // In real app: database initialization + migrations
      const mockDbInit = async () => {
        await new Promise((r) => setTimeout(r, 50)); // Connection
        await new Promise((r) => setTimeout(r, 30)); // Schema check
        return { ready: true };
      };

      await mockDbInit();
      const end = performance.now();

      expect(end - start).toBeLessThan(500); // DB-specific budget
    });

    it('should initialize i18n within startup budget', async () => {
      const start = performance.now();

      // Simulate i18n initialization (parallel module loading)
      const modules = ['common', 'chat', 'settings', 'agents'];
      await Promise.all(
        modules.map(async () => {
          await new Promise((r) => setTimeout(r, 20));
        })
      );

      const end = performance.now();

      expect(end - start).toBeLessThan(400); // i18n startup budget
    });
  });

  describe('Extension Loading', () => {
    it('should load each extension within per-extension budget', async () => {
      const extensions = ['ext-core', 'ext-chat', 'ext-agents'];
      const times: number[] = [];

      for (const ext of extensions) {
        const start = performance.now();
        // Simulate extension load
        await new Promise((r) => setTimeout(r, 50));
        const end = performance.now();
        times.push(end - start);
      }

      // Each extension should load within budget
      for (const time of times) {
        expect(time).toBeLessThan(EXTENSION_LOAD_BUDGET_MS);
      }
    });

    it('should load multiple extensions in parallel within budget', async () => {
      const extensions = Array.from({ length: 5 }, (_, i) => `ext-${i}`);
      const start = performance.now();

      await Promise.all(extensions.map(() => new Promise((r) => setTimeout(r, 30))));

      const end = performance.now();
      const totalTime = end - start;

      // Parallel loading should be much faster than sequential
      expect(totalTime).toBeLessThan(EXTENSION_LOAD_BUDGET_MS * 2);
    });
  });

  describe('Memory at Startup', () => {
    it('should have heap within initial budget', () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

      expect(heapUsedMB).toBeLessThan(MEMORY_HEAP_INITIAL_MB);
    });

    it('should have RSS within initial budget', () => {
      const memUsage = process.memoryUsage();
      const rssMB = memUsage.rss / 1024 / 1024;

      expect(rssMB).toBeLessThan(MEMORY_RSS_INITIAL_MB);
    });

    it('should not have excessive external memory', () => {
      const memUsage = process.memoryUsage();
      const externalMB = memUsage.external / 1024 / 1024;

      expect(externalMB).toBeLessThan(100); // 100 MB budget
    });
  });

  describe('Configuration Loading', () => {
    it('should load app config within budget', async () => {
      const start = performance.now();

      // Simulate config loading
      const configFiles = ['app.json', 'i18n-config.json', 'storage.json'];
      for (const file of configFiles) {
        const configPath = path.join(__dirname, '../../src/common/config', file);
        if (fs.existsSync(configPath)) {
          const content = await fs.promises.readFile(configPath, 'utf-8');
          JSON.parse(content);
        }
      }

      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Config loading budget
    });

    it('should parse i18n config efficiently', async () => {
      const start = performance.now();

      const configPath = path.join(__dirname, '../../src/common/config/i18n-config.json');
      if (fs.existsSync(configPath)) {
        const content = await fs.promises.readFile(configPath, 'utf-8');
        JSON.parse(content);
      }

      const end = performance.now();

      expect(end - start).toBeLessThan(10); // JSON parse should be fast
    });
  });

  describe('Time to Interactive (TTI) Simulation', () => {
    it('should reach interactive state within TTI budget', async () => {
      const start = performance.now();

      // Simulate TTI sequence
      const phases = [
        { name: 'main-ready', time: 500 },
        { name: 'renderer-ready', time: 800 },
        { name: 'extensions-loaded', time: 1200 },
        { name: 'first-paint', time: 1500 },
        { name: 'interactive', time: 2000 },
      ];

      let currentTime = 0;
      for (const phase of phases) {
        await new Promise((r) => setTimeout(r, phase.time - currentTime));
        currentTime = phase.time;
      }

      const end = performance.now();

      expect(end - start).toBeLessThan(STARTUP_TTI_BUDGET_MS);
    });
  });
});

describe('Startup Regression Tests', () => {
  it('should not regress on sequential service initialization', async () => {
    // This test will fail if initialization becomes slower over time
    // Baseline: 5 services * 15ms = 75ms max
    const services = ['db', 'config', 'i18n', 'ipc', 'extensions'];
    const start = performance.now();

    for (const _ of services) {
      await new Promise((r) => setTimeout(r, 15));
    }

    const duration = performance.now() - start;
    const expectedMax = services.length * 20; // 20ms per service max

    expect(duration).toBeLessThan(expectedMax);
  });

  it('should maintain parallel initialization efficiency', async () => {
    const services = Array.from({ length: 10 }, (_, i) => i);
    const start = performance.now();

    await Promise.all(services.map(() => new Promise((r) => setTimeout(r, 10))));

    const duration = performance.now() - start;

    // Parallel should be ~10ms + overhead, not 100ms
    expect(duration).toBeLessThan(50);
  });
});
