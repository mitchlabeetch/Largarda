# Performance Budgets

## Overview

Measurable performance budgets for Largo launch scope. All budgets are enforced via automated benchmarks and regression tests.

## Budget Categories

### Application Startup

| Metric                         | Budget   | Rationale                                      | Test                           |
| ------------------------------ | -------- | ---------------------------------------------- | ------------------------------ |
| Cold startup (main process)    | < 2000ms | Time from app launch to main process ready     | `startup-performance.bench.ts` |
| Renderer first paint           | < 1500ms | Time from main ready to first UI render        | `startup-performance.bench.ts` |
| Time to interactive            | < 5000ms | Time from app launch to fully interactive UI   | `startup-performance.bench.ts` |
| Extension load (per extension) | < 100ms  | Cumulative budget for extension initialization | `startup-performance.bench.ts` |

### ACP Agent Operations

| Metric                    | Budget   | Rationale                            | Test                       |
| ------------------------- | -------- | ------------------------------------ | -------------------------- |
| Connection establishment  | < 3000ms | Time to establish ACP connection     | `benchmark-acp-startup.ts` |
| First chunk latency (P95) | < 5000ms | Time to first token from AI response | `benchmark-acp-startup.ts` |
| Session creation          | < 500ms  | Time to create a new agent session   | `benchmark-acp-startup.ts` |
| Authentication            | < 1000ms | Time to authenticate with agent      | `benchmark-acp-startup.ts` |

### Database Operations

| Metric                  | Budget   | Rationale                  | Test                            |
| ----------------------- | -------- | -------------------------- | ------------------------------- |
| Simple query (P95)      | < 50ms   | SELECT by indexed column   | `database-performance.bench.ts` |
| Complex query (P95)     | < 100ms  | Joins, multiple conditions | `database-performance.bench.ts` |
| Write operation (P95)   | < 50ms   | INSERT/UPDATE with index   | `database-performance.bench.ts` |
| Bulk insert (1000 rows) | < 500ms  | Batch insert performance   | `database-performance.bench.ts` |
| Migration (per version) | < 1000ms | Schema migration time      | `database-performance.bench.ts` |

### UI Rendering

| Metric                     | Budget  | Rationale                         | Test                            |
| -------------------------- | ------- | --------------------------------- | ------------------------------- |
| Component render (simple)  | < 16ms  | Single component mount/update     | `renderer-performance.bench.ts` |
| Component render (complex) | < 50ms  | List, markdown, rich components   | `renderer-performance.bench.ts` |
| Virtual list scroll        | < 16ms  | Scroll event handling (60fps)     | `renderer-performance.bench.ts` |
| Message stream update      | < 16ms  | Per-token update during streaming | `renderer-performance.bench.ts` |
| Route transition           | < 100ms | Page navigation animation         | `renderer-performance.bench.ts` |

### File System Operations

| Metric                   | Budget  | Rationale                    | Test                      |
| ------------------------ | ------- | ---------------------------- | ------------------------- |
| Small file read (< 1MB)  | < 50ms  | Typical config/document read | `fs-performance.bench.ts` |
| Large file read (> 10MB) | < 500ms | Large document processing    | `fs-performance.bench.ts` |
| File conversion (per MB) | < 100ms | Document conversion rate     | `fs-performance.bench.ts` |
| Thumbnail generation     | < 200ms | Preview image generation     | `fs-performance.bench.ts` |

### IPC Communication

| Metric                | Budget | Rationale              | Test                       |
| --------------------- | ------ | ---------------------- | -------------------------- |
| Simple call           | < 5ms  | Basic request/response | `ipc-performance.bench.ts` |
| Batch call (10 items) | < 20ms | Batched IPC operations | `ipc-performance.bench.ts` |
| Streaming chunk       | < 2ms  | Per-chunk IPC overhead | `ipc-performance.bench.ts` |
| Large payload (1MB)   | < 50ms | Large data transfer    | `ipc-performance.bench.ts` |

### Extension System

| Metric               | Budget  | Rationale                    | Test                             |
| -------------------- | ------- | ---------------------------- | -------------------------------- |
| Extension load       | < 200ms | Per-extension initialization | `extension-performance.bench.ts` |
| Manifest validation  | < 10ms  | Per-extension manifest check | `extension-performance.bench.ts` |
| API call (sandboxed) | < 20ms  | Sandboxed extension API call | `extension-performance.bench.ts` |

### Internationalization

| Metric              | Budget  | Rationale                   | Test                       |
| ------------------- | ------- | --------------------------- | -------------------------- |
| Single module load  | < 50ms  | Per-locale module load      | `i18n-performance.test.ts` |
| Full locale load    | < 300ms | All modules for one locale  | `i18n-performance.test.ts` |
| Language switch     | < 400ms | Runtime locale change       | `i18n-performance.test.ts` |
| Startup locale load | < 400ms | Initial locale on app start | `i18n-performance.test.ts` |

## Environment Variables

Override budgets via environment variables for CI or local testing:

```bash
# Startup budgets
STARTUP_COLD_BUDGET_MS=2000
STARTUP_TTI_BUDGET_MS=5000

# ACP budgets
ACP_CONNECTION_BUDGET_MS=3000
ACP_FIRST_CHUNK_BUDGET_MS=5000

# Database budgets
DB_SIMPLE_QUERY_BUDGET_MS=50
DB_COMPLEX_QUERY_BUDGET_MS=100

# Renderer budgets
RENDER_SIMPLE_BUDGET_MS=16
RENDER_COMPLEX_BUDGET_MS=50

# Memory budgets (in MB)
MEMORY_HEAP_INITIAL_MB=150
MEMORY_HEAP_STEADY_MB=200
MEMORY_RSS_INITIAL_MB=300
MEMORY_RSS_STEADY_MB=400
```

## Measurement Methodology

### Test Environment

- **OS**: macOS 14, Windows 11, Ubuntu 22.04
- **CPU**: Apple Silicon M3 / Intel i7 / AMD Ryzen 7
- **RAM**: 16GB minimum
- **Node**: LTS version (20.x)
- **Electron**: Version specified in package.json

### Measurement Approach

1. **Cold start**: Fresh app launch after system restart
2. **Warm start**: App relaunch without system restart
3. **P95 values**: 95th percentile over 20+ iterations
4. **Median values**: 50th percentile over 20+ iterations

### Profiling Tools

- **Startup**: `ACP_PERF=1` environment flag + log parsing
- **Renderer**: React DevTools Profiler + Chrome DevTools
- **Main process**: Node.js `--prof` + clinic.js
- **Memory**: Chrome DevTools Memory panel + `performance.memory`
- **Database**: SQLite `EXPLAIN QUERY PLAN` + timing

## CI Enforcement

Budgets are enforced in CI via:

1. **Pre-commit**: `bun run test:perf` runs quick smoke tests
2. **PR check**: Full benchmark suite with budget validation
3. **Nightly**: Comprehensive performance regression detection

## Regression Handling

When a budget is exceeded:

1. **Investigate**: Run profiler to identify hotspot
2. **Document**: Record findings in `performance-regressions.md`
3. **Fix**: Optimize or file issue for complex cases
4. **Verify**: Re-run benchmarks to confirm fix

## Related Documentation

- [critical-paths.md](./critical-paths.md) - Performance-critical code paths
- [optimization-tips.md](./optimization-tips.md) - Optimization guidelines
- [memory-budgets.md](./memory-budgets.md) - Memory usage budgets
