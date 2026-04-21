# src/common/ - Shared Code

## Overview

Shared code used across all processes (main, renderer, workers). Contains business logic, types, utilities, and domain-specific implementations that are process-agnostic.

## Directory Structure

### `adapter/` (6 items)

Environment adapters for different runtime contexts.

- **browser.ts** - Browser environment adapter
- **constant.ts** - Adapter constants
- **ipcBridge.ts** - IPC bridge adapter for Electron context (64KB - core IPC logic)
- **main.ts** - Main process adapter
- **registry.ts** - Adapter registry
- **standalone.ts** - Standalone/server environment adapter

### `api/` (10 items)

Multi-provider AI client implementations with protocol conversion.

- **ApiKeyManager.ts** - API key management and rotation
- **AnthropicRotatingClient.ts** - Anthropic API client with key rotation
- **ClientFactory.ts** - Factory for creating AI clients
- **GeminiRotatingClient.ts** - Google Gemini API client
- **OpenAI2AnthropicConverter.ts** - OpenAI protocol to Anthropic converter
- **OpenAI2GeminiConverter.ts** - OpenAI protocol to Gemini converter
- **OpenAIRotatingClient.ts** - OpenAI API client
- **ProtocolConverter.ts** - Base protocol conversion interface
- **RotatingApiClient.ts** - Base rotating API client
- **index.ts** - Module exports

### `chat/` (11 items)

Chat system logic and utilities.

- **approval/** - Message approval workflows
- **atCommandParser.ts** - @mention command parsing
- **chatLib.ts** - Core chat library (21KB - message handling, context management)
- **document/** - Document processing in chat
- **imageGenCore.ts** - Image generation integration
- **navigation/** - Chat navigation and history
- **sideQuestion.ts** - Side question handling
- **slash/** - Slash command implementations

### `config/` (7 items)

Application configuration management.

- **appEnv.ts** - Application environment detection
- **constants.ts** - Global constants
- **i18n-config.json** - i18n language and module configuration
- **i18n.ts** - i18n initialization and setup
- **presets/** - Assistant preset configurations
- **storage.ts** - Storage configuration and management (23KB - settings persistence)
- **storageKeys.ts** - Storage key definitions

### `ma/` (21 items)

M&A (Mergers & Acquisitions) domain logic - French market expertise.

- **company/** - French company data structures
- **constants.ts** - M&A constants and terminology (6KB - French M&A terms)
- **glossary/** - M&A glossary and definitions
- **sector/** - Sector classification and multiples
- **types.ts** - M&A type definitions (29KB - comprehensive M&A data structures)
- **valuation/** - Valuation models (DCF, multiples, adjusted net assets)

### `platform/` (6 items)

Platform-specific utilities and abstractions.

### `types/` (22 items)

TypeScript type definitions shared across the application.

- **acpTypes.ts** - ACP (Aion CLI) types (40KB - extensive type definitions)
- **codex/** - Codex-related types
- **conversion.ts** - Type conversion utilities
- **database.ts** - Database types
- **electron.ts** - Electron-specific types
- **fileSnapshot.ts** - File snapshot types
- **hub.ts** - Extension hub types
- **pptx2json.d.ts** - PowerPoint conversion type definitions
- **preview.ts** - Preview types
- **speech.ts** - Speech recognition types
- **teamTypes.ts** - Multi-agent team types
- **turndown-plugin-gfm.d.ts** - Markdown conversion types

### `update/` (2 items)

Application update management logic.

### `utils/` (10 items)

Shared utility functions.

- **appConfig.ts** - Application configuration utilities
- **buildAgentConversationParams.ts** - Agent conversation parameter building
- **index.ts** - Module exports
- **platformAuthType.ts** - Platform authentication type handling
- **platformConstants.ts** - Platform-specific constants
- **presetAssistantResources.ts** - Preset assistant resource management
- **protocolDetector.ts** - AI protocol detection (13KB - determines which API provider)
- **shims/** - Shim utilities for compatibility
- **urlValidation.ts** - URL validation utilities
- **utils.ts** - General utility functions

### Root Files

- **electronSafe.ts** - Electron-safe version of common utilities
- **index.ts** - Module exports

## Key Features

### Multi-Provider AI Support

The `api/` directory provides a unified interface for multiple AI providers:

- Anthropic Claude (Sonnet, Opus, Haiku)
- OpenAI (GPT-4o, GPT-4, o1, o3)
- Google Gemini (Pro, Flash)
- AWS Bedrock (via provider adapters)

Protocol converters allow seamless switching between providers while maintaining consistent interfaces.

### M&A Domain Expertise

The `ma/` directory contains French M&A market expertise:

- French company data structures
- Sector-specific multiples
- Valuation models (DCF, multiples, adjusted net assets)
- French M&A terminology and glossary
- 4-phase M&A framework implementation

### Chat System

The `chat/` directory implements the core chat functionality:

- Message handling and context management
- Slash commands for quick actions
- @mention command parsing
- Document processing within chat
- Image generation integration
- Navigation and history management

### Configuration Management

The `config/` directory provides:

- Environment detection (development, production, webui)
- i18n setup for 9 languages
- Storage configuration with SQLite
- Settings persistence
- Preset assistant configurations

## Design Patterns

### Adapter Pattern

The `adapter/` directory uses the adapter pattern to provide consistent APIs across different environments (browser, Electron main, standalone server).

### Factory Pattern

The `api/ClientFactory.ts` uses the factory pattern to create appropriate AI clients based on configuration.

### Protocol Conversion

The `api/` directory contains protocol converters that translate between different AI provider APIs, allowing provider switching without changing application logic.

## Related Documentation

- [Architecture](../../docs/ARCHITECTURE.md) - Process separation principles
- [Design System](../../docs/DESIGN_SYSTEM.md) - UI/UX patterns
- [AGENTS.md](../../AGENTS.md) - Code conventions
