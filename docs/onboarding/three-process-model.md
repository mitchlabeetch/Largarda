# Understanding the 3-Process Model

## Overview

Largo uses a 3-process architecture to separate concerns, improve security, and enable performance optimization.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│           Renderer Process                          │
│         (React UI, DOM APIs)                         │
│                                                      │
│  - User interface                                    │
│  - React components                                  │
│  - DOM manipulation                                 │
│  - No Node.js access                                │
└──────────────────┬──────────────────────────────────┘
                   │ IPC (contextBridge)
┌──────────────────▼──────────────────────────────────┐
│           Preload Script                            │
│         (src/preload/main.ts)                        │
│                                                      │
│  - Exposes safe APIs to renderer                    │
│  - Sandboxes Node.js access                         │
│  - Type-safe interfaces                             │
└──────────────────┬──────────────────────────────────┘
                   │ ipcRenderer / ipcMain
┌──────────────────▼──────────────────────────────────┐
│           Main Process                              │
│      (Electron, Node.js APIs)                       │
│                                                      │
│  - Application lifecycle                            │
│  - IPC bridge handlers                              │
│  - Services (database, agents, extensions)          │
│  - Worker orchestration                             │
└──────────────────┬──────────────────────────────────┘
                   │ child_process.fork()
┌──────────────────▼──────────────────────────────────┐
│           Worker Processes                           │
│     (Heavy computation, no Electron APIs)           │
│                                                      │
│  - M&A valuation                                    │
│  - Document processing                              │
│  - CPU-intensive tasks                              │
│  - Isolated from Electron                           │
└─────────────────────────────────────────────────────┘
```

## Process 1: Renderer Process

### Purpose

Provide the user interface using React and DOM APIs.

### Capabilities

- React UI rendering
- DOM manipulation
- CSS styling
- Browser APIs (localStorage, fetch, etc.)
- User interaction

### Limitations

- No direct Node.js access
- No file system access
- No Electron APIs directly
- Must use IPC bridge for main process features

### Location

`src/renderer/`

### Key Directories

- `components/` - React components
- `pages/` - Page components
- `hooks/` - Custom React hooks
- `services/` - Frontend services
- `styles/` - Styling

### Communication

```typescript
// Renderer calls main process via IPC
const result = await window.electronAPI.conversation.sendMessage({
  conversationId: '...',
  content: 'Hello',
});
```

## Process 2: Main Process

### Purpose

Manage application lifecycle and provide backend services.

### Capabilities

- Electron APIs (windows, menus, dialogs)
- Node.js APIs (file system, network, etc.)
- Service layer (database, agents, extensions)
- Worker orchestration
- IPC bridge handlers

### Location

`src/process/`

### Key Directories

- `agent/` - AI agent implementations
- `bridge/` - IPC bridge handlers
- `channels/` - Communication channels
- `extensions/` - Extension system
- `services/` - Backend services
- `team/` - Multi-agent teams
- `webserver/` - WebUI server

### Communication

```typescript
// Main process handles IPC
ipcMain.handle('conversation:sendMessage', async (event, params) => {
  return await conversationService.sendMessage(params);
});
```

## Process 3: Worker Processes

### Purpose

Handle CPU-intensive tasks without blocking the main process.

### Capabilities

- Heavy computation
- No Electron APIs
- Separate Node.js process
- Crash isolation

### Location

`src/process/worker/`

### Key Directories

- `ma/` - M&A valuation workers
- `fork/` - Worker forking logic

### Communication

```typescript
// Main process forks worker
const worker = fork('./worker.js');
worker.send({ type: 'task', data: params });
worker.on('message', (result) => {
  // Handle result
});
```

## IPC Bridge

### Purpose

Secure communication between renderer and main processes.

### Implementation

`src/preload/main.ts`

### How It Works

1. Preload script runs in renderer context
2. Exposes safe APIs via `contextBridge`
3. Sandboxes Node.js access
4. Provides type-safe interfaces

### Example

```typescript
// Preload
contextBridge.exposeInMainWorld('electronAPI', {
  conversation: {
    sendMessage: (params) => ipcRenderer.invoke('conversation:sendMessage', params),
  },
});

// Renderer
const result = await window.electronAPI.conversation.sendMessage(params);
```

## Security Model

### Principle of Least Privilege

- Renderer has no direct Node.js access
- Only specific APIs are exposed
- Input validation in main process
- Error handling prevents information leakage

### Sandboxing

```typescript
// Good: Expose specific API
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
});

// Bad: Expose entire ipcRenderer
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
```

## Benefits

### Security

- Isolated renderer process
- Controlled API exposure
- No direct Node.js access in UI

### Performance

- Workers for heavy tasks
- Non-blocking main process
- Parallel processing

### Maintainability

- Clear separation of concerns
- Type-safe interfaces
- Easy to test each process

### Stability

- Worker crashes don't affect main app
- Renderer crashes are isolated
- Graceful error handling

## Common Patterns

### Request/Response

```typescript
// Renderer
const result = await window.electronAPI.method(params);

// Main
ipcMain.handle('method', async (event, params) => {
  return await doSomething(params);
});
```

### Event Subscription

```typescript
// Renderer
window.electronAPI.onEvent((data) => {
  console.log('Event:', data);
});

// Main
mainWindow.webContents.send('event', data);
```

### Worker Communication

```typescript
// Main
const worker = fork('./worker.js');
worker.send({ type: 'task', data });
worker.on('message', (result) => handleResult(result));
```

## Related Documentation

- [src/preload/main.ts](../../src/preload/main.ts) - Preload script
- [src/process/bridge/](../../src/process/bridge/) - IPC bridge
- [docs/data-flows/ipc-communication.md](../data-flows/ipc-communication.md) - IPC patterns
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
