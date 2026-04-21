# src/process/extensions/ - Extension System

## Overview

Extension system for extending Largo functionality. Provides lifecycle management, sandboxing, hub integration, and dependency resolution for third-party extensions.

## Directory Structure

### Core Components

- **ExtensionLoader.ts** (4KB) - Extension loading logic
  - Dynamic module loading
  - Dependency resolution
  - Validation
  - Error handling

- **ExtensionRegistry.ts** (16.6KB) - Extension registry and management
  - Extension registration
  - Discovery
  - Version management
  - Dependency tracking

- **constants.ts** (4.1KB) - Extension system constants
  - Manifest keys
  - Standard paths
  - Default values
  - Error codes

- **types.ts** (19.7KB) - Extension type definitions
  - Manifest types
  - Extension metadata
  - Contribution types
  - Configuration types

- **index.ts** (3.2KB) - Module exports

### `lifecycle/` (5 items)

Extension lifecycle management.

- Installation hooks
- Loading process
- Activation/deactivation
- Uninstallation
- Update handling

### `sandbox/` (5 items)

Extension sandboxing for security.

- Isolated execution environment
- API restrictions
- Resource limits
- Security policies
- Permission management

### `hub/` (3 items)

Extension marketplace integration.

- Hub API client
- Discovery and search
- Installation from remote
- Update notifications

### `resolvers/` (15 items)

Dependency resolvers.

- Package dependency resolution
- Version conflict resolution
- Peer dependency handling
- Circular dependency detection

### `protocol/` (2 items)

Extension communication protocols.

- IPC protocols
- Message formats
- Event handling

## Extension Architecture

### Manifest (aion-extension.json)

Every extension requires a manifest:

```json
{
  "name": "extension-name",
  "version": "1.0.0",
  "description": "Extension description",
  "main": "./index.js",
  "contributes": {
    "channels": [...],
    "assistants": [...],
    "skills": [...],
    "themes": [...]
  }
}
```

### Contribution Types

Extensions can contribute:

- **Channels** - Communication platforms (Feishu, WeCom, etc.)
- **Assistants** - Custom AI assistants
- **Skills** - Agent capabilities
- **Themes** - UI themes
- **Settings** - Configuration UI

### Lifecycle Stages

1. **Discovery** - Find extensions
2. **Installation** - Download and install
3. **Loading** - Load extension code
4. **Activation** - Initialize extension
5. **Operation** - Extension runs
6. **Deactivation** - Shutdown extension
7. **Uninstallation** - Remove extension

## Security Model

### Sandbox Isolation

- Restricted API access
- No direct file system access
- Limited network access
- Resource quotas

### Permissions

Extensions request permissions:

- File access
- Network access
- IPC channels
- System APIs

### Validation

- Manifest validation
- Code signing verification
- Dependency security checks
- Malware scanning

## Hub Integration

### Extension Marketplace

- Search and discover extensions
- View ratings and reviews
- Install with one click
- Automatic updates

### Installation Flow

1. Search hub
2. Select extension
3. Review permissions
4. Install
5. Activate

## Related Documentation

- [examples/](../../../examples/) - Extension examples
- [docs/feature/extension-market/](../../../docs/feature/extension-market/) - Extension marketplace
- [src/process/extensions/hub/](hub/) - Hub integration details
