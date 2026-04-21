# IPC Bridge API Reference

## Overview

Complete reference for all IPC bridge APIs exposed to the renderer process via the preload script. These APIs provide type-safe, sandboxed access to main process functionality.

## Architecture

The IPC bridge follows this pattern:

1. **Preload Script** (`src/preload/main.ts`) - Exposes APIs to renderer via `contextBridge`
2. **Bridge Handler** (`src/process/bridge/*.ts`) - Handles IPC messages in main process
3. **Renderer Access** - `window.electronAPI.*` - Access exposed APIs

## API Categories

### Application Management

#### `applicationBridge.ts`

| Method                      | Description                  | Returns            |
| --------------------------- | ---------------------------- | ------------------ |
| `quit()`                    | Quit the application         | `Promise<void>`    |
| `relaunch()`                | Relaunch the application     | `Promise<void>`    |
| `focus()`                   | Focus the main window        | `Promise<void>`    |
| `hide()`                    | Hide the main window         | `Promise<void>`    |
| `show()`                    | Show the main window         | `Promise<void>`    |
| `minimize()`                | Minimize the window          | `Promise<void>`    |
| `maximize()`                | Maximize the window          | `Promise<void>`    |
| `unmaximize()`              | Unmaximize the window        | `Promise<void>`    |
| `isMaximized()`             | Check if window is maximized | `Promise<boolean>` |
| `setFullScreen(fullScreen)` | Set fullscreen mode          | `Promise<void>`    |
| `isFullScreen()`            | Check if in fullscreen       | `Promise<boolean>` |

**Usage:**

```typescript
await window.electronAPI.application.quit();
await window.electronAPI.application.relaunch();
const maximized = await window.electronAPI.application.isMaximized();
```

---

### Authentication

#### `authBridge.ts`

| Method               | Description           | Returns                 |
| -------------------- | --------------------- | ----------------------- |
| `login(credentials)` | Authenticate user     | `Promise<AuthResult>`   |
| `logout()`           | Logout current user   | `Promise<void>`         |
| `getCurrentUser()`   | Get current user info | `Promise<User \| null>` |
| `refreshToken()`     | Refresh auth token    | `Promise<string>`       |

**Usage:**

```typescript
const result = await window.electronAPI.auth.login({
  username: '...',
  password: '...',
});
```

---

### Conversation Management

#### `conversationBridge.ts`

| Method                         | Description                  | Returns                   |
| ------------------------------ | ---------------------------- | ------------------------- |
| `createConversation(params)`   | Create new conversation      | `Promise<Conversation>`   |
| `getConversation(id)`          | Get conversation by ID       | `Promise<Conversation>`   |
| `listConversations()`          | List all conversations       | `Promise<Conversation[]>` |
| `deleteConversation(id)`       | Delete conversation          | `Promise<void>`           |
| `sendMessage(params)`          | Send message to conversation | `Promise<Message>`        |
| `getMessages(conversationId)`  | Get conversation messages    | `Promise<Message[]>`      |
| `updateConversation(id, data)` | Update conversation metadata | `Promise<Conversation>`   |
| `searchConversations(query)`   | Search conversations         | `Promise<Conversation[]>` |

**Usage:**

```typescript
const conversation = await window.electronAPI.conversation.createConversation({
  title: 'My Conversation',
  agentId: 'agent-123',
});

const message = await window.electronAPI.conversation.sendMessage({
  conversationId: conversation.id,
  content: 'Hello',
  role: 'user',
});
```

---

### AI Model Configuration

#### `modelBridge.ts`

| Method                      | Description                     | Returns                 |
| --------------------------- | ------------------------------- | ----------------------- |
| `getModels()`               | Get available AI models         | `Promise<Model[]>`      |
| `getModel(id)`              | Get model by ID                 | `Promise<Model>`        |
| `setModel(id)`              | Set active model                | `Promise<void>`         |
| `getModelConfig()`          | Get current model configuration | `Promise<ModelConfig>`  |
| `updateModelConfig(config)` | Update model configuration      | `Promise<ModelConfig>`  |
| `getModelCapabilities(id)`  | Get model capabilities          | `Promise<Capabilities>` |
| `testConnection(id)`        | Test model connection           | `Promise<boolean>`      |

**Usage:**

```typescript
const models = await window.electronAPI.model.getModels();
await window.electronAPI.model.setModel('claude-3-sonnet-20240229');
const config = await window.electronAPI.model.getModelConfig();
```

---

### File System Operations

#### `fsBridge.ts`

| Method                        | Description             | Returns                   |
| ----------------------------- | ----------------------- | ------------------------- |
| `readFile(path)`              | Read file contents      | `Promise<string>`         |
| `writeFile(path, content)`    | Write file contents     | `Promise<void>`           |
| `deleteFile(path)`            | Delete file             | `Promise<void>`           |
| `exists(path)`                | Check if file exists    | `Promise<boolean>`        |
| `listDirectory(path)`         | List directory contents | `Promise<FileEntry[]>`    |
| `createDirectory(path)`       | Create directory        | `Promise<void>`           |
| `deleteDirectory(path)`       | Delete directory        | `Promise<void>`           |
| `getFileInfo(path)`           | Get file metadata       | `Promise<FileInfo>`       |
| `watchFile(path)`             | Watch file for changes  | `Promise<Watcher>`        |
| `unwatchFile(path)`           | Stop watching file      | `Promise<void>`           |
| `selectFile(options)`         | Open file dialog        | `Promise<string \| null>` |
| `selectDirectory()`           | Open directory dialog   | `Promise<string \| null>` |
| `selectSaveFile(defaultPath)` | Open save dialog        | `Promise<string \| null>` |

**Usage:**

```typescript
const content = await window.electronAPI.fs.readFile('/path/to/file.txt');
await window.electronAPI.fs.writeFile('/path/to/file.txt', 'Hello World');
const files = await window.electronAPI.fs.listDirectory('/path/to/dir');
const selectedFile = await window.electronAPI.fs.selectFile({
  filters: [{ name: 'Text Files', extensions: ['txt'] }],
});
```

---

### Database Operations

#### `databaseBridge.ts`

| Method                  | Description             | Returns              |
| ----------------------- | ----------------------- | -------------------- |
| `query(sql, params)`    | Execute SQL query       | `Promise<any[]>`     |
| `execute(sql, params)`  | Execute SQL statement   | `Promise<RunResult>` |
| `transaction(callback)` | Execute in transaction  | `Promise<T>`         |
| `backup(path)`          | Backup database         | `Promise<void>`      |
| `restore(path)`         | Restore database        | `Promise<void>`      |
| `getStats()`            | Get database statistics | `Promise<DBStats>`   |

**Usage:**

```typescript
const result = await window.electronAPI.database.query('SELECT * FROM conversations WHERE id = ?', [
  'conversation-123',
]);
```

---

### Extension Management

#### `extensionsBridge.ts`

| Method                              | Description                    | Returns                |
| ----------------------------------- | ------------------------------ | ---------------------- |
| `listExtensions()`                  | List installed extensions      | `Promise<Extension[]>` |
| `getExtension(id)`                  | Get extension by ID            | `Promise<Extension>`   |
| `installExtension(path)`            | Install extension from path    | `Promise<Extension>`   |
| `installFromHub(id)`                | Install extension from hub     | `Promise<Extension>`   |
| `uninstallExtension(id)`            | Uninstall extension            | `Promise<void>`        |
| `enableExtension(id)`               | Enable extension               | `Promise<void>`        |
| `disableExtension(id)`              | Disable extension              | `Promise<void>`        |
| `getExtensionConfig(id)`            | Get extension configuration    | `Promise<Config>`      |
| `updateExtensionConfig(id, config)` | Update extension configuration | `Promise<Config>`      |

**Usage:**

```typescript
const extensions = await window.electronAPI.extensions.listExtensions();
await window.electronAPI.extensions.installFromHub('feishu-channel');
await window.electronAPI.extensions.enableExtension('feishu-channel');
```

---

### Channel Management

#### `channelBridge.ts`

| Method                            | Description                   | Returns                  |
| --------------------------------- | ----------------------------- | ------------------------ |
| `listChannels()`                  | List available channels       | `Promise<Channel[]>`     |
| `getChannel(id)`                  | Get channel by ID             | `Promise<Channel>`       |
| `connectChannel(id, config)`      | Connect to channel            | `Promise<void>`          |
| `disconnectChannel(id)`           | Disconnect from channel       | `Promise<void>`          |
| `sendChannelMessage(id, message)` | Send message via channel      | `Promise<void>`          |
| `getChannelStatus(id)`            | Get channel connection status | `Promise<ChannelStatus>` |

**Usage:**

```typescript
const channels = await window.electronAPI.channel.listChannels();
await window.electronAPI.channel.connectChannel('feishu', {
  appId: '...',
  appSecret: '...',
});
```

---

### Team Management

#### `teamBridge.ts`

| Method                      | Description          | Returns               |
| --------------------------- | -------------------- | --------------------- |
| `createTeam(config)`        | Create new team      | `Promise<Team>`       |
| `getTeam(id)`               | Get team by ID       | `Promise<Team>`       |
| `listTeams()`               | List all teams       | `Promise<Team[]>`     |
| `deleteTeam(id)`            | Delete team          | `Promise<void>`       |
| `executeTask(teamId, task)` | Execute task on team | `Promise<TaskResult>` |
| `getTeamStatus(id)`         | Get team status      | `Promise<TeamStatus>` |

**Usage:**

```typescript
const team = await window.electronAPI.team.createTeam({
  name: 'Analysis Team',
  agents: [
    { id: 'coordinator', role: 'coordinator' },
    { id: 'analyst', role: 'specialist' }
  ]
})
const result = await window.electronAPI.team.executeTask(team.id, {
  type: 'analysis',
  data: { ... }
})
```

---

### M&A Domain Operations

#### `maBridge.ts`

| Method                       | Description          | Returns                    |
| ---------------------------- | -------------------- | -------------------------- |
| `getCompany(siren)`          | Get company by SIREN | `Promise<Company>`         |
| `searchCompanies(query)`     | Search companies     | `Promise<Company[]>`       |
| `performValuation(params)`   | Perform valuation    | `Promise<ValuationResult>` |
| `getSectorMultiples(sector)` | Get sector multiples | `Promise<Multiples>`       |
| `getGlossary()`              | Get M&A glossary     | `Promise<GlossaryEntry[]>` |

**Usage:**

```typescript
const company = await window.electronAPI.ma.getCompany('123456789');
const valuation = await window.electronAPI.ma.performValuation({
  companyId: '123456789',
  methods: ['dcf', 'multiples', 'anr'],
});
```

---

### MCP Service Operations

#### `mcpBridge.ts`

| Method                                    | Description                | Returns                    |
| ----------------------------------------- | -------------------------- | -------------------------- |
| `listMcpServers()`                        | List MCP servers           | `Promise<McpServer[]>`     |
| `getMcpServer(id)`                        | Get MCP server by ID       | `Promise<McpServer>`       |
| `registerMcpServer(config)`               | Register MCP server        | `Promise<McpServer>`       |
| `unregisterMcpServer(id)`                 | Unregister MCP server      | `Promise<void>`            |
| `listTools(serverId)`                     | List tools from server     | `Promise<Tool[]>`          |
| `executeTool(serverId, toolName, params)` | Execute tool               | `Promise<ToolResult>`      |
| `listResources(serverId)`                 | List resources from server | `Promise<Resource[]>`      |
| `readResource(serverId, uri)`             | Read resource              | `Promise<ResourceContent>` |

**Usage:**

```typescript
const servers = await window.electronAPI.mcp.listMcpServers();
const tools = await window.electronAPI.mcp.listTools('server-123');
const result = await window.electronAPI.mcp.executeTool('server-123', 'search', {
  query: '...',
});
```

---

### Scheduled Tasks (Cron)

#### `cronBridge.ts`

| Method              | Description               | Returns                   |
| ------------------- | ------------------------- | ------------------------- |
| `listJobs()`        | List cron jobs            | `Promise<CronJob[]>`      |
| `createJob(config)` | Create cron job           | `Promise<CronJob>`        |
| `deleteJob(id)`     | Delete cron job           | `Promise<void>`           |
| `pauseJob(id)`      | Pause cron job            | `Promise<void>`           |
| `resumeJob(id)`     | Resume cron job           | `Promise<void>`           |
| `getJobStatus(id)`  | Get job status            | `Promise<JobStatus>`      |
| `getJobHistory(id)` | Get job execution history | `Promise<JobExecution[]>` |

**Usage:**

```typescript
const job = await window.electronAPI.cron.createJob({
  name: 'daily-report',
  cronExpression: '0 9 * * *',
  handler: 'generateReport',
});
```

---

### Update Management

#### `updateBridge.ts`

| Method                   | Description                 | Returns                       |
| ------------------------ | --------------------------- | ----------------------------- |
| `checkForUpdates()`      | Check for available updates | `Promise<UpdateInfo \| null>` |
| `downloadUpdate()`       | Download update             | `Promise<void>`               |
| `installUpdate()`        | Install update              | `Promise<void>`               |
| `getUpdateStatus()`      | Get update status           | `Promise<UpdateStatus>`       |
| `setAutoUpdate(enabled)` | Enable/disable auto-update  | `Promise<void>`               |

**Usage:**

```typescript
const update = await window.electronAPI.update.checkForUpdates();
if (update) {
  await window.electronAPI.update.downloadUpdate();
  await window.electronAPI.update.installUpdate();
}
```

---

### System Settings

#### `systemSettingsBridge.ts`

| Method                      | Description        | Returns             |
| --------------------------- | ------------------ | ------------------- |
| `getSettings()`             | Get all settings   | `Promise<Settings>` |
| `getSetting(key)`           | Get setting by key | `Promise<any>`      |
| `updateSetting(key, value)` | Update setting     | `Promise<void>`     |
| `resetSettings()`           | Reset to defaults  | `Promise<void>`     |
| `exportSettings()`          | Export settings    | `Promise<string>`   |
| `importSettings(data)`      | Import settings    | `Promise<void>`     |

**Usage:**

```typescript
const settings = await window.electronAPI.systemSettings.getSettings();
await window.electronAPI.systemSettings.updateSetting('theme', 'dark');
```

---

### WebUI Server

#### `webuiBridge.ts`

| Method              | Description                 | Returns                 |
| ------------------- | --------------------------- | ----------------------- |
| `startServer()`     | Start WebUI server          | `Promise<ServerInfo>`   |
| `stopServer()`      | Stop WebUI server           | `Promise<void>`         |
| `getServerStatus()` | Get server status           | `Promise<ServerStatus>` |
| `generateQRCode()`  | Generate QR code for access | `Promise<string>`       |

**Usage:**

```typescript
await window.electronAPI.webui.startServer();
const status = await window.electronAPI.webui.getServerStatus();
const qrCode = await window.electronAPI.webui.generateQRCode();
```

---

### Notifications

#### `notificationBridge.ts`

| Method                      | Description                     | Returns            |
| --------------------------- | ------------------------------- | ------------------ |
| `showNotification(options)` | Show system notification        | `Promise<void>`    |
| `requestPermission()`       | Request notification permission | `Promise<boolean>` |

**Usage:**

```typescript
await window.electronAPI.notification.showNotification({
  title: 'Update Available',
  body: 'A new version is ready to install',
});
```

---

### Window Controls

#### `windowControlsBridge.ts`

| Method                    | Description         | Returns                    |
| ------------------------- | ------------------- | -------------------------- |
| `setTitle(title)`         | Set window title    | `Promise<void>`            |
| `getTitle()`              | Get window title    | `Promise<string>`          |
| `setSize(width, height)`  | Set window size     | `Promise<void>`            |
| `getSize()`               | Get window size     | `Promise<{width, height}>` |
| `setPosition(x, y)`       | Set window position | `Promise<void>`            |
| `getPosition()`           | Get window position | `Promise<{x, y}>`          |
| `setAlwaysOnTop(enabled)` | Set always on top   | `Promise<void>`            |

---

### Shell Operations

#### `shellBridge.ts`

| Method                    | Description                | Returns                  |
| ------------------------- | -------------------------- | ------------------------ |
| `executeCommand(command)` | Execute shell command      | `Promise<CommandResult>` |
| `openPath(path)`          | Open path with default app | `Promise<void>`          |
| `openExternal(url)`       | Open external URL          | `Promise<void>`          |

**Usage:**

```typescript
const result = await window.electronAPI.shell.executeCommand('ls -la');
await window.electronAPI.shell.openExternal('https://example.com');
```

---

## Event Subscriptions

Many APIs also emit events that can be subscribed to:

### Conversation Events

```typescript
window.electronAPI.onConversationCreated((conversation) => {
  console.log('New conversation:', conversation);
});

window.electronAPI.onMessageReceived((message) => {
  console.log('New message:', message);
});

window.electronAPI.onConversationStreaming((data) => {
  console.log('Streaming:', data.content);
});
```

### Update Events

```typescript
window.electronAPI.onUpdateAvailable((info) => {
  console.log('Update available:', info);
});

window.electronAPI.onUpdateDownloaded((info) => {
  console.log('Update downloaded:', info);
});
```

### Extension Events

```typescript
window.electronAPI.onExtensionInstalled((extension) => {
  console.log('Extension installed:', extension);
});

window.electronAPI.onExtensionUninstalled((id) => {
  console.log('Extension uninstalled:', id);
});
```

## Type Definitions

All APIs are fully typed. Type definitions are available in `src/preload/` and can be imported:

```typescript
import type { ElectronAPI } from '@/preload';

const api: ElectronAPI = window.electronAPI;
```

## Error Handling

All API methods can throw errors. Always wrap in try-catch:

```typescript
try {
  await window.electronAPI.conversation.sendMessage(params);
} catch (error) {
  console.error('Failed to send message:', error);
}
```

## Related Documentation

- [src/preload/main.ts](../../src/preload/main.ts) - Preload script
- [src/process/bridge/](../../src/process/bridge/) - Bridge implementations
- [docs/data-flows/ipc-communication.md](../data-flows/ipc-communication.md) - IPC communication patterns
