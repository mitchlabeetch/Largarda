# Team Collaboration Data Flow

## Overview

Documentation of data flow in the multi-agent team collaboration system, including agent coordination, communication, and task distribution.

## Architecture

```
┌──────────────┐
│   User       │
│   (Request)  │
└──────┬───────┘
       │ Create team
┌──────▼──────────────────────┐
│   TeamSessionService        │
│   - Create team session     │
│   - Configure agents        │
│   - Define workflow         │
└──────┬──────────────────────┘
       │ Initialize
┌──────▼──────────────────────┐
│   TeamSession               │
│   - Agent registration      │
│   - Role assignment         │
│   - State management        │
└──────┬──────────────────────┘
       │ Assign task
┌──────▼──────────────────────┐
│   TaskManager               │
│   - Task queue              │
│   - Agent matching          │
│   - Load balancing          │
└──────┬──────────────────────┘
       │ Distribute
┌──────▼──────────────────────┐
│   Agent 1 (Coordinator)     │
│   - Analyze request         │
│   - Delegate subtasks       │
└──────┬──────────────────────┘
       │ Send task
┌──────▼──────────────────────┐
│   Mailbox                   │
│   - Message passing         │
│   - Event routing           │
└──────┬──────────────────────┘
       │ Route
┌──────▼──────────────────────┐
│   Agent 2 (Specialist)      │
│   - Execute task            │
│   - Generate response       │
└──────┬──────────────────────┘
       │ Send result
┌──────▼──────────────────────┐
│   Mailbox                   │
│   - Route back              │
└──────┬──────────────────────┘
       │ Aggregate
┌──────▼──────────────────────┐
│   Agent 1 (Coordinator)     │
│   - Aggregate results       │
│ - Synthesize final answer   │
└──────┬──────────────────────┘
       │ Final response
┌──────▼──────────────────────┐
│   TeamSession               │
│   - Update state            │
│   - Store results           │
└──────┬──────────────────────┘
       │ Return
┌──────▼──────────────────────┐
│   User                      │
│   (Result)                  │
└─────────────────────────────┘
```

## Team Creation Flow

### Step 1: Create Team Session

```typescript
// src/process/team/TeamSessionService.ts
async createTeam(config: TeamConfig): Promise<TeamSession> {
  const session = new TeamSession({
    id: generateId(),
    name: config.name,
    agents: config.agents,
    workflow: config.workflow || 'parallel'
  })

  // Register agents
  for (const agentConfig of config.agents) {
    const agent = await agentRegistry.get(agentConfig.id)
    session.registerAgent(agent, agentConfig.role)
  }

  // Initialize session
  await session.initialize()

  // Persist session
  await repository.save(session)

  return session
}
```

### Step 2: Agent Registration

```typescript
// src/process/team/TeammateManager.ts
async registerAgent(agent: Agent, role: string): Promise<void> {
  const teammate = {
    id: agent.id,
    agent,
    role,
    status: 'idle',
    capabilities: agent.getCapabilities()
  }

  this.teammates.set(agent.id, teammate)

  // Subscribe to agent events
  agent.on('message', (msg) => this.handleAgentMessage(agent.id, msg))
  agent.on('status', (status) => this.handleAgentStatus(agent.id, status))
}
```

## Task Distribution Flow

### Step 1: Receive User Request

```typescript
// src/process/team/TeamSessionService.ts
async executeTask(sessionId: string, task: Task): Promise<TaskResult> {
  const session = await repository.findById(sessionId)

  // Add to task queue
  const taskWithId = {
    ...task,
    id: generateId(),
    sessionId,
    status: 'pending',
    createdAt: Date.now()
  }

  session.taskManager.enqueue(taskWithId)

  // Distribute task
  await this.distributeTask(session, taskWithId)

  return await this.waitForCompletion(taskWithId.id)
}
```

### Step 2: Task Distribution

```typescript
// src/process/team/TaskManager.ts
async distributeTask(session: TeamSession, task: Task): Promise<void> {
  const workflow = session.workflow

  if (workflow === 'parallel') {
    // Distribute to all capable agents
    const capableAgents = session.getAgentsByCapability(task.requiredCapability)
    for (const agent of capableAgents) {
      await this.assignTask(agent, task)
    }
  } else if (workflow === 'sequential') {
    // Assign to coordinator first
    const coordinator = session.getAgentByRole('coordinator')
    await this.assignTask(coordinator, task)
  } else if (workflow === 'hierarchical') {
    // Manager-worker pattern
    const manager = session.getAgentByRole('manager')
    await this.assignTask(manager, task)
  }
}
```

### Step 3: Agent Assignment

```typescript
// src/process/team/TaskManager.ts
async assignTask(agent: Agent, task: Task): Promise<void> {
  // Send task via mailbox
  await session.mailbox.send({
    from: 'system',
    to: agent.id,
    type: 'task',
    payload: task
  })

  // Update agent status
  agent.status = 'busy'
}
```

## Inter-Agent Communication

### Mailbox System

```typescript
// src/process/team/Mailbox.ts
class Mailbox {
  private queues: Map<string, Message[]> = new Map();

  async send(message: Message): Promise<void> {
    const queue = this.queues.get(message.to) || [];
    queue.push(message);
    this.queues.set(message.to, queue);

    // Notify recipient
    this.eventBus.emit(`message:${message.to}`, message);
  }

  async receive(agentId: string): Promise<Message | null> {
    const queue = this.queues.get(agentId) || [];
    return queue.shift() || null;
  }

  subscribe(agentId: string, callback: (msg: Message) => void): void {
    this.eventBus.on(`message:${agentId}`, callback);
  }
}
```

### Agent Communication Pattern

```typescript
// Agent A sends message to Agent B
await session.mailbox.send({
  from: agentA.id,
  to: agentB.id,
  type: 'request',
  payload: {
    action: 'analyze',
    data: { ... }
  }
})

// Agent B receives and responds
agentB.onMessage(async (msg) => {
  const result = await agentB.execute(msg.payload)
  await session.mailbox.send({
    from: agentB.id,
    to: msg.from,
    type: 'response',
    payload: result
  })
})
```

## Workflow Patterns

### Sequential Workflow

```
1. Coordinator receives task
2. Coordinator analyzes and breaks into subtasks
3. Coordinator assigns subtask to Agent 2
4. Agent 2 completes subtask
5. Agent 2 sends result to Coordinator
6. Coordinator assigns next subtask to Agent 3
7. Agent 3 completes subtask
8. Agent 3 sends result to Coordinator
9. Coordinator synthesizes final answer
```

### Parallel Workflow

```
1. Coordinator receives task
2. Coordinator breaks into independent subtasks
3. Coordinator assigns subtasks to multiple agents simultaneously
4. All agents work in parallel
5. Agents send results to Coordinator
6. Coordinator waits for all results
7. Coordinator synthesizes final answer
```

### Hierarchical Workflow

```
1. Manager receives task
2. Manager delegates to sub-managers
3. Sub-managers delegate to workers
4. Workers complete tasks
5. Workers report to sub-managers
6. Sub-managers aggregate and report to Manager
7. Manager synthesizes final answer
```

## MCP Integration in Teams

### Shared MCP Servers

```typescript
// src/process/team/mcp/
class TeamMcpManager {
  private sharedServers: Map<string, McpServer> = new Map();

  async registerSharedServer(sessionId: string, server: McpServer): Promise<void> {
    this.sharedServers.set(sessionId, server);

    // Expose to all agents in team
    const session = await repository.findById(sessionId);
    for (const agent of session.agents) {
      await agent.attachMcpServer(server);
    }
  }

  async getSharedTools(sessionId: string): Promise<Tool[]> {
    const server = this.sharedServers.get(sessionId);
    return server?.getTools() || [];
  }
}
```

### Tool Sharing

```typescript
// Agent 1 uses shared tool
const result = await agent1.executeTool('shared:search', {
  query: '...',
});

// Agent 2 uses same shared tool
const result2 = await agent2.executeTool('shared:search', {
  query: '...',
});
```

## State Management

### Session State

```typescript
// src/process/team/TeamSession.ts
class TeamSession {
  state: {
    status: 'idle' | 'active' | 'completed' | 'error';
    currentTask: Task | null;
    agentStates: Map<string, AgentState>;
    taskHistory: Task[];
    results: Map<string, any>;
  };

  updateAgentState(agentId: string, state: Partial<AgentState>): void {
    const current = this.state.agentStates.get(agentId) || {};
    this.state.agentStates.set(agentId, { ...current, ...state });
    this.emit('agentStateChanged', { agentId, state });
  }

  addResult(taskId: string, result: any): void {
    this.state.results.set(taskId, result);
  }
}
```

### Event Bus

```typescript
// src/process/team/teamEventBus.ts
class TeamEventBus {
  on(event: string, callback: (data: any) => void): void {
    // Subscribe to event
  }

  emit(event: string, data: any): void {
    // Emit event to subscribers
  }
}

// Usage
session.on('taskCompleted', (task) => {
  console.log('Task completed:', task.id);
});

session.on('agentError', (error) => {
  console.error('Agent error:', error);
});
```

## Error Handling

### Agent Error Handling

```typescript
// src/process/team/TeamSession.ts
async handleAgentError(agentId: string, error: Error): Promise<void> {
  // Update agent state
  this.updateAgentState(agentId, { status: 'error', error: error.message })

  // Check if task can be reassigned
  const task = this.state.currentTask
  if (task && task.canReassign) {
    const alternativeAgent = this.findAlternativeAgent(task)
    if (alternativeAgent) {
      await this.assignTask(alternativeAgent, task)
      return
    }
  }

  // Mark session as failed if critical
  if (this.isCriticalAgent(agentId)) {
    this.state.status = 'error'
    this.emit('sessionFailed', { error })
  }
}
```

## Related Documentation

- [src/process/team/](../../src/process/team/) - Team system implementation
- [tests/integration/team-\*.test.ts](../../tests/integration/) - Team integration tests
- [docs/tech/team-mode-performance.md](../tech/team-mode-performance.md) - Performance analysis
