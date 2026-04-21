# src/common/chat/slash/ - Slash Commands

## Overview

Slash command system for quick actions within chat. Provides a way to execute commands by typing `/command` syntax.

## Directory Structure

### Files

- **availability.ts** (1KB) - Availability slash command implementation
  - Check agent availability status
  - Query active agents
  - Return availability information
  - Command execution logic

- **types.ts** (1.4KB) - Slash command type definitions
  - Command interface
  - Parameter types
  - Response types
  - Command registry types

## Command Structure

### Command Interface

```typescript
interface SlashCommand {
  name: string;
  description: string;
  parameters?: CommandParameter[];
  execute: (params: any) => Promise<CommandResult>;
}
```

### Available Commands

#### /availability

Check agent availability:

- Lists available agents
- Shows agent status
- Queries capacity
- Returns availability summary

## Usage Patterns

### Registering a Command

```typescript
import { SlashCommandRegistry } from '@/common/chat/slash';

registry.register({
  name: 'availability',
  description: 'Check agent availability',
  execute: async (params) => {
    // Command logic
  },
});
```

### Executing a Command

```typescript
const result = await registry.execute('availability', {});
```

## Related Documentation

- [src/common/chat/](../) - Chat system overview
- [src/common/chat/atCommandParser.ts](../atCommandParser.ts) - @mention parser
