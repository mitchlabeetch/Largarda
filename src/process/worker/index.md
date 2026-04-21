# src/process/worker/ - Worker Processes

## Overview

Forked worker processes for heavy computation. Workers run without Electron APIs for isolation and can perform CPU-intensive tasks without blocking the main process.

## Directory Structure

### Core Files

- **index.ts** (97B) - Worker module exports
- **WorkerProtocol.ts** (689B) - Worker communication protocol
- **utils.ts** (1.3KB) - Worker utilities
- **gemini.ts** (3.2KB) - Gemini-specific worker

### `fork/` (3 items)

Worker forking logic.

- Process forking
- Worker spawning
- Communication setup

### `ma/` (5 items)

M&A computation workers.

- Valuation calculations
- Financial analysis
- Data processing
- Report generation

## Worker Architecture

### Communication Protocol

```typescript
// Main process
const worker = fork('./worker.js');
worker.send({ type: 'task', data: params });

// Worker process
process.on('message', ({ type, data }) => {
  if (type === 'task') {
    const result = heavyComputation(data);
    process.send({ type: 'result', data: result });
  }
});
```

### Isolation

- No Electron APIs
- Separate Node.js process
- Separate memory space
- Crash isolation

## Worker Types

### M&A Workers

- Valuation calculations (DCF, multiples, ANR)
- Financial data processing
- Sector analysis
- Report generation

### Gemini Worker

- Gemini-specific processing
- Multimodal handling
- Large file processing

## Related Documentation

- [src/process/services/](../services/) - Backend services
- [src/common/ma/](../../common/ma/) - M&A domain logic
