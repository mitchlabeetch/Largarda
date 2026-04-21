# src/common/adapter/ - Environment Adapters

## Overview

Adapters for different runtime environments (browser, Electron main, standalone server). Provide consistent APIs across environments.

## Directory Structure

### Files

- **browser.ts** (8.4KB) - Browser environment adapter
  - Browser-specific implementations
  - DOM APIs
  - Local storage
  - Fetch API

- **ipcBridge.ts** (64KB) - IPC bridge adapter for Electron
  - Main IPC bridge implementation
  - Message passing
  - Event handling
  - Type-safe communication

- **main.ts** (3.4KB) - Main process adapter
  - Electron main process APIs
  - File system access
  - System operations

- **standalone.ts** (1.3KB) - Standalone/server adapter
  - Server environment
  - HTTP APIs
  - No Electron dependencies

- **registry.ts** (1.3KB) - Adapter registry
  - Adapter registration
  - Adapter selection
  - Fallback logic

- **constant.ts** (317B) - Adapter constants

## Adapter Pattern

### Environment Detection

```typescript
import { getAdapter } from '@/common/adapter';

const adapter = getAdapter();
// Automatically selects appropriate adapter based on environment
```

### Unified API

All adapters provide the same interface:

- `fs` - File operations
- `storage` - Storage operations
- `network` - Network operations
- `events` - Event handling

## Related Documentation

- [src/common/electronSafe.ts](../electronSafe.ts) - Electron-safe utilities
- [src/preload/](../../preload/) - IPC bridge
