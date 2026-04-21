# src/process/ - Main Process

## Overview

Main process code running in Electron's Node.js environment. This process has access to Electron APIs, Node.js APIs, and the file system, but no DOM APIs. It handles backend services, agent orchestration, extension management, and system-level operations.

## Directory Structure

### `agent/` (51 items)

AI agent implementations for different providers and use cases.

- **acp/** - ACP (Aion CLI) agent integration (10 items)
- **aionrs/** - AionRS agent implementation (4 items)
- **flowise/** - FlowiseAI integration for workflow automation (3 items)
- **gemini/** - Google Gemini agent implementation (22 items)
- **nanobot/** - Nanobot agent (2 items)
- **openclaw/** - OpenClaw agent implementation (7 items)
- **remote/** - Remote agent execution (3 items)

### `bridge/` (47 items)

IPC bridge between main and renderer processes.

- \***\*tests**/\*\* - Bridge unit tests
- **services/** - Bridge service implementations
- Core bridge handlers and IPC channel management

### `channels/` (47 items)

External communication channel integrations.

- **utils/** - Channel utilities
- Implementations for various platforms (Feishu, WeCom, Telegram, DingTalk, etc.)

### `extensions/` (35 items)

Extension system for extending Largo functionality.

- **hub/** - Extension marketplace and hub integration
- **lifecycle/** - Extension lifecycle management (install, load, unload)
- **resolvers/** - Extension dependency resolvers
- **sandbox/** - Extension sandboxing for security

### `pet/` (6 items)

Pet companion feature - interactive assistant pet.

- Pet behavior, animations, and interaction logic

### `resources/` (293 items)

Resource management for agents and skills.

- **skills/** - Agent skill definitions and implementations
- Prompts, templates, and knowledge base resources

### `services/` (62 items)

Backend services.

- **ConversationServiceImpl.ts** - Conversation management service
- **IConversationService.ts** - Conversation service interface
- **WorkspaceSnapshotService.ts** - Workspace state persistence
- **autoUpdaterService.ts** - Auto-update management
- **ccSwitchModelSource.ts** - Model source switching logic
- **conversionService.ts** - Document conversion services (21KB)
- **cron/** - Scheduled task management (12 items)
- **database/** - Database drivers and services (22 items)
- **geminiSubscription.ts** - Gemini subscription management
- **i18n/** - Internationalization service
- **ma/** - M&A-specific services (5 items)
- **mcpServices/** - Model Context Protocol services (12 items)
- **openclawConflictDetector.ts** - OpenClaw conflict detection
- **previewHistoryService.ts** - Preview history management

### `task/` (23 items)

Task management and execution system.

- Task scheduling, execution, and state management

### `team/` (24 items)

Multi-agent team collaboration system.

- **repository/** - Team configuration storage
- Agent coordination, communication, and workflow orchestration

### `utils/` (24 items)

Process-specific utilities.

- Helper functions for main process operations

### `webserver/` (23 items)

WebUI server implementation.

- Express-based server for browser-based access
- JWT authentication, CSRF protection, rate limiting
- WebSocket support for real-time updates

### `worker/` (12 items)

Forked worker processes for heavy computation.

- **fork/** - Worker forking logic
- **ma/** - M&A computation workers (valuation, analysis)
- Workers run without Electron APIs for isolation

### Root Files

- **index.ts** - Main process entry point

## Key Services

### Conversation Service

- Manages conversation state and persistence
- Handles message history and context
- Provides conversation CRUD operations

### Database Service

- SQLite database management using better-sqlite3
- Schema migrations and query execution
- Transaction management

### MCP Services

- Model Context Protocol integration
- External tool connections
- Agent tool capabilities

### Conversion Service

- Document conversion (PDF, Word, Excel, PowerPoint)
- Format transformation and extraction
- Batch processing support

### Auto-Update Service

- Electron-updater integration
- Version checking and download
- Update installation and rollback

### WebUI Server

- Standalone server for browser access
- JWT-based authentication
- CSRF and rate limiting protection
- WebSocket for real-time communication

## Agent Implementations

### ACP Agent

- Integration with Aion CLI
- Command execution and output parsing
- File system operations

### Flowise Agent

- FlowiseAI workflow integration
- Visual workflow execution
- Node-based automation

### Gemini Agent

- Google Gemini API integration
- Multimodal capabilities
- Subscription management

### OpenClaw Agent

- Open-source agent framework
- Conflict detection
- Team collaboration

### Remote Agent

- Remote agent execution
- Network communication
- Distributed processing

## Extension System

### Lifecycle Management

- Extension installation and loading
- Dependency resolution
- Version management
- Uninstallation and cleanup

### Sandbox

- Isolated execution environment
- Security restrictions
- Resource limits
- API access control

### Hub Integration

- Extension marketplace
- Discovery and search
- Installation from remote sources
- Updates and notifications

## Worker Processes

### Purpose

- Heavy computation offloading from main process
- Prevent UI blocking during long-running tasks
- Parallel processing capabilities

### M&A Workers

- Valuation calculations
- Financial analysis
- Data processing
- Report generation

## Design Patterns

### Service Layer

- Services provide business logic abstraction
- Interface-based design for testability
- Singleton pattern for shared services

### Worker Pattern

- Forked processes for CPU-intensive tasks
- Message passing for communication
- Isolation from main process

### Extension Pattern

- Plugin architecture for extensibility
- Lifecycle hooks for integration points
- Sandboxed execution for security

## Related Documentation

- [Architecture](../../docs/ARCHITECTURE.md) - 3-process model details
- [IPC Bridge](../../docs/tech/architecture.md) - IPC communication
- [WebUI Guide](../../docs/WEBUI_GUIDE.md) - WebUI server setup
- [Server Deploy](../../docs/SERVER_DEPLOY_GUIDE.md) - Production deployment
