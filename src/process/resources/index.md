# src/process/resources/ - Agent Resources

## Overview

Resource management for agents including assistant configurations, MCP servers, and skill definitions.

## Directory Structure

### `assistant/` (97 items)

Assistant configuration files and resources.

- Assistant presets
- System prompts
- Tool configurations
- Capability definitions

### `builtinMcp/` (2 items)

Built-in MCP (Model Context Protocol) server configurations.

- Default MCP servers
- MCP tool definitions
- Resource configurations

### `skills/` (194 items)

Agent skill definitions.

- Skill implementations
- Skill prompts
- Tool configurations
- Skill metadata

## Resource Types

### Assistant Resources

- System prompts
- Personality definitions
- Tool permissions
- Context templates

### MCP Resources

- Server configurations
- Tool definitions
- Resource schemas
- Authentication configs

### Skill Resources

- Skill prompts
- Implementation logic
- Tool requirements
- Execution patterns

## Usage

### Loading Resources

```typescript
import { ResourceManager } from '@/process/resources';

const manager = new ResourceManager();
const assistant = await manager.loadAssistant('analyst');
const skill = await manager.loadSkill('financial-analysis');
```

## Related Documentation

- [src/process/agent/](../agent/) - Agent implementations
- [src/process/services/mcpServices/](../services/mcpServices/) - MCP services
