# src/process/channels/ - Communication Channels

## Overview

External communication channel integrations enabling Largo to communicate with various platforms (Feishu, WeCom, Telegram, DingTalk, etc.).

## Directory Structure

### Core Files

- **ARCHITECTURE.md** (26.8KB) - Channel system architecture documentation
  - Channel design patterns
  - Integration guidelines
  - Event handling
  - Message routing

- **index.ts** (1.2KB) - Channel module exports
- **types.ts** (15.4KB) - Channel type definitions
  - Channel interfaces
  - Message types
  - Event types
  - Configuration types

### `actions/` (5 items)

Channel action handlers.

- Message actions
- User actions
- System actions

### `agent/` (3 items)

Agent-channel integration.

- Agent to channel communication
- Channel event handling
- Agent state synchronization

### `core/` (2 items)

Core channel infrastructure.

- Base channel implementation
- Channel lifecycle management

### `gateway/` (3 items)

Channel gateway for routing.

- Message routing
- Channel discovery
- Load balancing

### `pairing/` (2 items)

Device/account pairing.

- Pairing flow
- Authentication
- Session management

### `plugins/` (25 items)

Platform-specific channel implementations.

- Feishu plugin
- WeCom plugin
- Telegram plugin
- DingTalk plugin
- Star Office plugin
- And more...

### `utils/` (4 items)

Channel utilities.

- Message formatting
- Event parsing
- Validation helpers

## Supported Platforms

### Feishu (Lark)

- Enterprise messaging
- Bot integration
- Webhook support
- Rich media

### WeCom (WeChat Work)

- Enterprise WeChat
- Bot API
- Message types
- Authentication

### Telegram

- Bot API
- Webhooks
- Inline mode
- File transfers

### DingTalk

- Enterprise messaging
- Bot integration
- Webhooks
- Custom apps

### Star Office

- Office platform integration
- Document sharing
- Collaboration features

## Architecture

### Channel Lifecycle

1. **Initialization** - Load channel configuration
2. **Connection** - Establish platform connection
3. **Authentication** - Authenticate with platform
4. **Operation** - Handle incoming/outgoing messages
5. **Disconnection** - Graceful shutdown

### Message Flow

- Incoming: Platform → Gateway → Channel → Agent
- Outgoing: Agent → Channel → Gateway → Platform
- Bidirectional communication support

### Event Handling

- Message events
- User events
- System events
- Error events

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed architecture
- [examples/ext-feishu/](../../../examples/ext-feishu/) - Feishu extension example
- [examples/ext-wecom-bot/](../../../examples/ext-wecom-bot/) - WeCom extension example
