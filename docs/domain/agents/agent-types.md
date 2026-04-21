# Agent Types

## Overview

Comprehensive guide to all AI agent types available in Largo, their use cases, capabilities, and implementation details.

## Agent Categories

### 1. ACP Agent (Aion CLI Agent)

#### Description

Integration with Aion CLI (ACP) for command execution, file operations, and system-level tasks.

#### Capabilities

- Execute shell commands
- File system operations (read, write, delete, watch)
- Process management
- System information gathering
- Script execution

#### Use Cases

- System administration tasks
- File processing and manipulation
- Build and deployment automation
- System monitoring and diagnostics
- Batch file operations

#### Configuration

```typescript
{
  type: 'acp',
  command: 'ls -la',
  workingDirectory: '/path/to/directory',
  timeout: 30000,
  environment: {
    PATH: '/usr/local/bin:/usr/bin'
  }
}
```

#### Implementation

- **Location**: `src/process/agent/acp/`
- **Key Files**:
  - `acpAgent.ts` - Main ACP agent implementation
  - `commandExecutor.ts` - Command execution logic
  - `fileOperations.ts` - File system operations

#### Limitations

- Requires Aion CLI installation
- Platform-specific (Unix-like systems preferred)
- Security concerns with arbitrary command execution
- No built-in sandboxing

---

### 2. AionRS Agent

#### Description

High-performance native agent implemented in Rust for CPU-intensive operations.

#### Capabilities

- High-performance computation
- Native code execution
- Memory-efficient processing
- Parallel processing
- Low-latency operations

#### Use Cases

- Data processing and transformation
- Complex calculations
- Performance-critical operations
- Large dataset processing
- Algorithm execution

#### Configuration

```typescript
{
  type: 'aionrs',
  module: 'data-processing',
  function: 'transform',
  input: { data: [...] },
  parallelism: 4
}
```

#### Implementation

- **Location**: `src/process/agent/aionrs/`
- **Key Files**:
  - `aionrsAgent.ts` - Rust agent interface
  - `nativeBinding.ts` - Native bindings
  - `performanceMonitor.ts` - Performance tracking

#### Advantages

- Superior performance for CPU-bound tasks
- Memory safety (Rust guarantees)
- Low overhead
- Excellent for parallel processing

#### Limitations

- Requires Rust compilation
- Limited to predefined modules
- Less flexible than scriptable agents
- Platform-specific compilation

---

### 3. Flowise Agent

#### Description

Integration with FlowiseAI for visual workflow automation and node-based task execution.

#### Capabilities

- Visual workflow design
- Node-based task composition
- Drag-and-drop workflow creation
- Workflow execution and monitoring
- Integration with external APIs

#### Use Cases

- Complex multi-step workflows
- API integration and orchestration
- Data pipeline automation
- Business process automation
- Custom workflow creation

#### Configuration

```typescript
{
  type: 'flowise',
  workflowId: 'workflow-uuid',
  inputs: {
    param1: 'value1',
    param2: 'value2'
  },
  executionMode: 'sync' // or 'async'
}
```

#### Implementation

- **Location**: `src/process/agent/flowise/`
- **Key Files**:
  - `flowiseAgent.ts` - Flowise integration
  - `workflowExecutor.ts` - Workflow execution
  - `nodeRegistry.ts` - Node type registry

#### Advantages

- Visual, no-code workflow design
- Easy to create complex workflows
- Extensible node system
- Good for non-technical users
- Built-in workflow monitoring

#### Limitations

- Requires FlowiseAI server
- Limited to available node types
- May have performance overhead
- Less control than code-based solutions

---

### 4. Gemini Agent

#### Description

Google Gemini API integration for multimodal AI capabilities including text, images, and code.

#### Capabilities

- Multimodal understanding (text, images, audio, video)
- Code generation and analysis
- Advanced reasoning
- Long context window (up to 1M tokens)
- Function calling
- Streaming responses

#### Use Cases

- Multimodal content analysis
- Code generation and review
- Complex reasoning tasks
- Long-context conversations
- Image and video understanding
- Document analysis with images

#### Configuration

```typescript
{
  type: 'gemini',
  model: 'gemini-1.5-pro',
  apiKey: '...',
  temperature: 0.7,
  maxTokens: 8192,
  topP: 0.95,
  topK: 40,
  tools: [
    {
      name: 'search',
      description: 'Search database',
      parameters: { type: 'object', properties: {...} }
    }
  ]
}
```

#### Implementation

- **Location**: `src/process/agent/gemini/`
- **Key Files**:
  - `geminiAgent.ts` - Gemini API integration
  - `multimodalHandler.ts` - Multimodal content handling
  - `subscriptionManager.ts` - Subscription management

#### Advantages

- Multimodal capabilities
- Large context window
- Strong reasoning abilities
- Google ecosystem integration
- Competitive pricing

#### Limitations

- Requires Google Cloud API key
- Rate limits apply
- Subscription required for advanced features
- Limited to Google models

---

### 5. Nanobot Agent

#### Description

Lightweight, fast agent designed for quick tasks and simple operations.

#### Capabilities

- Fast response times
- Low resource usage
- Simple task execution
- Basic reasoning
- Quick Q&A

#### Use Cases

- Quick information lookup
- Simple question answering
- Fast text processing
- Basic classification
- Lightweight automation

#### Configuration

```typescript
{
  type: 'nanobot',
  model: 'fast-model',
  maxTokens: 512,
  temperature: 0.5
}
```

#### Implementation

- **Location**: `src/process/agent/nanobot/`
- **Key Files**:
  - `nanobotAgent.ts` - Lightweight agent implementation
  - `fastInference.ts` - Fast inference engine
  - `cacheManager.ts` - Response caching

#### Advantages

- Very fast response times
- Low memory footprint
- Simple to use
- Good for high-frequency tasks
- Cost-effective

#### Limitations

- Limited capabilities
- Small context window
- Basic reasoning only
- Not suitable for complex tasks

---

### 6. OpenClaw Agent

#### Description

Open-source agent framework implementation for collaborative features and open-source AI integration.

#### Capabilities

- Open-source model support
- Collaborative features
- Community-driven tools
- Extensible architecture
- Model-agnostic design

#### Use Cases

- Open-source model integration
- Community tool usage
- Collaborative AI tasks
- Custom model deployment
- Research and experimentation

#### Configuration

```typescript
{
  type: 'openclaw',
  model: 'llama-3-70b',
  endpoint: 'http://localhost:11434',
  tools: [
    { name: 'web-search', handler: '...' },
    { name: 'code-exec', handler: '...' }
  ]
}
```

#### Implementation

- **Location**: `src/process/agent/openclaw/`
- **Key Files**:
  - `openclawAgent.ts` - OpenClaw integration
  - `modelLoader.ts` - Model loading
  - `toolRegistry.ts` - Community tools

#### Advantages

- Open-source flexibility
- No vendor lock-in
- Community support
- Custom model support
- Extensible tool ecosystem

#### Limitations

- Requires self-hosting
- Variable model quality
- Less polished than commercial APIs
- Requires technical expertise

---

### 7. Remote Agent

#### Description

Distributed agent execution across multiple machines or cloud services.

#### Capabilities

- Remote execution
- Distributed processing
- Load balancing
- Fault tolerance
- Scalable execution

#### Use Cases

- Distributed computing
- Cloud-based processing
- Multi-machine workflows
- Scalable AI inference
- Remote API integration

#### Configuration

```typescript
{
  type: 'remote',
  endpoint: 'https://remote-agent.example.com',
  authentication: {
    type: 'jwt',
    token: '...'
  },
  timeout: 60000,
  retryPolicy: {
    maxRetries: 3,
    backoff: 'exponential'
  }
}
```

#### Implementation

- **Location**: `src/process/agent/remote/`
- **Key Files**:
  - `remoteAgent.ts` - Remote execution client
  - `connectionPool.ts` - Connection management
  - `loadBalancer.ts` - Load balancing

#### Advantages

- Scalable execution
- Resource isolation
- Fault tolerance
- Geographic distribution
- Cloud integration

#### Limitations

- Network latency
- Requires remote infrastructure
- Security considerations
- Complexity in deployment

---

## Agent Selection Guide

### Decision Matrix

| Requirement                  | Recommended Agent  |
| ---------------------------- | ------------------ |
| System commands              | ACP                |
| High-performance computation | AionRS             |
| Visual workflows             | Flowise            |
| Multimodal AI                | Gemini             |
| Fast/simple tasks            | Nanobot            |
| Open-source models           | OpenClaw           |
| Distributed execution        | Remote             |
| General purpose              | Gemini or OpenClaw |

### Performance Comparison

| Agent    | Speed     | Resource Usage | Capabilities | Cost     |
| -------- | --------- | -------------- | ------------ | -------- |
| ACP      | Medium    | Medium         | System ops   | Low      |
| AionRS   | Very Fast | Low            | Computation  | Low      |
| Flowise  | Slow      | High           | Workflows    | Medium   |
| Gemini   | Medium    | Medium         | Multimodal   | Medium   |
| Nanobot  | Very Fast | Very Low       | Basic        | Low      |
| OpenClaw | Variable  | Variable       | Flexible     | Variable |
| Remote   | Slow      | N/A            | Distributed  | Variable |

### Use Case Examples

#### Scenario 1: File Processing Pipeline

**Best Agent**: AionRS (for processing) + ACP (for file ops)

```
ACP: Watch directory → AionRS: Process files → ACP: Move results
```

#### Scenario 2: Customer Support Bot

**Best Agent**: Gemini (for understanding) + Flowise (for workflow)

```
Gemini: Understand query → Flowise: Execute workflow → Gemini: Format response
```

#### Scenario 3: Code Review Assistant

**Best Agent**: Gemini (for code analysis) + OpenClaw (for custom rules)

```
Gemini: Analyze code → OpenClaw: Run custom linters → Gemini: Summarize
```

#### Scenario 4: Quick Q&A

**Best Agent**: Nanobot

```
Nanobot: Fast lookup → Response
```

---

## Agent Configuration

### Common Configuration Options

```typescript
interface AgentConfig {
  // Identification
  id: string;
  name: string;
  description?: string;

  // Model Configuration
  type: AgentType;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;

  // Capabilities
  tools?: Tool[];
  systemPrompt?: string;
  contextWindow?: number;

  // Execution
  timeout?: number;
  retryPolicy?: RetryPolicy;
  streaming?: boolean;

  // Authentication
  apiKey?: string;
  authentication?: AuthConfig;

  // Advanced
  customParameters?: Record<string, any>;
}
```

### Tool Configuration

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ParameterSchema>;
    required?: string[];
  };
  handler?: string | Function;
}
```

---

## Agent Lifecycle

### Initialization

1. Load configuration
2. Initialize API connections
3. Register tools
4. Set up event handlers
5. Warm up (if applicable)

### Execution

1. Receive request
2. Process input
3. Execute task
4. Return response
5. Handle errors
6. Update state

### Cleanup

1. Close connections
2. Release resources
3. Persist state
4. Unregister handlers

---

## Error Handling

### Common Error Types

- **ConfigurationError**: Invalid configuration
- **AuthenticationError**: API key or auth failure
- **RateLimitError**: API rate limit exceeded
- **TimeoutError**: Operation timed out
- **NetworkError**: Network connectivity issues
- **ExecutionError**: Task execution failed

### Error Recovery Strategies

- **Retry with backoff**: For transient errors
- **Fallback agent**: Switch to alternative agent
- **Graceful degradation**: Reduce capabilities
- **User notification**: Inform user of issues

---

## Monitoring and Observability

### Metrics to Track

- **Response time**: Time to generate response
- **Token usage**: Input/output token counts
- **Error rate**: Frequency of errors
- **Success rate**: Percentage of successful executions
- **Resource usage**: CPU, memory, network

### Logging

- Request/response logs
- Error logs with stack traces
- Performance metrics
- Tool execution logs
- State changes

---

## Related Documentation

- [src/process/agent/](../../../src/process/agent/) - Agent implementations
- [docs/onboarding/agent-development.md](../onboarding/agent-development.md) - Agent development guide
- [docs/domain/agents/agent-communication.md](./agent-communication.md) - Agent communication
- [docs/domain/agents/team-orchestration.md](./team-orchestration.md) - Team orchestration
