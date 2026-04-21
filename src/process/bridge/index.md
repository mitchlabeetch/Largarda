# src/process/bridge/ - IPC Bridge

## Overview

IPC (Inter-Process Communication) bridge between main and renderer processes. Provides type-safe, sandboxed APIs for renderer to access main process functionality.

## Directory Structure

### Core Bridge Files

- **index.ts** (5.4KB) - Bridge module exports and initialization
- **applicationBridge.ts** (6KB) - Application lifecycle bridge
- **applicationBridgeCore.ts** (1.9KB) - Core application bridge logic
- **authBridge.ts** (5.4KB) - Authentication bridge
- **conversationBridge.ts** (24.7KB) - Conversation management bridge
- **modelBridge.ts** (46KB) - AI model configuration bridge
- **fsBridge.ts** (62.9KB) - File system operations bridge
- **updateBridge.ts** (19KB) - Application update bridge
- **systemSettingsBridge.ts** (8.5KB) - System settings bridge

### Specialized Bridges

- **acpConversationBridge.ts** (10.4KB) - ACP conversation bridge
- **bedrockBridge.ts** (3.5KB) - AWS Bedrock bridge
- **channelBridge.ts** (11.6KB) - Channel management bridge
- **cronBridge.ts** (1.7KB) - Scheduled task bridge
- **databaseBridge.ts** (3.7KB) - Database operations bridge
- **dialogBridge.ts** (890B) - Dialog management bridge
- **documentBridge.ts** (3.8KB) - Document processing bridge
- **extensionsBridge.ts** (8.9KB) - Extension system bridge
- **feedbackBridge.ts** (2KB) - Feedback collection bridge
- **fileWatchBridge.ts** (4.3KB) - File watching bridge
- **geminiBridge.ts** (728B) - Gemini API bridge
- **geminiConversationBridge.ts** (1KB) - Gemini conversation bridge
- **hubBridge.ts** (1.6KB) - Extension hub bridge
- **maBridge.ts** (17.8KB) - M&A domain bridge
- **mcpBridge.ts** (3.4KB) - MCP service bridge
- **notificationBridge.ts** (1.9KB) - Notification bridge
- **officeWatchBridge.ts** (10.5KB) - Office file watching bridge
- **pptPreviewBridge.ts** (10.1KB) - PowerPoint preview bridge
- **previewHistoryBridge.ts** (1.2KB) - Preview history bridge
- **remoteAgentBridge.ts** (8.2KB) - Remote agent bridge
- **shellBridge.ts** (8.1KB) - Shell command bridge
- **shellBridgeStandalone.ts** (1.3KB) - Standalone shell bridge
- **speechToTextBridge.ts** (382B) - Speech-to-text bridge
- **starOfficeBridge.ts** (5KB) - Star Office bridge
- **taskBridge.ts** (1.5KB) - Task management bridge
- **teamBridge.ts** (3.5KB) - Team management bridge
- **testCustomAgentConnection.ts** (1.9KB) - Agent connection testing
- **webuiBridge.ts** (10.3KB) - WebUI server bridge
- **webuiQR.ts** (5.4KB) - WebUI QR code bridge
- **weixinLoginBridge.ts** (721B) - WeChat login bridge
- **windowControlsBridge.ts** (2.8KB) - Window controls bridge
- **workspaceSnapshotBridge.ts** (2.3KB) - Workspace snapshot bridge

### Utilities

- **migrationUtils.ts** (1.7KB) - Migration utilities

### `services/` (4 items)

Bridge service implementations.

### `__tests__/` (1 items)

Bridge unit tests.

## Bridge Categories

### Application Management

- **applicationBridge** - Application lifecycle (quit, relaunch, focus)
- **updateBridge** - Auto-update management
- **systemSettingsBridge** - System configuration

### Conversation & Chat

- **conversationBridge** - Conversation CRUD operations
- **acpConversationBridge** - ACP-specific conversations
- **geminiConversationBridge** - Gemini conversations
- **dialogBridge** - Dialog management

### AI Models

- **modelBridge** - Model configuration and selection
- **bedrockBridge** - AWS Bedrock models
- **geminiBridge** - Gemini models

### File System

- **fsBridge** - File operations (read, write, delete, watch)
- **fileWatchBridge** - File watching
- **officeWatchBridge** - Office file watching

### Extensions

- **extensionsBridge** - Extension management
- **hubBridge** - Extension hub

### Database

- **databaseBridge** - Database operations
- **previewHistoryBridge** - Preview history

### Channels

- **channelBridge** - Channel management

### Team

- **teamBridge** - Team operations
- **remoteAgentBridge** - Remote agent execution

### M&A Domain

- **maBridge** - M&A-specific operations

### MCP

- **mcpBridge** - MCP service operations

### Scheduled Tasks

- **cronBridge** - Cron job management

### Authentication

- **authBridge** - Authentication flows
- **weixinLoginBridge** - WeChat login

### UI

- **windowControlsBridge** - Window management
- **notificationBridge** - Notifications
- **dialogBridge** - Dialogs

### WebUI

- **webuiBridge** - WebUI server control
- **webuiQR** - QR code for WebUI access

### Utilities

- **shellBridge** - Shell command execution
- **speechToTextBridge** - Speech recognition
- **taskBridge** - Task management

## Bridge Pattern

### Registration

Each bridge is registered with the IPC system:

```typescript
ipcMain.handle('bridge:methodName', async (event, params) => {
  return bridgeMethod(params);
});
```

### Renderer Access

Renderer accesses via preload:

```typescript
const result = await window.electronAPI.bridgeMethodName(params);
```

### Type Safety

All bridges have TypeScript interfaces defined in preload for type-safe communication.

## Related Documentation

- [src/preload/](../../preload/) - Preload scripts
- [docs/data-flows/ipc-communication.md](../../../docs/data-flows/ipc-communication.md) - IPC communication patterns (planned)
- [docs/api-reference/ipc-bridge.md](../../../docs/api-reference/ipc-bridge.md) - IPC bridge API reference (planned)
