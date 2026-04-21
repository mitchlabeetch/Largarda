# src/process/services/mcpServices/ - MCP Integration

## Overview

Model Context Protocol (MCP) service integration. Provides standardized tool access for AI agents through the MCP protocol.

## Directory Structure

### Core Components

- **McpService.ts** (13.1KB) - Main MCP service
  - MCP server management
  - Tool registration
  - Resource access
  - Protocol handling

- **McpProtocol.ts** (15.9KB) - MCP protocol implementation
  - Protocol message handling
  - Tool execution
  - Resource operations
  - Event streaming

- **McpOAuthService.ts** (6KB) - OAuth authentication for MCP
  - OAuth flow management
  - Token handling
  - Authentication

### `agents/` (9 items)

MCP agent implementations and configurations.

- Agent-specific MCP integrations
- Tool configurations
- Resource mappings

## Key Features

### Server Management

- MCP server lifecycle
- Connection management
- Health monitoring
- Reconnection logic

### Tool System

- Tool registration
- Tool discovery
- Tool execution
- Parameter validation

### Resource Access

- Resource listing
- Resource reading
- Resource watching
- Resource subscriptions

### Protocol Implementation

- JSON-RPC over stdio/transport
- Message handling
- Request/response
- Notifications

### Authentication

- OAuth 2.0 support
- Token management
- Secure connections
- Credential handling

## Usage Patterns

### Registering a Tool

```typescript
import { McpService } from '@/process/services/mcpServices';

const mcpService = new McpService();
await mcpService.registerTool({
  name: 'search',
  description: 'Search database',
  handler: async (params) => {
    // Tool logic
  },
});
```

### Executing a Tool

```typescript
const result = await mcpService.executeTool('search', {
  query: '...',
});
```

## Related Documentation

- [src/process/team/mcp/](../../team/mcp/) - Team MCP integration
- [docs/](../../../../docs/) - MCP documentation
