# resources/ - Bundled Resources

## Overview

Bundled resources packaged with the application, including runtime dependencies and platform-specific binaries.

## Directory Structure

### `bundled-bun/` (0 items)

Bundled Bun runtime for cross-platform execution.

- Platform-specific Bun binaries
- Prepared by `scripts/prepareBundledBun.js`
- Embedded in application for standalone execution
- Eliminates external Bun dependency on user machines

## Resource Management

### Preparation

Resources are prepared by build scripts:

- **prepareBundledBun.js** - Downloads and configures Bun runtime
- **prepareAionrs.js** - Prepares AionRS resources
- **prepareHubResources.js** - Prepares extension hub resources

### Packaging

Resources are packaged during build:

- Electron Builder includes resources in app bundle
- Platform-specific variants (macOS, Windows, Linux)
- Architecture-specific builds (x64, ARM64)

### Usage

Bundled resources provide:

- Self-contained application
- No external runtime dependencies
- Consistent behavior across environments
- Simplified deployment

## Related Documentation

- [scripts/prepareBundledBun.js](../scripts/prepareBundledBun.js) - Bun bundling script
- [scripts/prepareAionrs.js](../scripts/prepareAionrs.js) - AionRS preparation
- [scripts/prepareHubResources.js](../scripts/prepareHubResources.js) - Hub resources preparation
- [electron-builder.yml](../electron-builder.yml) - Builder configuration
