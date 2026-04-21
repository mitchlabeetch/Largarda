# MCP (Model Context Protocol) Reference

## Overview

Model Context Protocol (MCP) is a standardized protocol for connecting AI models to external tools and resources. Largo implements MCP for tool sharing and resource access across agents.

## Protocol Basics

MCP uses JSON-RPC 2.0 over stdio or other transports for communication between clients (agents) and servers (tool/resource providers).

## Message Format

### Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [...]
  }
}
```

### Error

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Method not found"
  }
}
```

## Methods

### Server Information

#### `initialize`

Initialize the MCP server.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "roots": {
        "listChanged": true
      },
      "sampling": {}
    },
    "clientInfo": {
      "name": "largo-agent",
      "version": "1.0.0"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "resources": {},
      "prompts": {}
    },
    "serverInfo": {
      "name": "largo-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

#### `initialized`

Notification that initialization is complete.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

## Tools

### `tools/list`

List available tools.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "search-database",
        "description": "Search the database",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Search query"
            }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

### `tools/call`

Execute a tool.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "search-database",
    "arguments": {
      "query": "financial data"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Search results..."
      }
    ]
  }
}
```

## Resources

### `resources/list`

List available resources.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/list",
  "params": {}
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resources": [
      {
        "uri": "file:///path/to/document.pdf",
        "name": "Financial Report",
        "description": "Q4 2024 financial report",
        "mimeType": "application/pdf"
      }
    ]
  }
}
```

### `resources/read`

Read a resource.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "resources/read",
  "params": {
    "uri": "file:///path/to/document.pdf"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "contents": [
      {
        "uri": "file:///path/to/document.pdf",
        "mimeType": "application/pdf",
        "text": "Document content..."
      }
    ]
  }
}
```

### `resources/subscribe`

Subscribe to resource changes.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "resources/subscribe",
  "params": {
    "uri": "file:///path/to/document.pdf"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {}
}
```

### `resources/unsubscribe`

Unsubscribe from resource changes.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "resources/unsubscribe",
  "params": {
    "uri": "file:///path/to/document.pdf"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {}
}
```

## Prompts

### `prompts/list`

List available prompts.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "prompts/list",
  "params": {}
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "result": {
    "prompts": [
      {
        "name": "analyze-financials",
        "description": "Analyze financial data",
        "arguments": [
          {
            "name": "company",
            "description": "Company name",
            "required": true
          }
        ]
      }
    ]
  }
}
```

### `prompts/get`

Get a prompt template.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "prompts/get",
  "params": {
    "name": "analyze-financials",
    "arguments": {
      "company": "Acme Corp"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "description": "Analyze financial data for Acme Corp",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "Please analyze the financial data for Acme Corp..."
        }
      }
    ]
  }
}
```

## Notifications

### `notifications/tools/list_changed`

Notification that the tools list has changed.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed"
}
```

### `notifications/resources/list_changed`

Notification that the resources list has changed.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/list_changed"
}
```

### `notifications/resources/updated`

Notification that a resource has been updated.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "file:///path/to/document.pdf"
  }
}
```

## Largo MCP Integration

### MCP Service

Largo provides an MCP service for managing MCP servers:

```typescript
import { McpService } from '@/process/services/mcpServices';

const mcpService = new McpService();

// Register MCP server
await mcpService.registerServer({
  id: 'database-server',
  command: 'node',
  args: ['./mcp-server.js'],
  env: {},
});

// List tools
const tools = await mcpService.listTools('database-server');

// Execute tool
const result = await mcpService.executeTool('database-server', 'search', {
  query: '...',
});
```

### Team MCP Sharing

MCP servers can be shared across agents in a team:

```typescript
import { TeamMcpManager } from '@/process/team/mcp';

const mcpManager = new TeamMcpManager();

// Register shared MCP server for team
await mcpManager.registerSharedServer(teamId, mcpServer);

// Agents can access shared tools
const result = await agent.executeTool('shared:search', params);
```

### Extension MCP Integration

Extensions can contribute MCP servers:

```json
{
  "contributes": {
    "mcpServers": [
      {
        "id": "extension-mcp",
        "name": "Extension MCP Server",
        "command": "node",
        "args": ["./mcp-server.js"]
      }
    ]
  }
}
```

## Error Codes

| Code   | Name             | Description                                       |
| ------ | ---------------- | ------------------------------------------------- |
| -32700 | Parse error      | Invalid JSON                                      |
| -32600 | Invalid Request  | Invalid JSON-RPC request                          |
| -32601 | Method not found | Method does not exist                             |
| -32602 | Invalid params   | Invalid method parameters                         |
| -32603 | Internal error   | Internal server error                             |
| -32000 | Server error     | Reserved for implementation-defined server errors |

## Best Practices

### Tool Design

- Provide clear descriptions
- Use JSON Schema for input validation
- Return structured results
- Handle errors gracefully

### Resource Design

- Use stable URIs
- Provide MIME types
- Support incremental updates
- Handle subscription changes

### Performance

- Batch operations when possible
- Use streaming for large results
- Cache frequently accessed data
- Implement rate limiting

## Related Documentation

- [src/process/services/mcpServices/](../../src/process/services/mcpServices/) - MCP service implementation
- [src/process/team/mcp/](../../src/process/team/mcp/) - Team MCP integration
- [docs/data-flows/team-collaboration.md](../data-flows/team-collaboration.md) - Team collaboration
