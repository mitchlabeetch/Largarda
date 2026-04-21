# Service Interfaces Reference

## Overview

Service layer interfaces used in the main process. Services provide business logic and coordinate between different subsystems.

## Service Architecture

Services follow a layered architecture:

1. **Bridge Layer** - IPC handlers (`src/process/bridge/`)
2. **Service Layer** - Business logic (`src/process/services/`)
3. **Repository Layer** - Data access (`src/process/services/database/`)

## Core Services

### ConversationService

Manages conversations and messages.

**Interface:**

```typescript
interface IConversationService {
  // Conversation CRUD
  createConversation(params: CreateConversationParams): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  listConversations(filter?: ConversationFilter): Promise<Conversation[]>;
  updateConversation(id: string, data: UpdateConversationParams): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;

  // Message operations
  sendMessage(params: SendMessageParams): Promise<Message>;
  getMessages(conversationId: string): Promise<Message[]>;
  deleteMessage(id: string): Promise<void>;
  updateMessage(id: string, data: UpdateMessageParams): Promise<Message>;

  // Search
  searchConversations(query: string): Promise<Conversation[]>;
  searchMessages(conversationId: string, query: string): Promise<Message[]>;
}
```

**Usage:**

```typescript
import { ConversationService } from '@/process/services';

const service = new ConversationService(repository);
const conversation = await service.createConversation({
  title: 'My Conversation',
  agentId: 'agent-123',
});
const message = await service.sendMessage({
  conversationId: conversation.id,
  content: 'Hello',
  role: 'user',
});
```

---

### AgentService

Manages AI agent operations.

**Interface:**

```typescript
interface IAgentService {
  // Agent management
  getAgent(id: string): Promise<Agent>;
  listAgents(): Promise<Agent[]>;
  registerAgent(agent: Agent): Promise<void>;
  unregisterAgent(id: string): Promise<void>;

  // Agent execution
  executeAgent(agentId: string, context: AgentContext): Promise<AgentResponse>;
  streamAgent(agentId: string, context: AgentContext): AsyncIterable<AgentChunk>;

  // Agent configuration
  updateAgentConfig(id: string, config: AgentConfig): Promise<AgentConfig>;
  getAgentCapabilities(id: string): Promise<Capabilities>;
}
```

**Usage:**

```typescript
import { AgentService } from '@/process/services'

const service = new AgentService()
const agent = await service.getAgent('agent-123')
const response = await service.executeAgent(agent.id, {
  messages: [...],
  tools: [...]
})
```

---

### DatabaseService

Manages database connections and operations.

**Interface:**

```typescript
interface IDatabaseService {
  // Connection
  initialize(): Promise<void>;
  getConnection(): Database;
  close(): Promise<void>;

  // Transactions
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;

  // Migrations
  migrate(): Promise<void>;
  getCurrentVersion(): Promise<number>;

  // Repositories
  getConversationRepository(): IConversationRepository;
  getChannelRepository(): IChannelRepository;
}
```

**Usage:**

```typescript
import { DatabaseService } from '@/process/services/database';

const db = new DatabaseService({ path: './largo.db' });
await db.initialize();

const result = await db.transaction(async (tx) => {
  await tx.conversations.create(data);
  await tx.messages.create(messageData);
  return { success: true };
});
```

---

### ExtensionService

Manages extension lifecycle.

**Interface:**

```typescript
interface IExtensionService {
  // Extension management
  installExtension(path: string): Promise<Extension>;
  uninstallExtension(id: string): Promise<void>;
  getExtension(id: string): Promise<Extension>;
  listExtensions(): Promise<Extension[]>;

  // Lifecycle
  activateExtension(id: string): Promise<void>;
  deactivateExtension(id: string): Promise<void>;

  // Configuration
  updateExtensionConfig(id: string, config: Config): Promise<Config>;
  getExtensionConfig(id: string): Promise<Config>;

  // Hub integration
  searchHub(query: string): Promise<Extension[]>;
  installFromHub(id: string): Promise<Extension>;
}
```

**Usage:**

```typescript
import { ExtensionService } from '@/process/services/extensions';

const service = new ExtensionService();
await service.installExtension('/path/to/extension');
await service.activateExtension('extension-name');
```

---

### ChannelService

Manages communication channels.

**Interface:**

```typescript
interface IChannelService {
  // Channel management
  registerChannel(channel: Channel): Promise<void>;
  unregisterChannel(id: string): Promise<void>;
  getChannel(id: string): Promise<Channel>;
  listChannels(): Promise<Channel[]>;

  // Connection
  connectChannel(id: string, config: ChannelConfig): Promise<void>;
  disconnectChannel(id: string): Promise<void>;
  getChannelStatus(id: string): Promise<ChannelStatus>;

  // Messaging
  sendMessage(channelId: string, message: ChannelMessage): Promise<void>;
  onChannelMessage(channelId: string, handler: MessageHandler): void;
}
```

**Usage:**

```typescript
import { ChannelService } from '@/process/services/channels';

const service = new ChannelService();
await service.connectChannel('feishu', {
  appId: '...',
  appSecret: '...',
});
await service.sendMessage('feishu', {
  to: 'user123',
  content: 'Hello',
});
```

---

### TeamService

Manages multi-agent teams.

**Interface:**

```typescript
interface ITeamService {
  // Team management
  createTeam(config: TeamConfig): Promise<Team>;
  getTeam(id: string): Promise<Team>;
  listTeams(): Promise<Team[]>;
  deleteTeam(id: string): Promise<void>;

  // Agent management
  addAgentToTeam(teamId: string, agentId: string, role: string): Promise<void>;
  removeAgentFromTeam(teamId: string, agentId: string): Promise<void>;

  // Task execution
  executeTask(teamId: string, task: Task): Promise<TaskResult>;
  getTeamStatus(teamId: string): Promise<TeamStatus>;

  // MCP integration
  registerMcpServer(teamId: string, server: McpServer): Promise<void>;
}
```

**Usage:**

```typescript
import { TeamService } from '@/process/services/team'

const service = new TeamService()
const team = await service.createTeam({
  name: 'Analysis Team',
  agents: [
    { id: 'coordinator', role: 'coordinator' },
    { id: 'analyst', role: 'specialist' }
  ]
})
const result = await service.executeTask(team.id, {
  type: 'analysis',
  data: { ... }
})
```

---

### CronService

Manages scheduled tasks.

**Interface:**

```typescript
interface ICronService {
  // Job management
  createJob(config: CronJobConfig): Promise<CronJob>;
  getJob(id: string): Promise<CronJob>;
  listJobs(): Promise<CronJob[]>;
  deleteJob(id: string): Promise<void>;

  // Job control
  pauseJob(id: string): Promise<void>;
  resumeJob(id: string): Promise<void>;
  triggerJob(id: string): Promise<void>;

  // Monitoring
  getJobStatus(id: string): Promise<JobStatus>;
  getJobHistory(id: string, limit?: number): Promise<JobExecution[]>;

  // Scheduler
  startScheduler(): void;
  stopScheduler(): void;
}
```

**Usage:**

```typescript
import { CronService } from '@/process/services/cron';

const service = new CronService();
await service.createJob({
  name: 'daily-report',
  cronExpression: '0 9 * * *',
  handler: 'generateReport',
});
service.startScheduler();
```

---

### McpService

Manages MCP (Model Context Protocol) servers.

**Interface:**

```typescript
interface IMcpService {
  // Server management
  registerServer(config: McpServerConfig): Promise<McpServer>;
  unregisterServer(id: string): Promise<void>;
  getServer(id: string): Promise<McpServer>;
  listServers(): Promise<McpServer[]>;

  // Tool operations
  listTools(serverId: string): Promise<Tool[]>;
  executeTool(serverId: string, toolName: string, params: any): Promise<ToolResult>;

  // Resource operations
  listResources(serverId: string): Promise<Resource[]>;
  readResource(serverId: string, uri: string): Promise<ResourceContent>;
  subscribeResource(serverId: string, uri: string): Promise<void>;
  unsubscribeResource(serverId: string, uri: string): Promise<void>;
}
```

**Usage:**

```typescript
import { McpService } from '@/process/services/mcpServices';

const service = new McpService();
await service.registerServer({
  id: 'database-server',
  command: 'node',
  args: ['./mcp-server.js'],
});
const tools = await service.listTools('database-server');
const result = await service.executeTool('database-server', 'search', { query: '...' });
```

---

### MaService

M&A domain-specific service.

**Interface:**

```typescript
interface IMaService {
  // Company data
  getCompany(siren: string): Promise<Company>;
  searchCompanies(query: string): Promise<Company[]>;

  // Valuation
  performValuation(params: ValuationParams): Promise<ValuationResult>;
  getSectorMultiples(sector: string): Promise<SectorMultiples>;

  // Reference data
  getGlossary(): Promise<GlossaryEntry[]>;
  getSectorList(): Promise<Sector[]>;
}
```

**Usage:**

```typescript
import { MaService } from '@/process/services/ma';

const service = new MaService();
const company = await service.getCompany('123456789');
const valuation = await service.performValuation({
  companyId: '123456789',
  methods: ['dcf', 'multiples', 'anr'],
});
```

---

### SettingsService

Manages application settings.

**Interface:**

```typescript
interface ISettingsService {
  // Settings CRUD
  getSettings(): Promise<Settings>;
  getSetting(key: string): Promise<any>;
  updateSetting(key: string, value: any): Promise<void>;
  resetSettings(): Promise<void>;

  // Import/Export
  exportSettings(): Promise<string>;
  importSettings(data: string): Promise<void>;

  // Validation
  validateSettings(settings: Settings): ValidationResult;
}
```

**Usage:**

```typescript
import { SettingsService } from '@/process/services/settings';

const service = new SettingsService();
const settings = await service.getSettings();
await service.updateSetting('theme', 'dark');
```

---

## Service Patterns

### Singleton Pattern

Most services are singletons:

```typescript
// src/process/services/cron/cronServiceSingleton.ts
export const cronService = new CronService();
```

### Dependency Injection

Services receive dependencies via constructor:

```typescript
class ConversationService {
  constructor(
    private repository: IConversationRepository,
    private agentService: IAgentService
  ) {}
}
```

### Event Emission

Services emit events for state changes:

```typescript
service.on('conversation:created', (conversation) => {
  // Handle new conversation
});
```

### Error Handling

Services throw specific error types:

```typescript
try {
  await service.createConversation(params);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation error
  } else if (error instanceof NotFoundError) {
    // Handle not found
  }
}
```

## Related Documentation

- [src/process/services/](../../src/process/services/) - Service implementations
- [src/process/services/database/](../../src/process/services/database/) - Database service
- [docs/data-flows/](../data-flows/) - Data flow documentation
