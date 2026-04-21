# IPC Communication Patterns

## Overview

Documentation of Inter-Process Communication (IPC) patterns between the main process, renderer process, and worker processes in Largo's 3-process architecture.

## Architecture

```
┌─────────────────────────────────────────────┐
│           Renderer Process                 │
│         (React UI, DOM APIs)                │
│                                             │
│  window.electronAPI.* (exposed by preload)  │
└──────────────────┬──────────────────────────┘
                   │ IPC (contextBridge)
┌──────────────────▼──────────────────────────┐
│           Preload Script                     │
│         (src/preload/main.ts)                │
│                                             │
│  - Exposes safe APIs to renderer            │
│  - Sandboxes Node.js access                 │
│  - Type-safe interfaces                     │
└──────────────────┬──────────────────────────┘
                   │ ipcRenderer / ipcMain
┌──────────────────▼──────────────────────────┐
│           Main Process                      │
│      (Electron, Node.js APIs)               │
│                                             │
│  - Bridge handlers (src/process/bridge/)    │
│  - Services (src/process/services/)         │
│  - Agent orchestration                      │
└──────────────────┬──────────────────────────┘
                   │ child_process.fork()
┌──────────────────▼──────────────────────────┐
│           Worker Processes                   │
│     (Heavy computation, no Electron APIs)   │
│                                             │
│  - M&A valuation workers                    │
│  - Document processing                      │
│  - CPU-intensive tasks                      │
└─────────────────────────────────────────────┘
```

## Communication Patterns

### Pattern 1: Request/Response (Synchronous-style)

#### Flow

1. Renderer calls exposed API
2. Preload sends IPC message via `ipcRenderer.invoke()`
3. Main process handler receives via `ipcMain.handle()`
4. Main process executes logic
5. Main process returns result
6. Renderer receives result

#### Example

```typescript
// Renderer
const result = await window.electronAPI.fs.readFile(path);

// Preload (src/preload/main.ts)
contextBridge.exposeInMainWorld('electronAPI', {
  fs: {
    readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  },
});

// Main Bridge (src/process/bridge/fsBridge.ts)
ipcMain.handle('fs:readFile', async (event, path) => {
  return fs.readFile(path, 'utf-8');
});
```

### Pattern 2: Event Subscription (Asynchronous)

#### Flow

1. Renderer subscribes to event via `ipcRenderer.on()`
2. Main process emits event via `event.sender.send()` or `webContents.send()`
3. Renderer receives event callback
4. Renderer processes event

#### Example

```typescript
// Renderer
window.electronAPI.onUpdateAvailable((info) => {
  console.log('Update available:', info);
});

// Preload
contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update:available', (event, info) => callback(info));
  },
});

// Main Bridge (src/process/bridge/updateBridge.ts)
function notifyUpdateAvailable(info) {
  mainWindow.webContents.send('update:available', info);
}
```

### Pattern 3: Worker Communication

#### Flow

1. Main process forks worker
2. Main process sends message via `worker.send()`
3. Worker processes computation
4. Worker sends result via `process.send()`
5. Main process receives result
6. Main process forwards to renderer if needed

#### Example

```typescript
// Main Process
const worker = fork('./worker.js');
worker.send({ type: 'compute', data: params });
worker.on('message', (result) => {
  // Handle result
});

// Worker Process
process.on('message', ({ type, data }) => {
  if (type === 'compute') {
    const result = heavyComputation(data);
    process.send(result);
  }
});
```

## Bridge Categories

### File System Bridge (fsBridge.ts)

- **Operations**: readFile, writeFile, deleteFile, watchFile
- **Pattern**: Request/Response
- **Use Cases**: Document processing, file uploads, configuration

### Conversation Bridge (conversationBridge.ts)

- **Operations**: createConversation, getMessages, sendMessage
- **Pattern**: Request/Response + Event Subscription
- **Use Cases**: Chat functionality, message streaming

### Model Bridge (modelBridge.ts)

- **Operations**: getModels, setModel, getModelConfig
- **Pattern**: Request/Response
- **Use Cases**: AI model selection, configuration

### Database Bridge (databaseBridge.ts)

- **Operations**: query, execute, transaction
- **Pattern**: Request/Response
- **Use Cases**: Data persistence, queries

### Update Bridge (updateBridge.ts)

- **Operations**: checkForUpdates, downloadUpdate, installUpdate
- **Pattern**: Request/Response + Event Subscription
- **Use Cases**: Auto-updates, progress reporting

## Security Considerations

### Principle of Least Privilege

- Only expose necessary APIs to renderer
- No direct Node.js access in renderer
- Validate all inputs
- Sanitize outputs

### Context Bridge

```typescript
// Good: Expose specific, safe APIs
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
});

// Bad: Expose entire ipcRenderer
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
```

### Input Validation

```typescript
ipcMain.handle('fs:readFile', async (event, path) => {
  // Validate path is within allowed directories
  if (!isPathSafe(path)) {
    throw new Error('Invalid path');
  }
  return fs.readFile(path, 'utf-8');
});
```

## Performance Considerations

### Serialization Overhead

- IPC messages are serialized (JSON)
- Large data transfers can be slow
- Use streams for large files
- Consider shared memory for very large data

### Batch Operations

```typescript
// Bad: Multiple IPC calls
for (const file of files) {
  await window.electronAPI.fs.readFile(file);
}

// Good: Single batch call
await window.electronAPI.fs.readFiles(files);
```

### Caching

- Cache frequently accessed data in renderer
- Use events to invalidate cache
- Reduce IPC round trips

## Error Handling

### Error Propagation

```typescript
// Main Process
ipcMain.handle('operation', async (event, params) => {
  try {
    return await doOperation(params);
  } catch (error) {
    // Forward error to renderer
    throw error;
  }
});

// Renderer
try {
  const result = await window.electronAPI.operation(params);
} catch (error) {
  // Handle error
}
```

### Timeouts

```typescript
// Renderer with timeout
const result = await Promise.race([
  window.electronAPI.operation(params),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
]);
```

## Related Documentation

- [src/preload/](../../src/preload/) - Preload scripts
- [src/process/bridge/](../../src/process/bridge/) - Bridge implementations
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
