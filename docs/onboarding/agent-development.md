# Agent Development Guide

## Overview

Learn how to develop AI agents for Largo. Agents provide specialized capabilities using different AI providers.

## Agent Types

### Available Agents

| Agent    | Provider      | Use Case                           |
| -------- | ------------- | ---------------------------------- |
| ACP      | Aion CLI      | Command execution, file operations |
| AionRS   | Rust backend  | High-performance native operations |
| Flowise  | FlowiseAI     | Visual workflow automation         |
| Gemini   | Google Gemini | Multimodal AI, advanced reasoning  |
| Nanobot  | Custom        | Lightweight, fast tasks            |
| OpenClaw | Open-source   | Collaborative features             |
| Remote   | Network       | Distributed agent execution        |

## Agent Structure

### Basic Agent

```typescript
// src/process/agent/myAgent/
import { BaseAgent } from '../BaseAgent';

export class MyAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  async generateResponse(context: AgentContext): Promise<AgentResponse> {
    // Implement agent logic
  }
}
```

## Agent Configuration

### Config Structure

```typescript
interface AgentConfig {
  id: string;
  name: string;
  description: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  systemPrompt?: string;
}
```

### Example Configuration

```typescript
const config: AgentConfig = {
  id: 'my-agent',
  name: 'My Agent',
  description: 'Custom agent for specific tasks',
  model: 'claude-3-sonnet-20240229',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: 'You are a helpful assistant...',
  tools: [
    {
      name: 'search',
      description: 'Search database',
      handler: async (params) => {
        return await searchDatabase(params.query);
      },
    },
  ],
};
```

## Using AI Clients

### Multi-Provider Support

Largo supports multiple AI providers through a unified interface.

### Anthropic Claude

```typescript
import { ClientFactory } from '@common/api';

const client = ClientFactory.create('anthropic', {
  apiKey: 'sk-...',
  model: 'claude-3-sonnet-20240229',
});

const response = await client.chat.completions.create({
  messages: context.messages,
  stream: true,
});
```

### OpenAI GPT

```typescript
const client = ClientFactory.create('openai', {
  apiKey: 'sk-...',
  model: 'gpt-4o',
});
```

### Google Gemini

```typescript
const client = ClientFactory.create('gemini', {
  apiKey: '...',
  model: 'gemini-pro',
});
```

### AWS Bedrock

```typescript
const client = ClientFactory.create('bedrock', {
  accessKeyId: '...',
  secretAccessKey: '...',
  region: 'us-east-1',
  model: 'anthropic.claude-3-sonnet-20240229-v1:0',
});
```

## Tool Calling

### Define Tools

```typescript
const tools = [
  {
    name: 'search_database',
    description: 'Search the database for information',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
      },
      required: ['query'],
    },
  },
];
```

### Implement Tool Handler

```typescript
async function handleTool(toolName: string, params: any) {
  if (toolName === 'search_database') {
    return await database.search(params.query);
  }
}
```

### Use in Agent

```typescript
async generateResponse(context: AgentContext) {
  const response = await client.chat.completions.create({
    messages: context.messages,
    tools,
    tool_choice: 'auto'
  })

  // Handle tool calls
  if (response.toolCalls) {
    for (const toolCall of response.toolCalls) {
      const result = await handleTool(toolCall.name, toolCall.arguments)
      // Continue conversation with tool result
    }
  }
}
```

## Streaming Responses

### Basic Streaming

```typescript
async generateResponse(context: AgentContext) {
  const stream = await client.chat.completions.create({
    messages: context.messages,
    stream: true
  })

  let fullContent = ''
  for await (const chunk of stream) {
    const content = chunk.delta.content
    if (content) {
      fullContent += content
      // Emit streaming event
      emit('streaming', { content })
    }
  }

  return { content: fullContent }
}
```

## Agent Registration

### Register Agent

```typescript
import { AgentRegistry } from '@process/agent';

const registry = new AgentRegistry();

registry.register({
  id: 'my-agent',
  name: 'My Agent',
  implementation: MyAgent,
});
```

### Use Agent

```typescript
const agent = registry.get('my-agent');
const response = await agent.generateResponse(context);
```

## Team Integration

### Multi-Agent Teams

Agents can work together in teams.

```typescript
import { TeamService } from '@process/team'

const team = await teamService.createTeam({
  name: 'Analysis Team',
  agents: [
    { id: 'coordinator', role: 'coordinator' },
    { id: 'analyst', role: 'specialist' },
    { id: 'reviewer', role: 'reviewer' }
  ],
  workflow: 'parallel'
})

const result = await teamService.executeTask(team.id, {
  type: 'analysis',
  data: { ... }
})
```

## MCP Integration

### Use MCP Tools

```typescript
import { McpService } from '@process/services/mcpServices';

const mcpService = new McpService();
await mcpService.registerServer({
  id: 'database-server',
  command: 'node',
  args: ['./mcp-server.js'],
});

const tools = await mcpService.listTools('database-server');
const result = await mcpService.executeTool('database-server', 'search', {
  query: '...',
});
```

## Best Practices

### Error Handling

```typescript
try {
  const response = await client.chat.completions.create(params);
  return response;
} catch (error) {
  logger.error('Agent error:', error);
  throw new AgentError('Failed to generate response', error);
}
```

### Context Management

- Include relevant conversation history
- Limit context window (consider token limits)
- Prioritize recent messages
- Include system prompt

### Tool Design

- Provide clear descriptions
- Use JSON Schema for parameters
- Handle errors gracefully
- Validate inputs

### Performance

- Use streaming for long responses
- Cache frequently accessed data
- Use tools for expensive operations
- Avoid unnecessary API calls

## Testing

### Unit Test

```typescript
import { describe, it, expect } from 'vitest';
import { MyAgent } from './MyAgent';

describe('MyAgent', () => {
  it('should generate response', async () => {
    const agent = new MyAgent(config);
    const response = await agent.generateResponse({
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
  });
});
```

## Related Documentation

- [src/process/agent/](../../src/process/agent/) - Agent implementations
- [src/common/api/](../../src/common/api/) - AI client implementations
- [src/process/team/](../../src/process/team/) - Multi-agent teams
- [docs/api-reference/services.md](../api-reference/services.md) - Service interfaces
