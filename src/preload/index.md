# src/preload/ - IPC Bridge

## Overview

Preload scripts that run in the renderer process but have access to Node.js APIs. They expose safe, sandboxed APIs to the renderer process via contextBridge, enabling secure cross-process communication.

## Architecture

The preload layer acts as a secure bridge between:

- **Main Process** (Node.js/Electron APIs) → **Preload** → **Renderer Process** (DOM/React)

This prevents the renderer from directly accessing Node.js APIs, maintaining security boundaries.

## Directory Structure

### Files

- **main.ts** (3.1KB) - Main preload script for core IPC communication
- **petPreload.ts** (625B) - Pet-specific IPC handlers
- **petConfirmPreload.ts** (1KB) - Pet confirmation dialog IPC
- **petHitPreload.ts** (696B) - Pet hit detection IPC

## Main Preload (main.ts)

### Purpose

Provides the primary IPC bridge for core application functionality.

### Key Features

- **contextBridge.exposeInMainWorld** - Exposes safe APIs to renderer
- **ipcRenderer** wrappers - Secure IPC communication channels
- Type-safe interfaces - TypeScript definitions for exposed APIs
- Event handling - Renderer can listen to main process events

### Exposed APIs

Typical exposed APIs include:

- File operations (read, write, delete)
- Database operations
- Configuration management
- Service calls
- Event subscriptions

## Pet Preload Scripts

### petPreload.ts

Handles pet companion IPC communication:

- Pet state updates
- Animation triggers
- Interaction events

### petConfirmPreload.ts

Manages pet confirmation dialogs:

- Show confirmation modal
- Handle user response
- Return result to renderer

### petHitPreload.ts

Handles pet hit detection:

- Mouse hit testing
- Coordinate transformation
- Interaction feedback

## Security Model

### Principle of Least Privilege

- Only expose necessary APIs to renderer
- No direct Node.js access in renderer
- Sanitized inputs and outputs
- Type validation

### Context Bridge

Uses Electron's contextBridge API:

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  // Safe, limited API surface
});
```

### IPC Communication

- Renderer → Main: invoke channels
- Main → Renderer: send events
- Typed interfaces for safety

## Communication Patterns

### Request/Response

Renderer invokes a channel and receives a response:

```typescript
const result = await window.electronAPI.someMethod(params);
```

### Event Subscription

Renderer subscribes to main process events:

```typescript
window.electronAPI.onSomeEvent((data) => {
  // Handle event
});
```

## Type Safety

### TypeScript Interfaces

All exposed APIs have TypeScript definitions:

- Prevents runtime errors
- Enables autocomplete
- Documents the API surface

### Dual Definitions

Types defined in both:

- Preload script (for implementation)
- Renderer (for consumption)

## Related Documentation

- [Architecture](../../docs/ARCHITECTURE.md) - IPC bridge details
- [Security](../../docs/SECURITY.md) - Security model
- [AGENTS.md](../../AGENTS.md) - Process separation rules
