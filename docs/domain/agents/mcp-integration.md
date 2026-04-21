# MCP Integration Patterns

## Overview

Model Context Protocol (MCP) integration in Largo, including server management, tool registration, and agent-MCP communication patterns.

## MCP Architecture

### Components

#### MCP Server

External service that provides tools and resources to agents.

```typescript
interface MCPServer {
  id: string;
  name: string;
  endpoint: string;
  capabilities: ServerCapabilities;
  tools: Tool[];
  resources: Resource[];
  status: 'connected' | 'disconnected' | 'error';
}

interface ServerCapabilities {
  tools: boolean;
  resources: boolean;
  prompts: boolean;
  logging: Level;
}
```

#### MCP Client

Largo's client that communicates with MCP servers.

```typescript
interface MCPClient {
  connect(server: MCPServer): Promise<void>;
  disconnect(serverId: string): Promise<void>;
  listTools(serverId: string): Promise<Tool[]>;
  callTool(serverId: string, toolName: string, args: any): Promise<any>;
  listResources(serverId: string): Promise<Resource[]>;
  readResource(serverId: string, uri: string): Promise<any>;
}
```

#### Tool Registry

Central registry for all MCP tools across servers.

```typescript
interface ToolRegistry {
  register(serverId: string, tool: Tool): void;
  unregister(serverId: string, toolName: string): void;
  getTool(toolName: string): Tool | null;
  listTools(): Tool[];
  searchTools(query: string): Tool[];
}
```

---

## Server Management

### Server Registration

```typescript
// Register MCP server
async function registerServer(config: ServerConfig): Promise<MCPServer> {
  const server: MCPServer = {
    id: config.id,
    name: config.name,
    endpoint: config.endpoint,
    capabilities: await discoverCapabilities(config.endpoint),
    tools: [],
    resources: [],
    status: 'disconnected',
  };

  await serverStore.set(server.id, server);
  await mcpClient.connect(server);

  return server;
}

interface ServerConfig {
  id: string;
  name: string;
  endpoint: string;
  authentication?: AuthConfig;
  timeout?: number;
}
```

### Server Discovery

```typescript
// Discover server capabilities
async function discoverCapabilities(endpoint: string): Promise<ServerCapabilities> {
  const response = await fetch(`${endpoint}/capabilities`);
  return await response.json();
}

// Auto-discover tools
async function discoverTools(server: MCPServer): Promise<Tool[]> {
  const response = await fetch(`${server.endpoint}/tools/list`);
  const { tools } = await response.json();
  return tools;
}
```

### Connection Management

```typescript
// Connection pool
class ConnectionPool {
  private connections = new Map<string, Connection>();

  async getConnection(serverId: string): Promise<Connection> {
    if (!this.connections.has(serverId)) {
      const server = await serverStore.get(serverId);
      const connection = await establishConnection(server);
      this.connections.set(serverId, connection);
    }
    return this.connections.get(serverId);
  }

  async releaseConnection(serverId: string): Promise<void> {
    // Keep connection alive for reuse
  }

  async closeAll(): Promise<void> {
    for (const [id, conn] of this.connections) {
      await conn.close();
    }
    this.connections.clear();
  }
}
```

---

## Tool Integration

### Tool Registration

```typescript
// Register tools from MCP server
async function registerServerTools(serverId: string): Promise<void> {
  const server = await serverStore.get(serverId);
  const tools = await mcpClient.listTools(serverId);

  for (const tool of tools) {
    const qualifiedName = `${serverId}:${tool.name}`;

    toolRegistry.register(qualifiedName, {
      ...tool,
      serverId,
      qualifiedName,
    });
  }

  server.tools = tools;
  await serverStore.set(serverId, server);
}
```

### Tool Calling

```typescript
// Call MCP tool
async function callMCPTool(qualifiedName: string, args: any): Promise<any> {
  const tool = toolRegistry.getTool(qualifiedName);
  if (!tool) {
    throw new Error(`Tool not found: ${qualifiedName}`);
  }

  const server = await serverStore.get(tool.serverId);
  if (server.status !== 'connected') {
    throw new Error(`Server not connected: ${tool.serverId}`);
  }

  return await mcpClient.callTool(tool.serverId, tool.name, args);
}
```

### Tool Proxy

```typescript
// Create agent-accessible tool proxy
function createToolProxy(qualifiedName: string): AgentTool {
  const tool = toolRegistry.getTool(qualifiedName);

  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    handler: async (args) => {
      return await callMCPTool(qualifiedName, args);
    },
  };
}
```

---

## Resource Integration

### Resource Registration

```typescript
// Register resources from MCP server
async function registerServerResources(serverId: string): Promise<void> {
  const server = await serverStore.get(serverId);
  const resources = await mcpClient.listResources(serverId);

  for (const resource of resources) {
    resourceRegistry.register(resource.uri, {
      ...resource,
      serverId,
    });
  }

  server.resources = resources;
  await serverStore.set(serverId, server);
}
```

### Resource Reading

```typescript
// Read MCP resource
async function readMCPResource(uri: string): Promise<any> {
  const resource = resourceRegistry.get(uri);
  if (!resource) {
    throw new Error(`Resource not found: ${uri}`);
  }

  const server = await serverStore.get(resource.serverId);
  return await mcpClient.readResource(server.id, uri);
}
```

---

## Agent Integration

### Agent Tool Registration

```typescript
// Register MCP tools with agent
async function registerMCPToolsWithAgent(agentId: string, serverId: string): Promise<void> {
  const server = await serverStore.get(serverId);
  const agent = agentRegistry.get(agentId);

  for (const tool of server.tools) {
    const qualifiedName = `${serverId}:${tool.name}`;
    const proxy = createToolProxy(qualifiedName);

    agent.registerTool(proxy);
  }
}
```

### Dynamic Tool Loading

```typescript
// Load tools on demand
async function loadToolForAgent(agentId: string, qualifiedName: string): Promise<void> {
  const tool = toolRegistry.getTool(qualifiedName);
  const agent = agentRegistry.get(agentId);

  const proxy = createToolProxy(qualifiedName);
  agent.registerTool(proxy);
}
```

---

## Communication Patterns

### Synchronous Tool Call

```typescript
// Direct synchronous call
const result = await callMCPTool('filesystem:read_file', {
  path: '/path/to/file.txt',
});
```

### Asynchronous Tool Call

```typescript
// Async call with callback
const jobId = await callMCPToolAsync('database:query', {
  sql: 'SELECT * FROM users',
});

// Poll for result
const result = await pollForResult(jobId);
```

### Streaming Tool Call

```typescript
// Streaming response
const stream = await callMCPToolStream('llm:generate', {
  prompt: 'Write a story',
});

for await (const chunk of stream) {
  console.log(chunk);
}
```

---

## Error Handling

### Connection Errors

```typescript
// Handle connection failures
async function handleConnectionError(serverId: string, error: Error): Promise<void> {
  const server = await serverStore.get(serverId);
  server.status = 'error';
  await serverStore.set(serverId, server);

  // Attempt reconnection
  setTimeout(() => reconnectServer(serverId), 5000);
}

async function reconnectServer(serverId: string): Promise<void> {
  const server = await serverStore.get(serverId);
  try {
    await mcpClient.connect(server);
    server.status = 'connected';
    await serverStore.set(serverId, server);
  } catch (error) {
    logger.error(`Reconnection failed for ${serverId}`, error);
  }
}
```

### Tool Execution Errors

```typescript
// Handle tool execution errors
async function handleToolError(qualifiedName: string, error: Error): Promise<any> {
  const tool = toolRegistry.getTool(qualifiedName);

  // Log error
  logger.error(`Tool execution failed: ${qualifiedName}`, error);

  // Check for retryable errors
  if (isRetryable(error)) {
    return await retryToolCall(qualifiedName, error);
  }

  // Return error to agent
  throw error;
}
```

---

## Security

### Authentication

```typescript
// JWT authentication
interface JWTAuthConfig {
  type: 'jwt';
  token: string;
  refreshInterval?: number;
}

// API key authentication
interface APIKeyAuthConfig {
  type: 'api-key';
  apiKey: string;
  header?: string;
}

// mTLS authentication
interface mTLSAuthConfig {
  type: 'mtls';
  cert: string;
  key: string;
  ca?: string;
}
```

### Authorization

```typescript
// Permission checks
function checkToolPermission(agentId: string, toolName: string): boolean {
  const agent = agentRegistry.get(agentId);
  const tool = toolRegistry.getTool(toolName);

  return agent.permissions.includes(tool.permission) || tool.permission === 'public';
}
```

### Rate Limiting

```typescript
// Rate limiter
class RateLimiter {
  private limits = new Map<string, RateLimit>();

  async checkLimit(serverId: string): Promise<boolean> {
    const limit = this.limits.get(serverId) || { count: 0, resetAt: Date.now() + 60000 };

    if (Date.now() > limit.resetAt) {
      limit.count = 0;
      limit.resetAt = Date.now() + 60000;
    }

    if (limit.count >= 100) {
      return false;
    }

    limit.count++;
    this.limits.set(serverId, limit);
    return true;
  }
}
```

---

## Performance Optimization

### Connection Pooling

```typescript
// Reuse connections
const connectionPool = new ConnectionPool();

async function getConnection(serverId: string): Promise<Connection> {
  return await connectionPool.getConnection(serverId);
}
```

### Response Caching

```typescript
// Cache tool responses
class ToolCache {
  private cache = new Map<string, CacheEntry>();

  async get(toolName: string, args: any): Promise<any> {
    const key = `${toolName}:${hash(args)}`;
    const entry = this.cache.get(key);

    if (entry && Date.now() < entry.expiresAt) {
      return entry.value;
    }

    return null;
  }

  async set(toolName: string, args: any, value: any, ttl: number): Promise<void> {
    const key = `${toolName}:${hash(args)}`;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }
}
```

### Batch Operations

```typescript
// Batch tool calls
async function batchToolCalls(calls: ToolCall[]): Promise<any[]> {
  // Group by server
  const grouped = groupByServer(calls);

  const results = [];
  for (const [serverId, serverCalls] of Object.entries(grouped)) {
    const batchResult = await executeBatch(serverId, serverCalls);
    results.push(...batchResult);
  }

  return results;
}
```

---

## Monitoring

### Metrics

```typescript
interface MCPMetrics {
  serverStatus: Record<string, 'connected' | 'disconnected' | 'error'>;
  toolCallCount: Record<string, number>;
  toolCallLatency: Record<string, number[]>;
  errorCount: Record<string, number>;
  throughput: number;
}
```

### Logging

```typescript
// Log MCP events
async function logMCPEvent(event: MCPEvent): Promise<void> {
  await eventLog.append({
    timestamp: Date.now(),
    ...event,
  });
}

interface MCPEvent {
  type: 'connection' | 'disconnection' | 'tool_call' | 'error';
  serverId?: string;
  toolName?: string;
  error?: Error;
}
```

---

## Best Practices

### Server Configuration

- Use appropriate timeouts for server connections
- Implement proper authentication
- Configure rate limits to prevent abuse
- Monitor server health and performance

### Tool Design

- Keep tools focused and single-purpose
- Use clear, descriptive names
- Provide detailed input/output schemas
- Include error handling in tool implementations

### Error Handling

- Implement retry logic for transient errors
- Log all errors with sufficient context
- Provide meaningful error messages to agents
- Implement circuit breakers for failing servers

### Performance

- Use connection pooling
- Cache frequently accessed resources
- Batch operations when possible
- Monitor and optimize slow tool calls

---

## Related Documentation

- [src/process/services/mcpServices/](../../../src/process/services/mcpServices/) - MCP service implementation
- [docs/api-reference/mcp-protocol.md](../api-reference/mcp-protocol.md) - MCP protocol reference
- [docs/domain/agents/agent-types.md](./agent-types.md) - Agent types
- [docs/domain/agents/team-orchestration.md](./team-orchestration.md) - Team orchestration
