# Extension Manifest API Reference

## Overview

The `aion-extension.json` manifest file defines the structure, metadata, and contributions of an AionUi extension.

## Manifest Structure

```json
{
  "name": "extension-name",
  "version": "1.0.0",
  "description": "Extension description",
  "author": "Author Name",
  "license": "MIT",
  "main": "./index.js",
  "icon": "./assets/icon.png",
  "homepage": "https://example.com",
  "repository": "https://github.com/example/extension",
  "keywords": ["keyword1", "keyword2"],
  "engines": {
    "aion": ">=1.0.0"
  },
  "contributes": {
    "channels": [],
    "assistants": [],
    "skills": [],
    "themes": [],
    "settings": []
  },
  "permissions": {
    "network": false,
    "filesystem": [],
    "ipc": []
  },
  "dependencies": {},
  "hooks": {
    "preInstall": "./hooks/preInstall.js",
    "postInstall": "./hooks/postInstall.js",
    "preUninstall": "./hooks/preUninstall.js",
    "onActivate": "./hooks/onActivate.js",
    "onDeactivate": "./hooks/onDeactivate.js"
  }
}
```

## Required Fields

### `name`

- **Type**: `string`
- **Description**: Unique identifier for the extension
- **Format**: kebab-case
- **Example**: `"feishu-channel"`

### `version`

- **Type**: `string`
- **Description**: Semantic version
- **Format**: `major.minor.patch`
- **Example**: `"1.0.0"`

### `description`

- **Type**: `string`
- **Description**: Short description of the extension
- **Max Length**: 200 characters

### `main`

- **Type**: `string`
- **Description**: Entry point file (relative to manifest)
- **Example**: `"./index.js"`

## Optional Fields

### `author`

- **Type**: `string`
- **Description**: Extension author
- **Example**: `"John Doe <john@example.com>"`

### `license`

- **Type**: `string`
- **Description**: License identifier
- **Example**: `"MIT"`, `"Apache-2.0"`

### `icon`

- **Type**: `string`
- **Description**: Path to extension icon (PNG, 512x512 recommended)
- **Example**: `"./assets/icon.png"`

### `homepage`

- **Type**: `string`
- **Description**: Extension homepage URL
- **Example**: `"https://example.com"`

### `repository`

- **Type**: `string`
- **Description**: Repository URL
- **Example**: `"https://github.com/example/extension"`

### `keywords`

- **Type**: `string[]`
- **Description**: Search keywords
- **Example**: `["feishu", "channel", "messaging"]`

### `engines`

- **Type**: `object`
- **Description**: Required AionUi version
- **Example**: `{ "aion": ">=1.0.0" }`

## Contributions

### `contributes.channels`

Defines communication channel extensions.

```json
{
  "contributes": {
    "channels": [
      {
        "id": "feishu",
        "name": "Feishu",
        "description": "Feishu integration",
        "icon": "./assets/feishu.png",
        "handler": "./channels/feishu.js",
        "configSchema": {
          "type": "object",
          "properties": {
            "appId": {
              "type": "string",
              "required": true
            },
            "appSecret": {
              "type": "string",
              "required": true
            }
          }
        }
      }
    ]
  }
}
```

**Channel Properties:**

- `id` (string, required): Unique channel identifier
- `name` (string, required): Display name
- `description` (string): Description
- `icon` (string): Path to icon
- `handler` (string, required): Handler module path
- `configSchema` (object): Configuration schema

### `contributes.assistants`

Defines AI assistant presets.

```json
{
  "contributes": {
    "assistants": [
      {
        "id": "financial-analyst",
        "name": "Financial Analyst",
        "description": "Specialized in financial analysis",
        "systemPrompt": "You are a financial analyst...",
        "model": "claude-3-sonnet-20240229",
        "temperature": 0.7,
        "tools": [
          {
            "name": "search-database",
            "description": "Search financial database"
          }
        ]
      }
    ]
  }
}
```

**Assistant Properties:**

- `id` (string, required): Unique assistant identifier
- `name` (string, required): Display name
- `description` (string): Description
- `systemPrompt` (string, required): System prompt
- `model` (string): AI model to use
- `temperature` (number): Temperature (0-1)
- `tools` (array): Available tools

### `contributes.skills`

Defines agent skills.

```json
{
  "contributes": {
    "skills": [
      {
        "id": "financial-valuation",
        "name": "Financial Valuation",
        "description": "Perform company valuation",
        "category": "ma",
        "handler": "./skills/valuation.js",
        "parameters": {
          "type": "object",
          "properties": {
            "companyId": {
              "type": "string",
              "required": true
            },
            "methods": {
              "type": "array",
              "items": { "type": "string" }
            }
          }
        }
      }
    ]
  }
}
```

**Skill Properties:**

- `id` (string, required): Unique skill identifier
- `name` (string, required): Display name
- `description` (string): Description
- `category` (string): Skill category
- `handler` (string, required): Handler module path
- `parameters` (object): Parameter schema

### `contributes.themes`

Defines UI themes.

```json
{
  "contributes": {
    "themes": [
      {
        "id": "custom-dark",
        "name": "Custom Dark",
        "description": "Custom dark theme",
        "type": "dark",
        "colors": {
          "primary": "#1a1a1a",
          "secondary": "#2a2a2a",
          "accent": "#4CAF50"
        }
      }
    ]
  }
}
```

**Theme Properties:**

- `id` (string, required): Unique theme identifier
- `name` (string, required): Display name
- `description` (string): Description
- `type` (string): "light" or "dark"
- `colors` (object): Color definitions

### `contributes.settings`

Defines settings UI panels.

```json
{
  "contributes": {
    "settings": [
      {
        "id": "extension-settings",
        "name": "Extension Settings",
        "icon": "./assets/settings.png",
        "component": "./settings/SettingsPanel.jsx"
      }
    ]
  }
}
```

**Settings Properties:**

- `id` (string, required): Unique settings identifier
- `name` (string, required): Display name
- `icon` (string): Path to icon
- `component` (string, required): React component path

## Permissions

### `permissions.network`

- **Type**: `boolean`
- **Description**: Allow network access
- **Default**: `false`

### `permissions.filesystem`

- **Type**: `string[]`
- **Description**: Allowed file system paths
- **Example**: `["read:/home/user/documents", "write:/tmp"]`

### `permissions.ipc`

- **Type**: `string[]`
- **Description**: Allowed IPC channels
- **Example**: `["conversation:*", "settings:read"]`

## Dependencies

### `dependencies`

- **Type**: `object`
- **Description**: Extension dependencies
- **Example**: `{ "axios": "^1.0.0" }`

## Hooks

### `hooks.preInstall`

- **Type**: `string`
- **Description**: Script to run before installation
- **Example**: `"./hooks/preInstall.js"`

### `hooks.postInstall`

- **Type**: `string`
- **Description**: Script to run after installation
- **Example**: `"./hooks/postInstall.js"`

### `hooks.preUninstall`

- **Type**: `string`
- **Description**: Script to run before uninstallation
- **Example**: `"./hooks/preUninstall.js"`

### `hooks.onActivate`

- **Type**: `string`
- **Description**: Module to load on activation
- **Example**: `"./hooks/onActivate.js"`

### `hooks.onDeactivate`

- **Type**: `string`
- **Description**: Module to load on deactivation
- **Example**: `"./hooks/onDeactivate.js"`

## Activation Hook Example

```javascript
// hooks/onActivate.js
export async function onActivate({ api, storage, logger }) {
  logger.info('Extension activated');

  // Register custom channel
  api.channels.register({
    id: 'custom-channel',
    handler: async (message) => {
      logger.info('Received message:', message);
      // Handle message
    },
  });

  // Register custom skill
  api.skills.register({
    id: 'custom-skill',
    name: 'Custom Skill',
    execute: async (context) => {
      return await performCustomTask(context);
    },
  });
}
```

## Storage API

Extensions can use the storage API:

```javascript
export async function onActivate({ storage }) {
  // Read from extension storage
  const config = await storage.get('config')

  // Write to extension storage
  await storage.set('config', { ... })

  // Delete from extension storage
  await storage.delete('config')
}
```

## Events API

Extensions can subscribe to events:

```javascript
export async function onActivate({ api, events }) {
  // Subscribe to conversation events
  events.on('conversation:new', async (conversation) => {
    // Handle new conversation
  });

  // Subscribe to message events
  events.on('message:sent', async (message) => {
    // Handle sent message
  });
}
```

## Validation

The manifest is validated against a JSON schema. Required fields must be present, and types must match.

## Related Documentation

- [src/process/extensions/](../../src/process/extensions/) - Extension system
- [examples/](../../examples/) - Extension examples
- [docs/data-flows/extension-data-flow.md](../data-flows/extension-data-flow.md) - Extension data flow
