# Largo - Root Directory Index

## Project Overview

Largo is an AI-powered M&A (Mergers & Acquisitions) assistant for French professionals, built on the AionUi framework (Electron + React). It combines deep French market expertise with modern AI capabilities including autonomous agents, document automation, and multi-provider LLM support.

## Architecture Model

Largo follows a **3-process model** ensuring strict separation of concerns:

- **Main Process** (`src/process/`) - Electron main, Node.js APIs, backend services, agent orchestration
- **Renderer Process** (`src/renderer/`) - React UI, Arco Design components, UnoCSS styling
- **Workers** (`src/process/worker/`) - Forked processes for heavy computation, no Electron APIs

Cross-process communication goes through the IPC bridge (`src/preload.ts`).

## Directory Structure

### Core Source Code

- **`src/`** - Main source code directory
  - `common/` - Shared code across all processes (types, utilities, chat logic, M&A domain logic)
  - `process/` - Main process code (Electron backend, services, agents, extensions)
  - `renderer/` - Renderer process code (React UI, components, hooks, styles)
  - `preload/` - IPC bridge between main and renderer processes

### Documentation

- **`docs/`** - Project documentation
  - `adr/` - Architecture Decision Records
  - `conventions/` - Coding conventions and standards
  - `design/` - Design specifications
  - `feature/` - Feature-specific documentation
  - `ARCHITECTURE.md` - Technical architecture details
  - `DESIGN_SYSTEM.md` - Mint Whisper theme specifications
  - `SECURITY.md` - Security model and threat analysis
  - `CODE_STYLE.md` - Code style guidelines

### Testing

- **`tests/`** - Test suites
  - `e2e/` - End-to-end tests with Playwright
  - `integration/` - Integration tests
  - `regression/` - Regression tests
  - `fixtures/` - Test fixtures and mocks

### Examples

- **`examples/`** - Extension examples demonstrating AionUi extensibility
  - `acp-adapter-extension/` - ACP adapter example
  - `e2e-full-extension/` - Full-featured extension example
  - `ext-feishu/` - Feishu channel extension
  - `ext-wecom-bot/` - WeCom bot extension
  - `star-office-extension/` - Star Office extension

### Build & Configuration

- **`scripts/`** - Build scripts and utilities
- **`package.json`** - NPM package configuration with all dependencies and scripts
- **`electron.vite.config.ts`** - Electron + Vite build configuration
- **`vite.renderer.config.ts`** - Renderer-specific Vite configuration
- **`vitest.config.ts`** - Vitest testing configuration
- **`playwright.config.ts`** - Playwright E2E test configuration
- **`tsconfig.json`** - TypeScript configuration
- **`uno.config.ts`** - UnoCSS utility-first CSS configuration

### Configuration Files

- **`.claude/`** - Claude AI agent skills and commands
- **`.github/`** - GitHub workflows (CI/CD, security, Docker)
- **`.husky/`** - Git hooks configuration
- **`.kiro/`** - Kiro AI agent configurations
- **`.specify/`** - Specify AI agent templates and memory
- **`.gemini/`** - Gemini AI agent configuration

### Assets & Resources

- **`public/`** - Public assets (pet states, PWA icons, service worker)
- \*\*`resources/` - Bundled resources
- **`mobile/`** - React Native mobile application

### Development Tools

- **`chatbuild/`** - Chat building resources and reference repositories
- \*\*`patches/` - NPM package patches

### Project Files

- **`README.md`** - Project overview, features, quick start guide
- **`AGENTS.md`** - AI agent development guidelines and conventions
- **`CONTRIBUTING.md`** - Contribution guidelines (English)
- **`CONTRIBUTING.zh.md`** - Contribution guidelines (Chinese)
- **`ROADMAP.md`** - Project roadmap and planned features
- **`CHANGELOG.md`** - Version change history
- **`LICENSE`** - Apache-2.0 license
- **`Dockerfile`** - Docker container configuration
- **`electron-builder.yml`** - Electron builder configuration
- **`justfile`** - Just command runner recipes

## Key Technologies

- **Framework**: Electron + React + Vite
- **UI Library**: @arco-design/web-react
- **Styling**: UnoCSS + CSS Modules
- **Icons**: @icon-park/react
- **Testing**: Vitest + Playwright
- **Linting**: oxlint + oxfmt
- **Package Manager**: Bun
- **AI Providers**: Anthropic Claude, OpenAI GPT, Google Gemini, AWS Bedrock
- **Database**: SQLite (better-sqlite3)
- **Internationalization**: i18next (9 languages)

## Development Workflow

```bash
bun install          # Install dependencies
bun run start        # Start development (Electron)
bun run webui        # Start WebUI in browser
bun run lint:fix     # Auto-fix lint issues
bun run format       # Auto-format code
bun run test         # Run test suite
bun run dist:mac     # Build for macOS
bun run dist:win     # Build for Windows
bun run dist:linux   # Build for Linux
```

## Code Quality Standards

- Strict TypeScript mode enabled
- No `any` types, no implicit returns
- Path aliases: `@/*`, `@process/*`, `@renderer/*`, `@worker/*`
- Directory size limit: 10 direct children maximum
- Component naming: PascalCase
- Utility naming: camelCase
- Hooks: camelCase with `use` prefix
- Constants: UPPER_SNAKE_CASE values inside camelCase files

## Internationalization

9 languages supported with French as primary:

- fr-FR (primary), en-US, zh-CN, ja-JP, zh-TW, ko-KR, tr-TR, ru-RU, uk-UA

All user-facing text must use i18n keys from `src/common/config/i18n-config.json`.

## Security Model

- Local-first storage (SQLite, no cloud sync)
- Zero telemetry
- JWT authentication for WebUI
- CSRF protection
- Rate limiting

## Related Documentation

- [Architecture](docs/ARCHITECTURE.md) - 3-process model, IPC bridge, module layout
- [Design System](docs/DESIGN_SYSTEM.md) - Mint Whisper theme, typography, color tokens
- [Contributing](CONTRIBUTING.md) - Development workflow, PR guidelines
- [AGENTS.md](AGENTS.md) - AI agent development conventions and skills
