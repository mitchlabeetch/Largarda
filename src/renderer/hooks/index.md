# src/renderer/hooks/ - Custom React Hooks

## Overview

Custom React hooks providing reusable stateful logic and side effects. Hooks are organized by domain and follow camelCase naming with `use` prefix.

## Directory Structure

### `agent/` (8 items)

Agent-related hooks.

- Agent selection
- Agent state management
- Agent configuration
- Agent communication

### `assistant/` (5 items)

Assistant-related hooks.

- Assistant preset management
- Assistant configuration
- Assistant switching

### `chat/` (10 items)

Chat functionality hooks.

- Message sending
- Conversation management
- Streaming message handling
- Attachment management
- Chat history

### `context/` (6 items)

Context and global state hooks.

- Application context access
- Theme context
- User context
- Settings context

### `file/` (10 items)

File handling hooks.

- File upload
- File preview
- File validation
- File management

### `ma/` (3 items)

M&A domain hooks.

- Valuation calculations
- Financial data access
- Company data retrieval

### `mcp/` (9 items)

MCP (Model Context Protocol) hooks.

- MCP server connection
- Tool execution
- Resource access
- MCP state management

### `system/` (9 items)

System-level hooks.

- Window management
- Keyboard shortcuts
- System notifications
- Clipboard access

### `ui/` (9 items)

UI-related hooks.

- Responsive design
- Modal management
- Dropdown handling
- Focus management
- Scroll management

## Hook Patterns

### Data Fetching

```typescript
const { data, loading, error } = useDataFetching(endpoint);
```

### State Management

```typescript
const [state, setState] = useCustomState(initialState);
```

### Side Effects

```typescript
useCustomEffect(dependencies, callback);
```

### Context Access

```typescript
const context = useCustomContext();
```

## Common Hooks

### useChat

- Message sending and receiving
- Conversation state
- Streaming message handling
- Attachment management

### useAgent

- Agent selection
- Agent state
- Agent configuration
- Agent communication

### useSettings

- Settings access
- Settings updates
- Settings persistence
- Settings validation

### useTheme

- Theme switching
- Theme preferences
- Dark/light mode
- Theme customization

### useFile

- File upload
- File preview
- File validation
- File management

## Related Documentation

- [src/renderer/services/](../services/) - Frontend services
- [src/renderer/components/](../components/) - React components
- [AGENTS.md](../../../AGENTS.md) - Hook naming conventions
