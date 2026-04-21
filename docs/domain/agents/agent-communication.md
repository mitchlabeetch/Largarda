# Agent Communication Patterns

## Overview

Communication patterns and protocols for inter-agent communication in Largo. Covers message passing, coordination, and collaboration between agents.

## Communication Models

### 1. Direct Message Passing

#### Description

Point-to-point communication where one agent sends a message directly to another agent.

#### Use Cases

- Request/response patterns
- Direct delegation
- Simple coordination
- Agent-to-agent queries

#### Implementation

```typescript
// Direct message interface
interface DirectMessage {
  from: AgentId;
  to: AgentId;
  type: MessageType;
  payload: any;
  timestamp: number;
  id: string;
}

// Send direct message
async function sendDirectMessage(from: AgentId, to: AgentId, message: DirectMessage): Promise<MessageResponse> {
  const response = await agentRegistry.get(to).receive(message);
  return response;
}
```

#### Advantages

- Simple and straightforward
- Low latency
- Easy to implement
- Direct control

#### Limitations

- Tight coupling between agents
- No broadcast capability
- Limited scalability
- No built-in routing

---

### 2. Publish/Subscribe (Pub/Sub)

#### Description

Agents publish messages to topics, and other agents subscribe to topics of interest.

#### Use Cases

- Event broadcasting
- Loose coupling
- Multi-agent notifications
- Event-driven architectures

#### Implementation

```typescript
// Pub/Sub interface
interface PubSubMessage {
  topic: string;
  payload: any;
  publisher: AgentId;
  timestamp: number;
}

// Subscribe to topic
function subscribe(topic: string, agent: AgentId, handler: Handler) {
  eventBus.on(topic, handler);
}

// Publish to topic
async function publish(topic: string, message: PubSubMessage) {
  eventBus.emit(topic, message);
}
```

#### Advantages

- Loose coupling
- Scalable to many subscribers
- Event-driven
- Flexible routing

#### Limitations

- No guaranteed delivery
- Complex error handling
- Message ordering not guaranteed
- Potential for message storms

---

### 3. Request/Response

#### Description

Synchronous communication pattern where an agent sends a request and waits for a response.

#### Use Cases

- Query operations
- Data retrieval
- Synchronous tasks
- RPC-style communication

#### Implementation

```typescript
// Request/Response interface
interface Request {
  id: string;
  method: string;
  params: any;
  timeout?: number;
}

interface Response {
  id: string;
  result?: any;
  error?: Error;
  timestamp: number;
}

// Send request
async function sendRequest(target: AgentId, request: Request): Promise<Response> {
  const agent = agentRegistry.get(target);
  const response = await agent.handleRequest(request);
  return response;
}
```

#### Advantages

- Simple to understand
- Clear request/response pairing
- Easy to debug
- Timeout handling

#### Limitations

- Blocking for caller
- Not suitable for long-running tasks
- Limited scalability
- Tight coupling

---

### 4. Streaming Communication

#### Description

Continuous stream of data between agents, useful for real-time updates and large data transfers.

#### Use Cases

- Real-time data streams
- Progress updates
- Large file transfers
- Live monitoring

#### Implementation

```typescript
// Streaming interface
interface StreamMessage {
  streamId: string;
  chunk: any;
  index: number;
  isComplete: boolean;
}

// Create stream
async function createStream(source: AgentId, target: AgentId): Promise<string> {
  const streamId = generateId();
  await agentRegistry.get(target).prepareStream(streamId);
  return streamId;
}

// Send chunk
async function sendChunk(streamId: string, chunk: any): Promise<void> {
  const stream = streamRegistry.get(streamId);
  await stream.write(chunk);
}

// Read from stream
async function* readStream(streamId: string): AsyncGenerator<any> {
  const stream = streamRegistry.get(streamId);
  for await (const chunk of stream) {
    yield chunk;
  }
}
```

#### Advantages

- Efficient for large data
- Real-time updates
- Backpressure support
- Memory efficient

#### Limitations

- More complex implementation
- Error handling complexity
- Stream management overhead
- Not all agents support streaming

---

### 5. Broadcast Communication

#### Description

One agent sends a message to multiple agents simultaneously.

#### Use Cases

- Announcements
- Coordination signals
- State synchronization
- Emergency alerts

#### Implementation

```typescript
// Broadcast interface
interface BroadcastMessage {
  from: AgentId;
  to: AgentId[]; // Multiple recipients
  payload: any;
  timestamp: number;
}

// Send broadcast
async function broadcast(message: BroadcastMessage): Promise<Response[]> {
  const promises = message.to.map((agentId) => {
    return agentRegistry.get(agentId).receive(message);
  });
  return Promise.all(promises);
}
```

#### Advantages

- Efficient for multiple recipients
- Parallel delivery
- Consistent message
- Good for coordination

#### Limitations

- No recipient-specific customization
- All recipients must handle message
- Error handling complexity
- Potential for partial failures

---

## Message Protocols

### Standard Message Format

```typescript
interface AgentMessage {
  // Metadata
  id: string;
  timestamp: number;
  version: string;

  // Routing
  from: AgentId;
  to: AgentId | AgentId[] | string; // topic

  // Content
  type: MessageType;
  payload: any;

  // Options
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  ttl?: number; // Time to live in milliseconds
  requiresAck?: boolean;
  correlationId?: string;
}
```

### Message Types

| Type           | Description                | Use Case           |
| -------------- | -------------------------- | ------------------ |
| `request`      | Request for action or data | Query operations   |
| `response`     | Response to a request      | Request replies    |
| `notification` | One-way notification       | Events, alerts     |
| `command`      | Command to execute         | Task delegation    |
| `status`       | Status update              | Progress reporting |
| `error`        | Error notification         | Error handling     |
| `heartbeat`    | Liveness signal            | Health checks      |
| `discovery`    | Agent discovery            | Service discovery  |

---

## Coordination Patterns

### 1. Leader Election

#### Description

Agents elect a leader to coordinate activities and make decisions.

#### Use Cases

- Distributed coordination
- Conflict resolution
- Resource management
- Decision making

#### Implementation

```typescript
// Leader election interface
interface LeaderElection {
  candidates: AgentId[];
  leader: AgentId | null;
  term: number;
}

// Elect leader
async function electLeader(candidates: AgentId[]): Promise<AgentId> {
  const votes = await Promise.all(candidates.map((id) => agentRegistry.get(id).vote(candidates)));

  // Count votes
  const voteCounts = votes.reduce((acc, vote) => {
    acc[vote] = (acc[vote] || 0) + 1;
    return acc;
  }, {});

  // Return winner
  return Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0][0];
}
```

---

### 2. Distributed Lock

#### Description

Agents coordinate access to shared resources using distributed locks.

#### Use Cases

- Resource synchronization
- Mutual exclusion
- Conflict prevention
- Critical section protection

#### Implementation

```typescript
// Distributed lock interface
interface DistributedLock {
  resourceId: string;
  owner: AgentId | null;
  expiresAt: number | null;
}

// Acquire lock
async function acquireLock(resourceId: string, agentId: AgentId, ttl: number): Promise<boolean> {
  const lock = await lockStore.get(resourceId);

  if (!lock || lock.expiresAt < Date.now()) {
    await lockStore.set(resourceId, {
      resourceId,
      owner: agentId,
      expiresAt: Date.now() + ttl,
    });
    return true;
  }

  return false;
}

// Release lock
async function releaseLock(resourceId: string, agentId: AgentId): Promise<void> {
  const lock = await lockStore.get(resourceId);
  if (lock?.owner === agentId) {
    await lockStore.delete(resourceId);
  }
}
```

---

### 3. Barrier Synchronization

#### Description

Agents wait at a barrier until all agents reach it, then proceed together.

#### Use Cases

- Synchronized execution
- Phase coordination
- Collective operations
- Distributed snapshots

#### Implementation

```typescript
// Barrier interface
interface Barrier {
  id: string;
  participants: AgentId[];
  arrived: Set<AgentId>;
}

// Wait at barrier
async function awaitBarrier(barrierId: string, agentId: AgentId): Promise<void> {
  const barrier = await barrierStore.get(barrierId);
  barrier.arrived.add(agentId);

  if (barrier.arrived.size === barrier.participants.length) {
    // All arrived, release all
    await barrierStore.delete(barrierId);
    // Notify all participants
    for (const participant of barrier.participants) {
      await agentRegistry.get(participant).notifyBarrierRelease(barrierId);
    }
  } else {
    // Wait for others
    await waitForBarrierRelease(barrierId);
  }
}
```

---

### 4. Consensus

#### Description

Agents agree on a value or decision through consensus algorithm.

#### Use Cases

- Decision making
- State replication
- Configuration agreement
- Conflict resolution

#### Implementation

```typescript
// Consensus interface
interface ConsensusProposal {
  id: string;
  proposer: AgentId;
  value: any;
  round: number;
}

// Propose value
async function propose(proposal: ConsensusProposal): Promise<any> {
  const participants = await getParticipants();

  // Send proposal to all
  const promises = participants.map((id) => {
    return agentRegistry.get(id).receiveProposal(proposal);
  });
  const responses = await Promise.all(promises);

  // Check if majority agreed
  const agreements = responses.filter((r) => r.agreed).length;
  if (agreements > participants.length / 2) {
    return proposal.value;
  }

  // Retry with new round
  return propose({ ...proposal, round: proposal.round + 1 });
}
```

---

## Error Handling

### Error Propagation

```typescript
interface ErrorMessage {
  error: Error;
  source: AgentId;
  target: AgentId;
  timestamp: number;
  recoverable: boolean;
}

// Propagate error
async function propagateError(error: ErrorMessage): Promise<void> {
  // Log error
  logger.error(error);

  if (error.recoverable) {
    // Attempt recovery
    await attemptRecovery(error);
  } else {
    // Notify interested parties
    await publish('agent:error', error);
  }
}
```

### Retry Strategies

| Strategy                | Description                    | Use Case                   |
| ----------------------- | ------------------------------ | -------------------------- |
| **Immediate retry**     | Retry immediately              | Transient errors           |
| **Exponential backoff** | Increase delay between retries | Rate limits                |
| **Fixed delay**         | Constant delay between retries | Predictable patterns       |
| **Circuit breaker**     | Stop retrying after failures   | Prevent cascading failures |

---

## Security Considerations

### Authentication

- Agent identity verification
- Token-based authentication
- Certificate-based authentication
- Mutual authentication

### Authorization

- Role-based access control
- Capability-based authorization
- Permission checks
- Policy enforcement

### Encryption

- Message encryption in transit
- End-to-end encryption
- Key management
- Secure key exchange

### Audit Logging

- Message logging
- Access logging
- Security event logging
- Compliance reporting

---

## Performance Optimization

### Message Batching

```typescript
// Batch multiple messages
async function sendBatch(messages: AgentMessage[]): Promise<void> {
  const batch = {
    messages,
    timestamp: Date.now(),
  };
  await transport.send(batch);
}
```

### Message Compression

```typescript
// Compress large payloads
async function compressMessage(message: AgentMessage): Promise<AgentMessage> {
  if (JSON.stringify(message.payload).length > 1024) {
    message.payload = await compress(message.payload);
    message.compressed = true;
  }
  return message;
}
```

### Connection Pooling

```typescript
// Reuse connections
const connectionPool = new Map<AgentId, Connection>();

async function getConnection(agentId: AgentId): Promise<Connection> {
  if (!connectionPool.has(agentId)) {
    connectionPool.set(agentId, await establishConnection(agentId));
  }
  return connectionPool.get(agentId);
}
```

---

## Monitoring and Observability

### Metrics

- Message throughput
- Message latency
- Error rate
- Queue depth
- Connection pool utilization

### Tracing

- Message flow tracing
- Distributed tracing
- Request correlation
- Causality tracking

### Logging

- Message logs
- Communication logs
- Error logs
- Performance logs

---

## Related Documentation

- [src/process/team/](../../../src/process/team/) - Team implementation
- [docs/domain/agents/team-orchestration.md](./team-orchestration.md) - Team orchestration
- [docs/domain/agents/agent-types.md](./agent-types.md) - Agent types
- [docs/domain/agents/mcp-integration.md](./mcp-integration.md) - MCP integration
