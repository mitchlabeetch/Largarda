# Team Orchestration

## Overview

Multi-agent team orchestration in Largo, including team configuration, workflow design, agent coordination, and execution management.

## Team Architecture

### Team Structure

```typescript
interface Team {
  id: string;
  name: string;
  description?: string;

  // Agents
  agents: TeamAgent[];

  // Workflow
  workflow: Workflow;

  // Configuration
  config: TeamConfig;

  // State
  state: TeamState;
}

interface TeamAgent {
  agentId: string;
  role: AgentRole;
  capabilities: string[];
  config: AgentConfig;
}

interface AgentRole {
  name: string; // e.g., 'coordinator', 'executor', 'validator'
  responsibilities: string[];
  permissions: Permission[];
}
```

### Common Team Patterns

#### 1. Coordinator-Executor Pattern

One coordinator agent delegates tasks to multiple executor agents.

```
Coordinator
    ↓
    ├─→ Executor 1
    ├─→ Executor 2
    └─→ Executor 3
```

**Use Cases**: Parallel task execution, distributed processing

#### 2. Pipeline Pattern

Agents process data in sequence, each adding value.

```
Agent 1 → Agent 2 → Agent 3 → Agent 4
```

**Use Cases**: Data processing pipelines, multi-step workflows

#### 3. Peer-to-Peer Pattern

Agents communicate directly without central coordinator.

```
Agent 1 ↔ Agent 2 ↔ Agent 3
     ↕         ↕
   Agent 4 ↔ Agent 5
```

**Use Cases**: Collaborative problem solving, distributed consensus

#### 4. Hierarchical Pattern

Multi-level hierarchy with coordinators at each level.

```
         Coordinator
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Sub-coordinator 1  Sub-coordinator 2
    ↓                   ↓
  Agents              Agents
```

**Use Cases**: Complex organizations, large-scale coordination

---

## Workflow Definition

### Workflow Structure

```typescript
interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  variables: WorkflowVariables;
  triggers: WorkflowTrigger[];
}

interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  agent: string; // Agent ID or role
  input: StepInput;
  output: StepOutput;
  conditions?: Condition[];
  onError: ErrorHandling;
}

type StepType = 'task' | 'decision' | 'parallel' | 'sequential' | 'loop';
```

### Workflow Patterns

#### Sequential Execution

```typescript
{
  type: 'sequential',
  steps: [
    { agent: 'agent-1', task: 'preprocess' },
    { agent: 'agent-2', task: 'analyze' },
    { agent: 'agent-3', task: 'postprocess' }
  ]
}
```

#### Parallel Execution

```typescript
{
  type: 'parallel',
  steps: [
    { agent: 'agent-1', task: 'task-a' },
    { agent: 'agent-2', task: 'task-b' },
    { agent: 'agent-3', task: 'task-c' }
  ]
}
```

#### Conditional Branching

```typescript
{
  type: 'decision',
  condition: 'score > 0.8',
  branches: {
    true: { agent: 'agent-1', task: 'approve' },
    false: { agent: 'agent-2', task: 'review' }
  }
}
```

#### Loop Execution

```typescript
{
  type: 'loop',
  iterations: 5,
  step: { agent: 'agent-1', task: 'process-item' }
}
```

---

## Agent Roles

### Coordinator

- **Responsibilities**: Task delegation, result aggregation, decision making
- **Capabilities**: Communication, decision logic, state management
- **Permissions**: Read/write team state, delegate tasks

### Executor

- **Responsibilities**: Task execution, result reporting
- **Capabilities**: Domain-specific skills, tool usage
- **Permissions**: Execute assigned tasks, report results

### Validator

- **Responsibilities**: Result validation, quality checks
- **Capabilities**: Verification logic, quality metrics
- **Permissions**: Read results, validate, flag issues

### Observer

- **Responsibilities**: Monitoring, logging, alerting
- **Capabilities**: Event detection, metric collection
- **Permissions**: Read-only access, emit alerts

---

## Execution Management

### Execution Lifecycle

#### 1. Initialization

```typescript
async function initializeTeam(team: Team): Promise<void> {
  // Load agent configurations
  for (const agent of team.agents) {
    await agentRegistry.initialize(agent.agentId, agent.config);
  }

  // Initialize workflow state
  team.state = {
    status: 'initialized',
    variables: {},
    stepResults: {},
  };
}
```

#### 2. Execution

```typescript
async function executeWorkflow(team: Team, input: any): Promise<WorkflowResult> {
  team.state.status = 'running';

  for (const step of team.workflow.steps) {
    const result = await executeStep(team, step, input);
    team.state.stepResults[step.id] = result;

    // Check conditions
    if (step.conditions) {
      const shouldContinue = evaluateConditions(step.conditions, team.state);
      if (!shouldContinue) break;
    }
  }

  team.state.status = 'completed';
  return aggregateResults(team.state.stepResults);
}
```

#### 3. Step Execution

```typescript
async function executeStep(team: Team, step: WorkflowStep, input: any): Promise<StepResult> {
  const agent = resolveAgent(team, step.agent);

  try {
    const result = await agent.execute(step.input);
    return { status: 'success', data: result };
  } catch (error) {
    return handleStepError(step, error, team);
  }
}
```

#### 4. Cleanup

```typescript
async function cleanupTeam(team: Team): Promise<void> {
  // Release resources
  for (const agent of team.agents) {
    await agentRegistry.cleanup(agent.agentId);
  }

  // Persist state
  await stateStore.save(team.id, team.state);

  team.state.status = 'cleanup';
}
```

---

## State Management

### Team State

```typescript
interface TeamState {
  status: TeamStatus;
  variables: Record<string, any>;
  stepResults: Record<string, StepResult>;
  currentStep?: string;
  error?: Error;
  metadata: {
    startedAt: number;
    completedAt?: number;
    duration?: number;
  };
}

type TeamStatus = 'initialized' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
```

### State Persistence

```typescript
// Save state
async function saveState(teamId: string, state: TeamState): Promise<void> {
  await stateStore.set(`team:${teamId}:state`, state);
}

// Load state
async function loadState(teamId: string): Promise<TeamState> {
  return await stateStore.get(`team:${teamId}:state`);
}

// Update state
async function updateState(teamId: string, updates: Partial<TeamState>): Promise<void> {
  const state = await loadState(teamId);
  const updated = { ...state, ...updates };
  await saveState(teamId, updated);
}
```

---

## Error Handling

### Error Types

| Error Type             | Description                | Recovery Strategy          |
| ---------------------- | -------------------------- | -------------------------- |
| **AgentError**         | Agent execution failed     | Retry with different agent |
| **TimeoutError**       | Step execution timed out   | Increase timeout or skip   |
| **ValidationError**    | Result validation failed   | Flag for manual review     |
| **CommunicationError** | Agent communication failed | Reconnect and retry        |
| **StateError**         | Invalid state transition   | Reset to valid state       |

### Error Handling Strategies

#### Retry with Backoff

```typescript
async function executeWithRetry(step: WorkflowStep, maxRetries: number = 3): Promise<StepResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await executeStep(step);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
}
```

#### Fallback Agent

```typescript
async function executeWithFallback(step: WorkflowStep, fallbackAgents: string[]): Promise<StepResult> {
  const agents = [step.agent, ...fallbackAgents];

  for (const agentId of agents) {
    try {
      const agent = agentRegistry.get(agentId);
      return await agent.execute(step.input);
    } catch (error) {
      logger.warn(`Agent ${agentId} failed, trying next`, error);
    }
  }

  throw new Error('All agents failed');
}
```

#### Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute(fn: () => Promise<any>): Promise<any> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > 60000) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= 5) {
      this.state = 'open';
    }
  }
}
```

---

## Monitoring and Observability

### Metrics

```typescript
interface TeamMetrics {
  executionTime: number;
  stepExecutionTimes: Record<string, number>;
  agentExecutionTimes: Record<string, number>;
  successRate: number;
  errorRate: number;
  throughput: number;
}
```

### Logging

```typescript
// Log team events
async function logTeamEvent(teamId: string, event: TeamEvent): Promise<void> {
  await eventLog.append({
    teamId,
    timestamp: Date.now(),
    event,
  });
}

interface TeamEvent {
  type: 'started' | 'completed' | 'failed' | 'step_started' | 'step_completed';
  stepId?: string;
  agentId?: string;
  data?: any;
}
```

### Tracing

```typescript
// Distributed tracing
async function traceExecution(teamId: string, workflowId: string): Promise<Trace> {
  const trace = {
    id: generateTraceId(),
    teamId,
    workflowId,
    spans: [],
  };

  // Add span for each step
  for (const step of workflow.steps) {
    const span = await traceStep(step);
    trace.spans.push(span);
  }

  return trace;
}
```

---

## Optimization Strategies

### Parallel Execution

```typescript
// Execute independent steps in parallel
async function executeParallelSteps(steps: WorkflowStep[]): Promise<StepResult[]> {
  return Promise.all(steps.map((step) => executeStep(step)));
}
```

### Resource Pooling

```typescript
// Reuse agent instances
class AgentPool {
  private pool = new Map<string, Agent>();

  async get(agentId: string): Promise<Agent> {
    if (!this.pool.has(agentId)) {
      this.pool.set(agentId, await createAgent(agentId));
    }
    return this.pool.get(agentId);
  }

  async release(agentId: string): Promise<void> {
    // Keep in pool for reuse
  }
}
```

### Caching

```typescript
// Cache step results
class ResultCache {
  private cache = new Map<string, StepResult>();

  async get(stepId: string, input: any): Promise<StepResult | null> {
    const key = `${stepId}:${hash(input)}`;
    return this.cache.get(key) || null;
  }

  async set(stepId: string, input: any, result: StepResult): Promise<void> {
    const key = `${stepId}:${hash(input)}`;
    this.cache.set(key, result);
  }
}
```

---

## Best Practices

### Team Design

- **Clear roles**: Define distinct agent roles with clear responsibilities
- **Minimal dependencies**: Reduce coupling between agents
- **Fail-safe design**: Design for graceful degradation
- **Idempotent steps**: Ensure steps can be safely retried

### Workflow Design

- **Modular steps**: Keep steps focused and reusable
- **Clear inputs/outputs**: Define explicit step interfaces
- **Error handling**: Plan for errors at each step
- **Progress tracking**: Include progress indicators

### Execution

- **Timeouts**: Set appropriate timeouts for each step
- **Retries**: Implement retry logic for transient failures
- **Logging**: Log all important events and decisions
- **Monitoring**: Monitor execution metrics and health

---

## Related Documentation

- [src/process/team/](../../../src/process/team/) - Team implementation
- [docs/domain/agents/agent-types.md](./agent-types.md) - Agent types
- [docs/domain/agents/agent-communication.md](./agent-communication.md) - Agent communication
- [docs/domain/agents/mcp-integration.md](./mcp-integration.md) - MCP integration
