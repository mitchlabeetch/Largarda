# Memory Budgets

## Overview

Measurable memory budgets for Largo launch scope. All budgets are enforced via automated benchmarks and monitored for regressions.

## Budget Categories

### Main Process Memory

| Metric               | Budget     | Rationale                        | Test                    |
| -------------------- | ---------- | -------------------------------- | ----------------------- |
| Heap at startup      | < 150 MB   | Initial JS heap after app launch | `memory-usage.bench.ts` |
| Heap steady state    | < 200 MB   | Stable heap after initialization | `memory-usage.bench.ts` |
| Heap growth per hour | < 10 MB/hr | Leak detection threshold         | `memory-usage.bench.ts` |
| RSS at startup       | < 300 MB   | Resident set size at launch      | `memory-usage.bench.ts` |
| RSS steady state     | < 400 MB   | Stable RSS during operation      | `memory-usage.bench.ts` |
| External memory      | < 100 MB   | Native/external allocations      | `memory-usage.bench.ts` |

### Renderer Process Memory

| Metric                  | Budget   | Rationale                 | Test                       |
| ----------------------- | -------- | ------------------------- | -------------------------- |
| Heap at startup         | < 100 MB | Initial renderer heap     | `renderer-memory.bench.ts` |
| Heap per conversation   | < 20 MB  | Incremental per open chat | `renderer-memory.bench.ts` |
| Heap after 100 messages | < 150 MB | Message accumulation      | `renderer-memory.bench.ts` |
| DOM nodes (max)         | < 5000   | Virtualized list limit    | `renderer-memory.bench.ts` |
| Detached nodes          | < 50     | Leak detection            | `renderer-memory.bench.ts` |

### Database Memory

| Metric              | Budget   | Rationale                | Test                       |
| ------------------- | -------- | ------------------------ | -------------------------- |
| SQLite cache        | < 50 MB  | Page cache configuration | `database-memory.bench.ts` |
| Query result sets   | < 20 MB  | Large result handling    | `database-memory.bench.ts` |
| Connection overhead | < 10 MB  | Per-connection memory    | `database-memory.bench.ts` |
| WAL file size       | < 100 MB | Write-ahead log limit    | `database-memory.bench.ts` |
| Temp tables         | < 30 MB  | Temporary storage        | `database-memory.bench.ts` |

### ACP Agent Memory

| Metric                | Budget   | Rationale               | Test                  |
| --------------------- | -------- | ----------------------- | --------------------- |
| Per agent process     | < 100 MB | Each ACP subprocess     | `acp-memory.bench.ts` |
| Agent message buffer  | < 50 MB  | In-flight message queue | `acp-memory.bench.ts` |
| Streaming buffer      | < 10 MB  | Per-conversation stream | `acp-memory.bench.ts` |
| Max concurrent agents | < 500 MB | Total for all agents    | `acp-memory.bench.ts` |

### Extension Memory

| Metric               | Budget   | Rationale                   | Test                        |
| -------------------- | -------- | --------------------------- | --------------------------- |
| Per extension        | < 50 MB  | Each loaded extension       | `extension-memory.bench.ts` |
| Extension storage    | < 20 MB  | Local storage per extension | `extension-memory.bench.ts` |
| Max total extensions | < 200 MB | All loaded extensions       | `extension-memory.bench.ts` |

### File System & Caching

| Metric                 | Budget   | Rationale                  | Test                 |
| ---------------------- | -------- | -------------------------- | -------------------- |
| Thumbnail cache        | < 100 MB | Preview image cache        | `fs-memory.bench.ts` |
| Document preview cache | < 50 MB  | Converted document cache   | `fs-memory.bench.ts` |
| File watch handles     | < 1000   | Max watched files          | `fs-memory.bench.ts` |
| Workspace snapshot     | < 20 MB  | Serialized workspace state | `fs-memory.bench.ts` |

### i18n Memory

| Metric              | Budget   | Rationale               | Test                       |
| ------------------- | -------- | ----------------------- | -------------------------- |
| Per locale (loaded) | < 500 KB | Single locale in memory | `i18n-performance.test.ts` |
| Max locales loaded  | < 2 MB   | Multiple locales cache  | `i18n-performance.test.ts` |
| Translation cache   | < 5 MB   | Parsed message cache    | `i18n-performance.test.ts` |

## Memory Budgets by Scenario

### Fresh Launch

```
Main Heap:       < 150 MB
Main RSS:        < 300 MB
Renderer Heap:   < 100 MB
Total System:    < 500 MB
```

### Typical Usage (5 conversations)

```
Main Heap:       < 200 MB
Main RSS:        < 400 MB
Renderer Heap:   < 150 MB
ACP Processes:   < 200 MB (2 agents)
Database Cache:  < 50 MB
Total System:    < 1000 MB
```

### Heavy Usage (20 conversations, 4 agents)

```
Main Heap:       < 250 MB
Main RSS:        < 500 MB
Renderer Heap:   < 200 MB
ACP Processes:   < 400 MB (4 agents)
Database Cache:  < 50 MB
Extensions:      < 100 MB
Total System:    < 1500 MB
```

## Memory Leak Detection

### Detection Thresholds

| Metric             | Warning   | Critical   | Action                  |
| ------------------ | --------- | ---------- | ----------------------- |
| Heap growth rate   | > 5 MB/hr | > 10 MB/hr | Profile and investigate |
| Detached DOM nodes | > 25      | > 50       | Check component cleanup |
| Event listeners    | > 1000    | > 2000     | Check listener cleanup  |
| Closures retained  | > 10000   | > 20000    | Profile heap snapshot   |

### Detection Methodology

1. **Baseline measurement**: Record memory at startup
2. **Steady state**: Wait for app to stabilize (30s)
3. **Operation simulation**: Run typical operations for 5 minutes
4. **Force GC**: Trigger `global.gc()` if available
5. **Comparison**: Compare to baseline and budgets

## Environment Variables

Override budgets for CI or debugging:

```bash
# Main process budgets (in MB)
MEMORY_HEAP_INITIAL_MB=150
MEMORY_HEAP_STEADY_MB=200
MEMORY_RSS_INITIAL_MB=300
MEMORY_RSS_STEADY_MB=400

# Renderer budgets (in MB)
MEMORY_RENDERER_INITIAL_MB=100
MEMORY_RENDERER_PER_CONVERSATION_MB=20

# Leak detection thresholds (in MB/hr)
MEMORY_LEAK_WARNING_MB_PER_HR=5
MEMORY_LEAK_CRITICAL_MB_PER_HR=10

# ACP budgets (in MB)
MEMORY_ACP_PER_AGENT_MB=100
MEMORY_ACP_MAX_TOTAL_MB=500

# Database budgets (in MB)
MEMORY_SQLITE_CACHE_MB=50
MEMORY_QUERY_RESULTS_MB=20

# Extension budgets (in MB)
MEMORY_EXTENSION_PER_MB=50
MEMORY_EXTENSIONS_MAX_MB=200
```

## Profiling Commands

### Heap Snapshots

```bash
# Generate heap snapshot (main process)
bunx tsx scripts/profile-memory.ts --snapshot

# Compare snapshots
bunx tsx scripts/profile-memory.ts --compare snapshot1.heapsnapshot snapshot2.heapsnapshot

# Find leaks
bunx tsx scripts/profile-memory.ts --leaks --duration 300
```

### Runtime Monitoring

```bash
# Start with memory profiling
MEMORY_PROFILE=1 bun start

# Generate report
bunx tsx scripts/profile-memory.ts --report
```

### Chrome DevTools

1. Open DevTools (Ctrl/Cmd + Shift + I)
2. Memory tab
3. Take heap snapshot
4. Analyze retained objects
5. Compare multiple snapshots

## CI Enforcement

Memory budgets are enforced via:

1. **Pre-commit**: Quick heap size check
2. **PR check**: Full memory benchmark suite
3. **Nightly**: 1-hour leak detection test

## Regression Handling

When a memory budget is exceeded:

1. **Profile**: Take heap snapshots before/after
2. **Analyze**: Use Chrome DevTools or clinic.js
3. **Document**: Record findings in `memory-regressions.md`
4. **Fix**: Address root cause, not symptoms
5. **Verify**: Re-run benchmarks to confirm

## Optimization Strategies

### Reducing Heap Usage

- Use `WeakMap`/`WeakSet` for temporary caches
- Clear references when components unmount
- Limit cache sizes with LRU eviction
- Stream large data instead of buffering

### Reducing RSS

- Minimize native addon usage
- Limit worker process count
- Use SQLite WAL mode
- Disable unnecessary DevTools features

### Preventing Leaks

- Always remove event listeners on cleanup
- Cancel pending async operations
- Clear intervals/timeouts
- Avoid closure captures of large objects

## Related Documentation

- [performance-budgets.md](./performance-budgets.md) - Time-based performance budgets
- [critical-paths.md](./critical-paths.md) - Memory-critical code paths
- [optimization-tips.md](./optimization-tips.md) - Memory optimization guidelines
