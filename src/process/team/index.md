# src/process/team/ - Multi-Agent Team System

## Overview

Multi-agent team collaboration system enabling multiple AI agents to work together on complex tasks through coordinated workflows and communication.

## Directory Structure

### Core Components

- **TeamSession.ts** (8.2KB) - Team session management
  - Session lifecycle
  - Agent coordination
  - State management
  - Event handling

- **TeamSessionService.ts** (31.8KB) - Team session service
  - Session creation and management
  - Agent orchestration
  - Workflow execution
  - Result aggregation

- **TeammateManager.ts** (22.4KB) - Agent/teammate management
  - Agent registration
  - Role assignment
  - Capability matching
  - Performance tracking

- **TaskManager.ts** (3.3KB) - Task distribution and tracking
  - Task queue
  - Assignment logic
  - Progress monitoring
  - Completion handling

- **Mailbox.ts** (1.5KB) - Inter-agent communication
  - Message passing
  - Event bus
  - Async communication
  - Message routing

- **teamEventBus.ts** (702B) - Team event bus
  - Event publishing
  - Subscription management
  - Event filtering

- **types.ts** (1.6KB) - Team system type definitions
- **index.ts** (367B) - Module exports

### `mcp/` (6 items)

MCP (Model Context Protocol) integration for teams.

- MCP server management
- Tool sharing
- Resource coordination
- Protocol handling

- **mcpReadiness.ts** (1.9KB) - MCP readiness checks

### `prompts/` (7 items)

Team coordination prompts and templates.

- Collaboration prompts
- Role definitions
- Task assignment templates
- Communication protocols

### `repository/` (2 items)

Team configuration persistence.

- Team definition storage
- Session history
- Configuration management

## Team Architecture

### Agent Roles

Agents can have different roles:

- **Coordinator** - Orchestrates team activities
- **Specialist** - Domain-specific expert
- **Reviewer** - Quality assurance
- **Executor** - Task execution

### Communication Patterns

- **Direct Messaging** - Point-to-point communication
- **Broadcast** - One-to-many announcements
- **Request/Response** - Synchronous queries
- **Event Streaming** - Asynchronous events

### Workflow Types

- **Sequential** - Agents work in sequence
- **Parallel** - Agents work simultaneously
- **Hierarchical** - Manager-worker pattern
- **Collaborative** - Peer-to-peer collaboration

## Key Features

### Session Management

- Create team sessions
- Configure agent participants
- Define workflows
- Track progress

### Agent Orchestration

- Automatic task assignment
- Load balancing
- Capability matching
- Conflict resolution

### MCP Integration

- Shared MCP servers
- Tool coordination
- Resource sharing
- Protocol compliance

### Communication

- Secure message passing
- Event-driven architecture
- Async/sync modes
- Message routing

## Usage Patterns

### Creating a Team

```typescript
const team = await teamService.createSession({
  name: 'Analysis Team',
  agents: [
    { id: 'coordinator', role: 'coordinator' },
    { id: 'analyst', role: 'specialist' },
    { id: 'reviewer', role: 'reviewer' },
  ],
  workflow: 'parallel',
});
```

### Task Assignment

```typescript
await team.assignTask({
  agentId: 'analyst',
  task: 'Analyze financial data',
  context: { ... }
})
```

### Inter-Agent Communication

```typescript
await team.sendMessage({
  from: 'coordinator',
  to: 'analyst',
  content: 'Please analyze this data',
});
```

## Related Documentation

- [tests/integration/team-\*.test.ts](../../../tests/integration/) - Team integration tests
- [docs/tech/team-mode-performance.md](../../../docs/tech/team-mode-performance.md) - Performance analysis
- [src/process/agent/](../agent/) - Agent implementations
