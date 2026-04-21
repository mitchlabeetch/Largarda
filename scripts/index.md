# scripts/ - Build Scripts and Utilities

## Overview

Build scripts, automation utilities, and development tools for the Largo project. Includes build processes, packaging, testing automation, and deployment scripts.

## Directory Structure

### Build Scripts

- **build-with-builder.js** (21KB) - Electron Builder integration script for packaging the application
- **build-server.mjs** (4.7KB) - Server build script for standalone WebUI deployment
- **build-mcp-servers.js** (1.8KB) - MCP (Model Context Protocol) server builder
- **rebuildNativeModules.js** (12.5KB) - Rebuild native modules for Electron compatibility
- **packaged-launch.mjs** (3.4KB) - Packaged application launcher script

### Development Scripts

- **dev-bootstrap.mjs** (5.6KB) - Development environment bootstrap script
- **postinstall.js** (1.6KB) - Post-installation hook for dependency setup
- **benchmark-acp-startup.ts** (36KB) - ACP startup performance benchmarking
- **test-iflow-acp-modes.mjs** (8.8KB) - Test ACP integration modes

### i18n Scripts

- **generate-i18n-types.js** (3.4KB) - Generate TypeScript types for i18n keys
- **check-i18n.js** (11.8KB) - Validate i18n completeness and consistency

### Release Scripts

- **prepare-release-assets.sh** (4.3KB) - Prepare release artifacts
- **verify-release-assets.sh** (2.3KB) - Verify release artifact integrity
- **create-mock-release-artifacts.sh** (2.2KB) - Create mock release artifacts for testing

### Automation Scripts

- **pr-automation.sh** (8.3KB) - PR automation daemon for automated review and merging
- **pr-automation.conf** (1.2KB) - PR automation configuration
- **fix-issues-daemon.sh** (5.3KB) - GitHub issue auto-fix daemon
- **fix-sentry-daemon.sh** (6.4KB) - Sentry issue auto-fix daemon

### Packaging Scripts

- **afterPack.js** (9KB) - Post-packaging hooks (electron-builder afterPack)
- **afterSign.js** (1.8KB) - Post-signing hooks (electron-builder afterSign)
- **prepareAionrs.js** (9.3KB) - Prepare AionRS resources
- **prepareBundledBun.js** (10.3KB) - Prepare bundled Bun runtime
- **prepareHubResources.js** (5.3KB) - Prepare extension hub resources

### Debug Scripts

- **debug-wecom-verify-url.ts** (2.4KB) - WeCom URL verification debugging

### Installation Scripts

- **install-ubuntu.sh** (15.9KB) - Ubuntu/Linux installation script

### Documentation

- **README.md** (5.9KB) - Scripts documentation and usage guide

## Script Categories

### Build & Packaging

Scripts for building and packaging the application:

- **build-with-builder.js** - Main build orchestrator using electron-builder
- **build-server.mjs** - Standalone server build
- **afterPack.js** - Post-packaging modifications
- **afterSign.js** - Post-signing operations
- **rebuildNativeModules.js** - Native module rebuilding for Electron

### Resource Preparation

Scripts for preparing bundled resources:

- **prepareAionrs.js** - AionRS binary preparation
- **prepareBundledBun.js** - Bun runtime bundling
- **prepareHubResources.js** - Extension hub resources
- **build-mcp-servers.js** - MCP server compilation

### i18n Management

Internationalization tooling:

- **generate-i18n-types.js** - Type generation for i18n keys
- **check-i18n.js** - Validation of translation completeness

### Release Management

Release automation:

- **prepare-release-assets.sh** - Asset preparation for releases
- **verify-release-assets.sh** - Artifact verification
- **create-mock-release-artifacts.sh** - Mock artifact creation

### Automation & CI/CD

Continuous integration and automation:

- **pr-automation.sh** - Automated PR review and merging
- **pr-automation.conf** - Configuration for PR automation
- **fix-issues-daemon.sh** - GitHub issue auto-fixing
- **fix-sentry-daemon.sh** - Sentry error auto-fixing

### Development Tools

Development assistance:

- **dev-bootstrap.mjs** - Environment setup
- **benchmark-acp-startup.ts** - Performance benchmarking
- **debug-wecom-verify-url.ts** - Debugging utilities
- **test-iflow-acp-modes.mjs** - Integration testing

### Installation

Platform-specific installation:

- **install-ubuntu.sh** - Linux/Ubuntu installation

## Key Workflows

### Building the Application

```bash
bun run dist              # Build for current platform
bun run dist:mac          # Build for macOS
bun run dist:win          # Build for Windows
bun run dist:linux        # Build for Linux
```

### Building the Server

```bash
bun run build:server      # Build standalone server
```

### i18n Validation

```bash
bun run i18n:types        # Generate i18n types
node scripts/check-i18n.js # Validate translations
```

### PR Automation

```bash
./scripts/pr-automation.sh # Run PR automation daemon
```

### Native Module Rebuild

```bash
node scripts/rebuildNativeModules.js # Rebuild for Electron
```

## Script Details

### build-with-builder.js

Main build script that:

- Invokes electron-builder with platform-specific configurations
- Handles macOS, Windows, and Linux builds
- Supports ARM64 and x64 architectures
- Manages build flags and options

### afterPack.js

Post-packaging hook that:

- Modifies packaged application structure
- Adds or removes files as needed
- Sets permissions
- Configures runtime settings

### pr-automation.sh

PR automation daemon that:

- Polls open PRs periodically
- Runs automated reviews
- Fixes identified issues
- Merges eligible PRs
- Uses bot labels for state tracking
- Logs to ~/Library/Logs/AionUi/ by default

### check-i18n.js

i18n validation that:

- Checks all i18n keys are present in all languages
- Validates key naming conventions
- Detects missing translations
- Reports inconsistencies

### generate-i18n-types.js

Type generation that:

- Creates TypeScript types for i18n keys
- Enables autocomplete for translation keys
- Validates key usage at compile time

### prepareBundledBun.js

Bun bundling that:

- Downloads appropriate Bun version
- Packages for target platform
- Configures for Electron embedding
- Optimizes for size

## Related Documentation

- [AGENTS.md](../AGENTS.md) - PR automation workflow
- [docs/conventions/pr-automation.md](../docs/conventions/pr-automation.md) - PR automation details
- [electron-builder.yml](../electron-builder.yml) - Builder configuration
- [package.json](../package.json) - NPM script definitions
