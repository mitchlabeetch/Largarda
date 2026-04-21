# Full Extension Development Guide

## Overview

Comprehensive guide to building a full-featured Largo extension with multiple contribution types including ACP adapters, skills, MCP servers, channels, themes, assistants, and settings.

## Extension Structure

```
my-full-extension/
├── aion-extension.json         # Extension manifest
├── assets/                     # Icons, images
│   ├── icon.svg
│   └── preview.png
├── assistants/                 # Assistant presets
│   └── my-assistant-context.md
├── channels/                   # Channel plugins
│   └── my-channel.js
├── contributes/                # Additional contribute definitions
│   └── settings-tabs.json
├── i18n/                       # Internationalization
│   ├── en-US.json
│   └── fr-FR.json
├── settings/                   # Settings UI
│   └── settings-component.tsx
├── skills/                     # Agent skills
│   └── my-skill.md
└── themes/                     # UI themes
    └── my-theme.css
```

## Step-by-Step Guide

### Step 1: Create Extension Directory

```bash
mkdir my-full-extension
cd my-full-extension
```

### Step 2: Create Manifest (aion-extension.json)

```json
{
  "name": "my-full-extension",
  "displayName": "My Full Extension",
  "version": "1.0.0",
  "description": "A comprehensive extension with multiple features",
  "author": "Your Name",
  "i18n": {
    "localesDir": "i18n",
    "defaultLocale": "en-US"
  },
  "contributes": {
    "acpAdapters": [],
    "skills": [],
    "mcpServers": [],
    "channelPlugins": [],
    "themes": [],
    "assistants": [],
    "settingsTabs": "$file:contributes/settings-tabs.json"
  }
}
```

### Step 3: Add ACP Adapters

#### CLI Adapter

```json
{
  "contributes": {
    "acpAdapters": [
      {
        "id": "my-cli-agent",
        "name": "My CLI Agent",
        "description": "CLI-based AI agent",
        "connectionType": "cli",
        "cliCommand": "my-tool",
        "defaultCliPath": "npx @scope/my-tool",
        "acpArgs": ["--acp"],
        "icon": "assets/icon.svg",
        "supportsStreaming": true,
        "models": ["model-a", "model-b"]
      }
    ]
  }
}
```

#### HTTP Adapter

```json
{
  "contributes": {
    "acpAdapters": [
      {
        "id": "my-http-agent",
        "name": "My HTTP Agent",
        "description": "HTTP-based AI agent",
        "connectionType": "http",
        "endpoint": "https://api.example.com/acp",
        "supportsStreaming": false,
        "apiKeyFields": [
          {
            "key": "API_KEY",
            "label": "API Key",
            "type": "password",
            "required": true
          }
        ]
      }
    ]
  }
}
```

### Step 4: Add Skills

Create skill files in `skills/` directory:

**skills/my-skill.md:**

```markdown
# My Skill

## Description

This skill provides specialized capabilities for...

## Instructions

When this skill is active, you should...

## Examples

- Example 1
- Example 2
```

Register in manifest:

```json
{
  "contributes": {
    "skills": [
      {
        "name": "my-skill",
        "description": "My specialized skill",
        "file": "skills/my-skill.md"
      }
    ]
  }
}
```

### Step 5: Add MCP Servers

#### Stdio MCP Server

```json
{
  "contributes": {
    "mcpServers": [
      {
        "name": "my-stdio-server",
        "description": "MCP server via stdio",
        "transport": {
          "type": "stdio",
          "command": "my-mcp-server",
          "args": ["--stdio"]
        },
        "enabled": true
      }
    ]
  }
}
```

#### HTTP MCP Server

```json
{
  "contributes": {
    "mcpServers": [
      {
        "name": "my-http-server",
        "description": "MCP server via HTTP",
        "transport": {
          "type": "http",
          "url": "http://localhost:8080/mcp"
        },
        "enabled": false
      }
    ]
  }
}
```

### Step 6: Add Channel Plugin

Create channel plugin in `channels/` directory:

**channels/my-channel.js:**

```javascript
module.exports = {
  async init(config, credentials) {
    // Initialize channel
    this.config = config;
    this.credentials = credentials;
  },

  async sendMessage(channelId, message) {
    // Send message to channel
    console.log(`Sending to ${channelId}:`, message);
  },

  async receiveMessages(channelId, callback) {
    // Receive messages from channel
    // Call callback with new messages
  },

  async listChannels() {
    // List available channels
    return [
      { id: 'channel-1', name: 'Channel 1' },
      { id: 'channel-2', name: 'Channel 2' },
    ];
  },
};
```

Register in manifest:

```json
{
  "contributes": {
    "channelPlugins": [
      {
        "type": "my-channel",
        "name": "My Channel",
        "description": "My custom channel integration",
        "entryPoint": "channels/my-channel.js",
        "credentialFields": [
          {
            "key": "apiToken",
            "label": "API Token",
            "type": "password",
            "required": true
          }
        ],
        "configFields": [
          {
            "key": "pollingInterval",
            "label": "Polling Interval (ms)",
            "type": "number",
            "required": false,
            "default": 5000
          }
        ]
      }
    ]
  }
}
```

### Step 7: Add Themes

Create theme files in `themes/` directory:

**themes/my-dark.css:**

```css
:root {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2a2a2a;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --accent: #4a9eff;
}
```

**themes/my-light.css:**

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f0f0f0;
  --text-primary: #1a1a1a;
  --text-secondary: #606060;
  --accent: #0066cc;
}
```

Register in manifest:

```json
{
  "contributes": {
    "themes": [
      {
        "id": "my-dark-theme",
        "name": "My Dark Theme",
        "file": "themes/my-dark.css",
        "cover": "assets/dark-cover.svg"
      },
      {
        "id": "my-light-theme",
        "name": "My Light Theme",
        "file": "themes/my-light.css",
        "cover": "assets/light-cover.svg"
      }
    ]
  }
}
```

### Step 8: Add Assistants

Create assistant context in `assistants/` directory:

**assistants/my-assistant-context.md:**

```markdown
# My Assistant

## Role

You are a specialized assistant for...

## Capabilities

- Capability 1
- Capability 2

## Guidelines

- Guideline 1
- Guideline 2
```

Register in manifest:

```json
{
  "contributes": {
    "assistants": [
      {
        "id": "my-assistant",
        "name": "My Assistant",
        "description": "My custom assistant preset",
        "presetAgentType": "gemini",
        "contextFile": "assistants/my-assistant-context.md",
        "models": ["gemini-2.0-flash"],
        "enabledSkills": ["my-skill"],
        "prompts": ["You are a helpful assistant."]
      }
    ]
  }
}
```

### Step 9: Add Settings Tab

Create settings tab definition in `contributes/` directory:

**contributes/settings-tabs.json:**

```json
{
  "id": "my-extension-settings",
  "title": "My Extension",
  "icon": "assets/icon.svg",
  "component": "settings/MySettings.tsx"
}
```

Create settings component in `settings/` directory:

**settings/MySettings.tsx:**

```tsx
import { Form, Input, Switch, Button } from '@arco-design/web-react';

export default function MySettings() {
  return (
    <div className='p-4'>
      <h2>My Extension Settings</h2>
      <Form layout='vertical'>
        <Form.Item label='API Key'>
          <Input.Password placeholder='Enter API key' />
        </Form.Item>
        <Form.Item label='Enable Feature'>
          <Switch />
        </Form.Item>
        <Form.Item>
          <Button type='primary'>Save Settings</Button>
        </Form.Item>
      </Form>
    </div>
  );
}
```

### Step 10: Add Internationalization

Create locale files in `i18n/` directory:

**i18n/en-US.json:**

```json
{
  "extensionName": "My Full Extension",
  "extensionDescription": "A comprehensive extension",
  "settingsTitle": "My Extension Settings"
}
```

**i18n/fr-FR.json:**

```json
{
  "extensionName": "Mon Extension Complète",
  "extensionDescription": "Une extension complète",
  "settingsTitle": "Paramètres de Mon Extension"
}
```

### Step 11: Add Assets

Create icons and images in `assets/` directory:

```bash
mkdir assets
# Add icon.svg, preview.png, etc.
```

## Complete Manifest Example

```json
{
  "name": "my-full-extension",
  "displayName": "My Full Extension",
  "version": "1.0.0",
  "description": "A comprehensive extension with multiple features",
  "author": "Your Name",
  "i18n": {
    "localesDir": "i18n",
    "defaultLocale": "en-US"
  },
  "contributes": {
    "acpAdapters": [
      {
        "id": "my-cli-agent",
        "name": "My CLI Agent",
        "description": "CLI-based AI agent",
        "connectionType": "cli",
        "cliCommand": "my-tool",
        "defaultCliPath": "npx @scope/my-tool",
        "acpArgs": ["--acp"],
        "icon": "assets/icon.svg",
        "supportsStreaming": true
      }
    ],
    "skills": [
      {
        "name": "my-skill",
        "description": "My specialized skill",
        "file": "skills/my-skill.md"
      }
    ],
    "mcpServers": [
      {
        "name": "my-mcp-server",
        "description": "MCP server",
        "transport": {
          "type": "stdio",
          "command": "my-mcp-server"
        },
        "enabled": true
      }
    ],
    "channelPlugins": [
      {
        "type": "my-channel",
        "name": "My Channel",
        "description": "Custom channel integration",
        "entryPoint": "channels/my-channel.js",
        "credentialFields": [
          {
            "key": "apiToken",
            "label": "API Token",
            "type": "password",
            "required": true
          }
        ]
      }
    ],
    "themes": [
      {
        "id": "my-theme",
        "name": "My Theme",
        "file": "themes/my-theme.css",
        "cover": "assets/theme-cover.svg"
      }
    ],
    "assistants": [
      {
        "id": "my-assistant",
        "name": "My Assistant",
        "description": "Custom assistant preset",
        "presetAgentType": "gemini",
        "contextFile": "assistants/my-assistant-context.md",
        "models": ["gemini-2.0-flash"],
        "enabledSkills": ["my-skill"]
      }
    ],
    "settingsTabs": "$file:contributes/settings-tabs.json"
  }
}
```

## Testing

### Local Testing

```bash
# Install extension locally
largo extension install ./my-full-extension

# Verify installation
largo extension list

# Test each feature
# - Test ACP adapter in settings
# - Test skill in conversation
# - Test MCP server connection
# - Test channel plugin
# - Test theme application
# - Test assistant preset
# - Test settings tab
```

### E2E Testing

Create E2E tests for your extension:

```typescript
// tests/extensions/my-extension.test.ts
import { test, expect } from '@playwright/test';

test('ACP adapter works', async ({ page }) => {
  // Navigate to settings
  await page.goto('/settings');

  // Select ACP adapter
  await page.click('[data-testid="acp-adapter-select"]');
  await page.click('text=My CLI Agent');

  // Configure adapter
  await page.fill('[data-testid="cli-path"]', 'my-tool');
  await page.click('text=Save');

  // Verify saved
  await expect(page.locator('text=Saved successfully')).toBeVisible();
});
```

## Packaging

```bash
# Create zip package
zip -r my-full-extension.zip my-full-extension/

# Verify package
unzip -l my-full-extension.zip
```

## Publishing

### Extension Hub

1. Upload to extension hub
2. Add screenshots and description
3. Set pricing (if applicable)
4. Submit for review

### Direct Distribution

Share zip file:

```bash
largo extension install ./my-full-extension.zip
```

## Best Practices

### Code Organization

- Keep related files together
- Use clear, descriptive names
- Separate concerns (handlers, UI, config)
- Document complex logic

### Performance

- Lazy load heavy resources
- Cache frequently accessed data
- Optimize asset sizes
- Use efficient algorithms

### Security

- Validate all inputs
- Secure sensitive data
- Use HTTPS for HTTP endpoints
- Implement proper authentication

### User Experience

- Provide clear error messages
- Include helpful documentation
- Design intuitive UI
- Support keyboard shortcuts

## Troubleshooting

### Extension Not Loading

**Error**: Extension failed to load

**Solution**:

- Verify manifest syntax (JSON validation)
- Check all file paths are correct
- Review console for specific errors
- Ensure all required files exist

### ACP Adapter Not Working

**Error**: ACP adapter connection failed

**Solution**:

- Verify CLI tool is installed
- Check command path is correct
- Test tool manually in terminal
- Review ACP arguments

### MCP Server Connection Failed

**Error**: MCP server not reachable

**Solution**:

- Verify MCP server is running
- Check transport configuration
- Test endpoint connectivity
- Review server logs

### Theme Not Applying

**Error**: Theme changes not visible

**Solution**:

- Verify CSS file syntax
- Check CSS variable names
- Ensure theme is selected in settings
- Clear browser cache

## Related Documentation

- [Extension Manifest Reference](../api-reference/extension-manifest.md) - Full manifest schema
- [ACP Adapter Guide](./acp-adapter-guide.md) - ACP-specific guide
- [Extension Development Guide](../onboarding/extension-development.md) - General development
- [examples/e2e-full-extension/](../../examples/e2e-full-extension/) - Working example
