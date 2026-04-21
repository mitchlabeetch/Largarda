# examples/ - Extension Examples

## Overview

Example extensions demonstrating how to extend Largo functionality using the AionUi extension system. Each example shows different aspects of the extension API including channels, assistants, skills, themes, and settings.

## Directory Structure

### `acp-adapter-extension/` (2 items)

Minimal example demonstrating ACP (Aion CLI) adapter integration.

- **aion-extension.json** - Extension manifest
- **assets/** - Extension assets

### `e2e-full-extension/` (25 items)

Comprehensive end-to-end extension example showcasing all extension capabilities.

- **aion-extension.json** (4KB) - Full extension manifest
- **assets/** - Extension assets (2 items)
- **assistants/** - Custom assistant definitions (1 item)
- **channels/** - Communication channel implementations (1 item)
- **contributes/** - Extension contributions (1 item)
- **i18n/** - Internationalization files (14 items - multi-language support)
- **settings/** - Extension settings UI (1 item)
- **skills/** - Custom agent skills (2 items)
- **themes/** - Custom theme definitions (2 items)

### `ext-feishu/` (4 items)

Feishu (Lark) platform integration extension.

- **aion-extension.json** - Extension manifest
- **assets/** - Extension assets
- **channels/** - Feishu channel implementation
- **webui/** - WebUI integration

### `ext-wecom-bot/` (9 items)

WeCom (WeChat Work) bot integration extension.

- **aion-extension.json** - Extension manifest
- **assets/** - Extension assets
- **channels/** - WeCom channel implementation
- **dist/** - Built distribution files
- **README.md** - Extension documentation

### `hello-world-extension/` (39 items)

Simple "Hello World" extension for getting started with extension development.

- Demonstrates basic extension structure
- Minimal configuration
- Learning resource for developers

### `star-office-extension/` (13 items)

Star Office platform integration extension.

- **aion-extension.json** - Extension manifest
- **assets/** - Extension assets
- **channels/** - Star Office channel implementation
- **i18n/** - Internationalization files (zh-CN, zh-TW)
- **settings/** - Extension settings
- **webui/** - WebUI integration

## Extension Structure

### aion-extension.json

Required manifest file for all extensions containing:

- Extension metadata (name, version, description)
- Entry points
- Contribution definitions
- Dependencies
- Permissions

### Common Directories

#### assets/

Static assets for the extension:

- Icons
- Images
- Configuration files

#### channels/

Communication channel implementations:

- Platform-specific message handlers
- Webhook receivers
- Event processors
- Authentication logic

#### i18n/

Internationalization files:

- Translation files for supported languages
- Language-specific resources
- Locale detection

#### settings/

Extension settings UI:

- Configuration forms
- Settings persistence
- Validation logic

#### skills/

Custom agent skills:

- Skill definitions
- Implementation logic
- Tool integrations

#### themes/

Custom theme definitions:

- Color schemes
- Typography settings
- UI overrides

#### webui/

WebUI-specific integrations:

- Custom pages
- UI components
- Route handlers

## Extension Types

### Channel Extensions

Integrate with external communication platforms:

- **ext-feishu** - Feishu/Lark integration
- **ext-wecom-bot** - WeChat Work bot
- **star-office-extension** - Star Office platform

### Adapter Extensions

Provide adapters for external tools:

- **acp-adapter-extension** - ACP CLI adapter

### Full Extensions

Comprehensive extensions with multiple features:

- **e2e-full-extension** - Demonstrates all extension capabilities

### Starter Extensions

Learning resources for developers:

- **hello-world-extension** - Minimal example for beginners

## Key Features Demonstrated

### Multi-language Support

Extensions can support multiple languages through i18n files:

- e2e-full-extension supports 14 languages
- star-office-extension supports Chinese (zh-CN, zh-TW)

### Custom Assistants

Extensions can define custom AI assistants:

- Assistant configuration
- Prompt templates
- Tool integrations
- Context management

### Custom Skills

Extensions can add new agent skills:

- Skill definitions
- Implementation logic
- Tool calls
- State management

### Custom Themes

Extensions can provide custom themes:

- Color schemes
- Typography
- UI component styling
- Light/dark mode variants

### Settings Management

Extensions can provide configuration UI:

- Settings forms
- Validation
- Persistence
- Default values

### Channel Integration

Extensions can add communication channels:

- Message handling
- Webhook endpoints
- Authentication
- Event streaming

## Development Workflow

### Creating an Extension

1. Copy an appropriate example (hello-world-extension for beginners)
2. Modify aion-extension.json with your metadata
3. Implement required features (channels, skills, etc.)
4. Add i18n files for multi-language support
5. Test with Largo's extension system
6. Package for distribution

### Extension Manifest

The aion-extension.json file defines:

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

## Related Documentation

- [Extension Hub](../docs/feature/extension-market/) - Extension marketplace documentation
- [Architecture](../docs/ARCHITECTURE.md) - Extension system architecture
- [AGENTS.md](../AGENTS.md) - Development conventions
