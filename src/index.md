# src/ - Source Code Directory

## Overview

This directory contains all source code for the Largo application, organized by process type following the 3-process architecture model inherited from AionUi.

## Architecture

Largo uses a strict 3-process model to ensure separation of concerns:

- **`common/`** - Shared code used across all processes (no process-specific APIs)
- **`process/`** - Main process code (Electron APIs, Node.js APIs, no DOM)
- **`renderer/`** - Renderer process code (React UI, DOM APIs, no Node.js APIs)
- **`preload/`** - IPC bridge between main and renderer processes

## Directory Structure

### `common/` (97 items)

Shared utilities, types, and business logic used across all processes.

- **adapter/** - Adapters for different environments (browser, standalone, IPC bridge)
- **api/** - Multi-provider AI client implementations (Anthropic, OpenAI, Gemini, AWS Bedrock)
- **chat/** - Chat logic, slash commands, document handling, image generation
- **config/** - Application configuration, i18n setup, storage management
- **ma/** - M&A domain logic (company data, sector multiples, valuation models, glossary)
- **platform/** - Platform-specific utilities
- **types/** - TypeScript type definitions
- **update/** - Update management logic
- **utils/** - Shared utility functions

### `process/` (648 items)

Main process code running in Electron's Node.js environment.

- **agent/** - AI agent implementations (ACP, Flowise, Gemini, OpenClaw, remote agents)
- **bridge/** - IPC bridge services and handlers
- **channels/** - External communication channels (Feishu, WeCom, Telegram, etc.)
- **extensions/** - Extension system (lifecycle, sandbox, hub, resolvers)
- **pet/** - Pet companion feature
- **resources/** - Resource management (skills, prompts, templates)
- **services/** - Backend services (conversation, database, MCP, cron jobs)
- **task/** - Task management and execution
- **team/** - Multi-agent team collaboration
- **utils/** - Process-specific utilities
- **webserver/** - WebUI server implementation
- **worker/** - Forked worker processes for heavy computation

### `renderer/` (805 items)

Renderer process code running in the browser/Chromium context.

- **assets/** - Static assets (images, fonts, icons)
- **components/** - Reusable React components (Markdown, chat, layout, settings, M&A)
- **hooks/** - Custom React hooks
- **pages/** - Page components (conversation, settings, team, M&A, cron, guid)
- **pet/** - Pet companion UI components
- **services/** - Frontend services and API clients
- **styles/** - Global styles and theme configurations
- **utils/** - Renderer-specific utilities

### `preload/` (4 items)

IPC bridge scripts that expose safe APIs to the renderer process.

- **main.ts** - Main preload script for core IPC
- **petPreload.ts** - Pet-specific IPC handlers
- **petConfirmPreload.ts** - Pet confirmation dialog IPC
- **petHitPreload.ts** - Pet hit detection IPC

### Root Files

- **index.ts** - Main entry point for common exports
- **server.ts** - Standalone server entry point
- **types.d.ts** - Global TypeScript declarations

## Key Design Principles

### Process Separation

- Never mix APIs across process boundaries
- Main process: Electron APIs, Node.js APIs, file system access
- Renderer process: DOM APIs, React, browser APIs
- Workers: Heavy computation, no Electron APIs

### Communication

- All cross-process communication goes through `src/preload/`
- IPC bridge provides type-safe, sandboxed APIs
- No direct access to Node.js from renderer

### Shared Code

- `common/` contains process-agnostic code
- Avoids duplication across processes
- Uses adapter pattern for environment-specific behavior

## Related Documentation

- [Architecture](../../docs/ARCHITECTURE.md) - Detailed 3-process model explanation
- [IPC Bridge](../../docs/tech/architecture.md) - IPC communication patterns
- [AGENTS.md](../../AGENTS.md) - Code conventions and structure rules
