# MCP Configuration Guide

> **Version**: 1.9.16 | **Model Context Protocol (MCP) Integration**

## Table of Contents

1. [What is MCP?](#1-what-is-mcp)
2. [Built-in MCP Servers](#2-built-in-mcp-servers)
3. [Adding MCP Servers](#3-adding-mcp-servers)
4. [Transport Types](#4-transport-types)
5. [Configuration Schema](#5-configuration-schema)
6. [MCP Server Examples](#6-mcp-server-examples)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. What is MCP?

The **Model Context Protocol (MCP)** is an open protocol that enables AI assistants to connect with external data sources and tools. MCP servers provide:

- **Tools**: Functions AI can call (search, calculate, retrieve data)
- **Resources**: Read-only data sources (documents, databases)
- **Prompts**: Reusable prompt templates

### How It Works

```
┌─────────────┐     MCP Protocol      ┌─────────────┐
│   Largo     │◄────────────────────►│ MCP Server  │
│   Agent     │  (stdio/SSE/HTTP)    │             │
└─────────────┘                      └──────┬──────┘
                                          │
                                    ┌─────┴─────┐
                                    │ External  │
                                    │  Service  │
                                    └───────────┘
```

---

## 2. Built-in MCP Servers

Largo ships with several built-in MCP servers located in `src/process/resources/builtinMcp/`:

| Server         | Purpose           | Tools                                 |
| -------------- | ----------------- | ------------------------------------- |
| **filesystem** | Local file access | read_file, write_file, list_directory |
| **web-search** | Internet search   | search_web, search_news               |
| **fetch**      | HTTP requests     | fetch_url, download_file              |
| **sqlite**     | Database queries  | query, execute, schema                |

### Enabling Built-in Servers

1. Go to **Settings > MCP Servers**
2. Toggle the servers you want to enable
3. Configure any required parameters (paths, API keys)

---

## 3. Adding MCP Servers

### Via UI

1. Navigate to **Settings > MCP Servers > Add Server**
2. Select transport type (stdio, SSE, HTTP)
3. Fill in configuration details
4. Click **Test Connection** to verify
5. Click **Save**

### Via Configuration File

Edit `~/.largo/mcp-config.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

### Via Extension

Extensions can contribute MCP servers via their manifest:

```json
{
  "contributes": {
    "mcpServers": [
      {
        "id": "my-mcp-server",
        "name": "My MCP Server",
        "config": {
          "type": "stdio",
          "command": "./server-binary"
        }
      }
    ]
  }
}
```

---

## 4. Transport Types

### stdio (Standard Input/Output)

**Best for**: Local CLI tools, Node.js/Python scripts

**Configuration**:

```json
{
  "type": "stdio",
  "command": "node",
  "args": ["./my-server.js"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Characteristics**:

- Spawns a child process
- Bidirectional JSON-RPC over stdin/stdout
- Process terminates when Largo closes

### SSE (Server-Sent Events)

**Best for**: Remote servers, cloud-hosted MCP services

**Configuration**:

```json
{
  "type": "sse",
  "url": "https://mcp.example.com/events",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN"
  }
}
```

**Characteristics**:

- HTTP-based streaming
- Server pushes events to client
- Suitable for remote access

### HTTP

**Best for**: REST-like MCP endpoints

**Configuration**:

```json
{
  "type": "http",
  "url": "https://mcp.example.com/api",
  "headers": {
    "X-API-Key": "your-api-key"
  }
}
```

**Characteristics**:

- Request/response model
- Compatible with standard HTTP infrastructure
- Easy to proxy/load balance

### streamable_http

**Best for**: Combined streaming over HTTP

**Configuration**:

```json
{
  "type": "streamable_http",
  "url": "https://mcp.example.com/stream",
  "headers": {}
}
```

---

## 5. Configuration Schema

### Full Schema

```typescript
type McpServerConfig = {
  // Display name
  name?: string;

  // Transport configuration (one of)
  transport: StdioTransport | SseTransport | HttpTransport | StreamableHttpTransport;

  // Server-specific environment variables
  env?: Record<string, string>;

  // Timeout in seconds (default: 60)
  timeout?: number;

  // Auto-start on Largo launch
  autoStart?: boolean;

  // Required permissions
  permissions?: string[];
};

type StdioTransport = {
  type: 'stdio';
  command: string; // Executable path
  args?: string[]; // Command arguments
  cwd?: string; // Working directory
};

type SseTransport = {
  type: 'sse';
  url: string; // SSE endpoint URL
  headers?: Record<string, string>;
};

type HttpTransport = {
  type: 'http';
  url: string; // HTTP endpoint URL
  headers?: Record<string, string>;
};

type StreamableHttpTransport = {
  type: 'streamable_http';
  url: string;
  headers?: Record<string, string>;
};
```

### Configuration Locations

| Location                            | Purpose                       |
| ----------------------------------- | ----------------------------- |
| `~/.largo/mcp-config.json`          | User MCP servers              |
| `src/process/resources/builtinMcp/` | Built-in servers              |
| Extension manifests                 | Extension-contributed servers |

---

## 6. MCP Server Examples

### Filesystem Access

```json
{
  "filesystem": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/documents", "/home/user/projects"]
  }
}
```

**Tools provided**:

- `read_file(path)` - Read file contents
- `write_file(path, content)` - Write file contents
- `list_directory(path)` - List directory contents
- `search_files(query, path)` - Search for files

### Web Search

```json
{
  "web-search": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    "env": {
      "BRAVE_API_KEY": "your-brave-api-key"
    }
  }
}
```

**Tools provided**:

- `search_web(query, count)` - General web search
- `search_news(query)` - News-specific search

### PostgreSQL Database

```json
{
  "postgres": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@localhost:5432/dbname"]
  }
}
```

**Tools provided**:

- `query(sql)` - Execute SELECT queries
- `execute(sql)` - Execute INSERT/UPDATE/DELETE
- `schema(table?)` - Get database schema

### GitHub Integration

```json
{
  "github": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxx"
    }
  }
}
```

**Tools provided**:

- `search_repositories(query)` - Search GitHub repos
- `get_file_contents(owner, repo, path)` - Get file contents
- `create_issue(owner, repo, title, body)` - Create issues
- `create_pull_request(owner, repo, title, head, base)` - Create PRs

### Custom Python Server

```json
{
  "custom-analysis": {
    "type": "stdio",
    "command": "python3",
    "args": ["/path/to/custom_mcp_server.py"],
    "env": {
      "DATA_PATH": "/path/to/data"
    }
  }
}
```

**Example Python server**:

```python
# custom_mcp_server.py
from mcp.server import Server
from mcp.types import Tool, TextContent

app = Server("custom-analysis")

@app.list_tools()
async def list_tools():
    return [
        Tool(
            name="calculate_npv",
            description="Calculate NPV for cash flows",
            inputSchema={
                "type": "object",
                "properties": {
                    "cash_flows": {"type": "array", "items": {"type": "number"}},
                    "discount_rate": {"type": "number"}
                },
                "required": ["cash_flows", "discount_rate"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name, arguments):
    if name == "calculate_npv":
        flows = arguments["cash_flows"]
        rate = arguments["discount_rate"]
        npv = sum(cf / (1 + rate) ** i for i, cf in enumerate(flows))
        return [TextContent(type="text", text=f"NPV: {npv:.2f}")]

if __name__ == "__main__":
    app.run()
```

---

## 7. Troubleshooting

### Server Won't Start

**Check**:

1. Command exists in PATH: `which npx` or `where npx`
2. Required environment variables are set
3. No port conflicts (for HTTP/SSE)

**Debug**:

```bash
# Test stdio server manually
npx @modelcontextprotocol/server-filesystem /tmp
```

### Connection Timeout

**Solutions**:

1. Increase timeout in config: `"timeout": 120`
2. Check network connectivity (for HTTP/SSE)
3. Verify server is running and accessible

### Permission Denied

**For stdio servers**:

- Check file permissions: `chmod +x server-binary`
- Verify allowed paths for filesystem servers

**For HTTP/SSE servers**:

- Check API keys and authentication headers
- Verify CORS settings on server side

### Tools Not Appearing

1. **Check server is enabled** in Settings > MCP Servers
2. **Verify connection test** passes
3. **Check agent compatibility** - Not all agents support all MCP types
4. **Review logs** at `~/.largo/logs/mcp.log`

### High Resource Usage

**Optimization**:

- Disable unused MCP servers
- Set `autoStart: false` for rarely used servers
- Use `timeout` to limit long-running operations
- Monitor with `htop` or Task Manager

---

## Security Considerations

### Permission Model

MCP servers can request:

- **filesystem**: Read/write specific paths
- **network**: HTTP/SSE access to specific hosts
- **execution**: Run shell commands (stdio)

**Best practices**:

1. Only enable servers from trusted sources
2. Review permissions before enabling
3. Use specific paths, not wildcards
4. Rotate API keys regularly
5. Monitor MCP server activity in logs

### Isolation

- Each MCP server runs in its own process
- Network access is controlled by firewall rules
- Filesystem access is limited to configured paths

---

## Resources

- **MCP Specification**: https://modelcontextprotocol.io
- **Official Servers**: https://github.com/modelcontextprotocol/servers
- **Community Servers**: Search npm for `@modelcontextprotocol/server-*`

---

<div align="center">

**Largo MCP Integration** — Extend your AI with unlimited capabilities.

</div>
