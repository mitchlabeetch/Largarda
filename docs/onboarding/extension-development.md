# Extension Development Guide

## Overview

Learn how to develop extensions for Largo to add new capabilities like channels, assistants, skills, and themes.

## Extension Structure

### Basic Extension

```
my-extension/
├── aion-extension.json    # Extension manifest
├── index.js               # Entry point
├── assets/                # Icons, images
└── hooks/                 # Lifecycle hooks
    ├── onActivate.js
    └── onDeactivate.js
```

## Manifest

### aion-extension.json

```json
{
  "name": "my-extension",
  "version": "1.0.0",
  "description": "My custom extension",
  "author": "Your Name",
  "main": "./index.js",
  "icon": "./assets/icon.png",
  "contributes": {
    "channels": [],
    "assistants": [],
    "skills": [],
    "themes": []
  },
  "permissions": {
    "network": false,
    "filesystem": [],
    "ipc": []
  }
}
```

## Extension Types

### 1. Channel Extension

Add a new communication platform (e.g., Slack, Discord).

#### Manifest

```json
{
  "contributes": {
    "channels": [
      {
        "id": "my-channel",
        "name": "My Channel",
        "description": "Custom channel integration",
        "handler": "./channels/myChannel.js"
      }
    ]
  }
}
```

#### Handler

```javascript
// channels/myChannel.js
export async function onActivate({ api, logger }) {
  api.channels.register({
    id: 'my-channel',
    name: 'My Channel',
    async handleIncoming(message) {
      logger.info('Received:', message);
      // Process message
    },
  });
}
```

### 2. Assistant Extension

Add a custom AI assistant with specific capabilities.

#### Manifest

```json
{
  "contributes": {
    "assistants": [
      {
        "id": "my-assistant",
        "name": "My Assistant",
        "description": "Custom AI assistant",
        "systemPrompt": "You are a helpful assistant specialized in...",
        "model": "claude-3-sonnet-20240229",
        "tools": []
      }
    ]
  }
}
```

### 3. Skill Extension

Add a custom skill for agents.

#### Manifest

```json
{
  "contributes": {
    "skills": [
      {
        "id": "my-skill",
        "name": "My Skill",
        "description": "Custom skill",
        "category": "custom",
        "handler": "./skills/mySkill.js"
      }
    ]
  }
}
```

#### Handler

```javascript
// skills/mySkill.js
export async function onActivate({ api, logger }) {
  api.skills.register({
    id: 'my-skill',
    name: 'My Skill',
    description: 'Does something custom',
    async execute(context) {
      // Skill logic
      return result;
    },
  });
}
```

### 4. Theme Extension

Add a custom UI theme.

#### Manifest

```json
{
  "contributes": {
    "themes": [
      {
        "id": "my-theme",
        "name": "My Theme",
        "description": "Custom theme",
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

## Lifecycle Hooks

### onActivate

Called when extension is loaded.

```javascript
export async function onActivate({ api, storage, logger }) {
  logger.info('Extension activated')

  // Register capabilities
  api.channels.register({...})
  api.skills.register({...})

  // Load settings
  const config = await storage.get('config')
}
```

### onDeactivate

Called when extension is unloaded.

```javascript
export async function onDeactivate({ api, storage, logger }) {
  logger.info('Extension deactivated');

  // Cleanup
  await storage.set('config', currentConfig);
}
```

## Permissions

### Network Access

```json
{
  "permissions": {
    "network": true
  }
}
```

### File System Access

```json
{
  "permissions": {
    "filesystem": ["read:/home/user/documents", "write:/tmp"]
  }
}
```

### IPC Access

```json
{
  "permissions": {
    "ipc": ["conversation:*", "settings:read"]
  }
}
```

## API Reference

### Channel API

```javascript
api.channels.register({
  id: 'channel-id',
  name: 'Channel Name',
  async handleIncoming(message) {
    // Handle message
  },
  async send(message) {
    // Send message
  },
});
```

### Skill API

```javascript
api.skills.register({
  id: 'skill-id',
  name: 'Skill Name',
  description: 'Description',
  async execute(context) {
    // Execute skill
    return result;
  },
});
```

### Storage API

```javascript
// Read
const value = await storage.get('key');

// Write
await storage.set('key', value);

// Delete
await storage.delete('key');
```

### Events API

```javascript
// Subscribe
events.on('conversation:new', (conversation) => {
  // Handle event
});

// Subscribe to message events
events.on('message:sent', (message) => {
  // Handle message
});
```

## Development Workflow

### 1. Create Extension Directory

```bash
mkdir my-extension
cd my-extension
```

### 2. Create Manifest

Create `aion-extension.json` with extension metadata.

### 3. Implement Handler

Create `index.js` with `onActivate` export.

### 4. Test Locally

```bash
# Install from local path
bun run extension:install ./my-extension

# Activate extension
# Test functionality
```

### 5. Package

```bash
# Create zip
zip -r my-extension.zip my-extension/
```

### 6. Publish to Hub

Upload to extension marketplace (if applicable).

## Examples

See `examples/` directory for complete extension examples:

- `examples/ext-feishu/` - Feishu channel extension
- `examples/ext-wecom-bot/` - WeChat Work bot extension
- `examples/acp-adapter-extension/` - ACP adapter extension

## Best Practices

### Security

- Request minimal permissions
- Validate all inputs
- Sanitize outputs
- Don't expose sensitive data

### Performance

- Use async/await for I/O
- Cache frequently accessed data
- Clean up resources on deactivation
- Avoid blocking operations

### Error Handling

```javascript
try {
  await doSomething();
} catch (error) {
  logger.error('Operation failed:', error);
  throw error;
}
```

## Related Documentation

- [docs/api-reference/extension-manifest.md](../api-reference/extension-manifest.md) - Manifest API
- [src/process/extensions/](../../src/process/extensions/) - Extension system
- [examples/](../../examples/) - Extension examples
