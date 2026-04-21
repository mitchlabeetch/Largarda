# src/common/api/ - Multi-Provider AI Client

## Overview

Multi-provider AI client implementations supporting Anthropic Claude, OpenAI GPT, Google Gemini, and AWS Bedrock. Provides unified interface with automatic protocol conversion and key rotation.

## Directory Structure

### Core Components

- **ApiKeyManager.ts** (5KB) - API key management and rotation
  - Secure key storage
  - Automatic key rotation on failure
  - Key validation
  - Usage tracking

- **ClientFactory.ts** (5.5KB) - Factory for creating AI clients
  - Provider selection logic
  - Client instantiation
  - Configuration management
  - Type-safe client creation

- **RotatingApiClient.ts** (4.8KB) - Base rotating API client
  - Automatic retry with key rotation
  - Error handling
  - Rate limit handling
  - Request queuing

- **ProtocolConverter.ts** (1.1KB) - Base protocol conversion interface
  - Defines conversion contract
  - Abstract base class
  - Type definitions

### Provider Implementations

- **AnthropicRotatingClient.ts** (3KB) - Anthropic API client
  - Claude API integration
  - Message format handling
  - Streaming support
  - Tool calling

- **OpenAIRotatingClient.ts** (2.5KB) - OpenAI API client
  - GPT API integration
  - Chat completion
  - Function calling
  - Streaming support

- **GeminiRotatingClient.ts** (3.4KB) - Google Gemini API client
  - Gemini API integration
  - Multimodal support
  - Streaming support
  - Safety filters

### Protocol Converters

- **OpenAI2AnthropicConverter.ts** (9.4KB) - OpenAI to Anthropic protocol conversion
  - Message format translation
  - Tool calling conversion
  - Streaming response handling
  - Error mapping

- **OpenAI2GeminiConverter.ts** (8KB) - OpenAI to Gemini protocol conversion
  - Message format translation
  - Tool calling conversion
  - Multimodal content handling
  - Streaming response handling

### Module Exports

- **index.ts** (466B) - Module exports

## Supported Providers

### Anthropic Claude

- Models: Claude Sonnet, Opus, Haiku
- Features: Streaming, tool calling, long context
- Protocol: Native Anthropic API

### OpenAI

- Models: GPT-4o, GPT-4, o1, o3
- Features: Function calling, streaming, vision
- Protocol: OpenAI Chat Completion API

### Google Gemini

- Models: Gemini Pro, Gemini Flash
- Features: Multimodal, streaming, safety filters
- Protocol: Gemini API

### AWS Bedrock

- Models: Claude, Titan, and more via AWS
- Features: AWS integration, regional deployment
- Protocol: Bedrock Runtime API

## Key Features

### Unified Interface

Single API surface for all providers:

```typescript
const client = ClientFactory.create(provider, config);
const response = await client.chat.completions.create(messages);
```

### Protocol Conversion

Seamless switching between providers:

- OpenAI protocol as common intermediate format
- Automatic conversion to provider-specific formats
- Preserves functionality across providers
- Handles provider-specific features

### Key Rotation

Automatic failover with multiple API keys:

- Configurable key pools per provider
- Automatic rotation on rate limits/errors
- Usage tracking and analytics
- Graceful degradation

### Streaming Support

Real-time streaming responses:

- Server-sent events
- Chunked responses
- Token-by-token streaming
- Cancellation support

### Tool/Function Calling

Structured tool invocation:

- Tool definition format
- Automatic tool selection
- Parameter validation
- Multi-step tool execution

## Architecture

### Factory Pattern

ClientFactory creates appropriate client based on:

- Provider selection (anthropic, openai, gemini, bedrock)
- Configuration options
- Environment detection
- Fallback providers

### Adapter Pattern

Protocol converters adapt between formats:

- OpenAI as canonical format
- Provider-specific converters
- Bidirectional conversion where needed
- Lossless transformation

### Strategy Pattern

Rotating client implements retry strategy:

- Configurable retry count
- Exponential backoff
- Key rotation on failure
- Error classification

## Usage Patterns

### Basic Usage

```typescript
import { ClientFactory } from '@/common/api';

const client = ClientFactory.create('anthropic', {
  apiKey: 'sk-...',
  model: 'claude-3-sonnet',
});

const response = await client.chat.completions.create([{ role: 'user', content: 'Hello' }]);
```

### With Key Rotation

```typescript
const client = ClientFactory.create('openai', {
  apiKeys: ['sk-1...', 'sk-2...', 'sk-3...'],
  rotateOnFailure: true,
});
```

### Protocol Conversion

```typescript
const converter = new OpenAI2AnthropicConverter();
const anthropicMessage = converter.convert(openaiMessage);
```

## Related Documentation

- [src/common/utils/protocolDetector.ts](../utils/protocolDetector.ts) - Protocol detection
- [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) - System architecture
