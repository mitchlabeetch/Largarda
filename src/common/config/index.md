# src/common/config/ - Configuration Management

## Overview

Application configuration management including environment detection, i18n setup, storage configuration, and constants.

## Directory Structure

### Core Files

- **appEnv.ts** (916B) - Application environment detection
  - Development/production detection
  - WebUI mode detection
  - Platform detection
  - Environment variables

- **constants.ts** (1.9KB) - Global constants
  - Application constants
  - Default values
  - Configuration defaults

- **i18n-config.json** (488B) - i18n configuration
  - Supported languages
  - Language modules
  - Default language

- **i18n.ts** (2.8KB) - i18n initialization and setup
  - i18next configuration
  - Language loading
  - Translation functions
  - Language switching

- **storage.ts** (24KB) - Storage configuration and management
  - Settings schema
  - Default settings
  - Storage configuration
  - Settings validation

- **storageKeys.ts** (1.2KB) - Storage key definitions
  - Key constants
  - Key namespaces
  - Key validation

### `presets/` (1 items)

Assistant preset configurations.

## Key Features

### Environment Detection

```typescript
// Detect current environment
const env = getAppEnv(); // 'development' | 'production' | 'webui'
const isWebUI = isWebUIMode();
const isDesktop = isDesktopMode();
```

### i18n Configuration

- 9 languages supported
- Modular translation files
- Lazy loading
- Language switching without reload
- Fallback language support

### Storage Management

- Settings schema definition
- Default values
- Type validation
- Migration support
- Persistence layer abstraction

## Related Documentation

- [src/common/config/i18n-config.json](i18n-config.json) - i18n configuration
- [docs/](../../../../docs/) - Documentation
