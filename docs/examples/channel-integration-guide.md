# Channel Integration Guide

## Overview

Step-by-step guide to creating a channel plugin extension for Largo. Channel plugins enable integration with external communication platforms (Feishu, WeCom, Telegram, etc.) to send and receive messages.

## What is a Channel Plugin?

Channel plugins bridge Largo with external messaging platforms, allowing AI agents to communicate through various channels beyond the built-in chat interface.

### Example Use Cases

- Feishu (Lark) integration for enterprise messaging
- WeChat Work (WeCom) for Chinese enterprise communication
- Telegram for global messaging
- Slack for team collaboration
- Custom internal messaging systems

## Extension Structure

```
my-channel-extension/
├── aion-extension.json    # Extension manifest
├── assets/                # Icons and static files
│   └── icon.svg
├── channels/              # Channel plugin implementation
│   └── my-channel.js
├── i18n/                  # Internationalization (optional)
│   ├── en-US.json
│   └── fr-FR.json
└── webui/                 # WebUI routes (optional)
    └── api-routes.js
```

## Step-by-Step Guide

### Step 1: Create Extension Directory

```bash
mkdir my-channel-extension
cd my-channel-extension
```

### Step 2: Create Manifest (aion-extension.json)

```json
{
  "name": "my-channel-extension",
  "displayName": "My Channel Extension",
  "version": "1.0.0",
  "description": "Channel plugin for external messaging platform",
  "author": "Your Name",
  "icon": "assets/icon.svg",
  "i18n": {
    "localesDir": "i18n",
    "defaultLocale": "en-US"
  },
  "contributes": {
    "channelPlugins": [
      {
        "type": "my-channel",
        "name": "My Channel",
        "description": "Custom channel integration",
        "icon": "assets/icon.svg",
        "entryPoint": "channels/my-channel.js",
        "credentialFields": [
          {
            "key": "apiKey",
            "label": "API Key",
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

### Manifest Properties Explained

| Property           | Type   | Required | Description                         |
| ------------------ | ------ | -------- | ----------------------------------- |
| `type`             | string | Yes      | Unique channel type identifier      |
| `name`             | string | Yes      | Display name for the channel        |
| `description`      | string | Yes      | Human-readable description          |
| `entryPoint`       | string | Yes      | Path to channel plugin file         |
| `credentialFields` | array  | No       | Authentication configuration fields |
| `configFields`     | array  | No       | Additional configuration fields     |

### Step 3: Implement Channel Plugin

Create `channels/my-channel.js`:

```javascript
class MyChannelPlugin {
  constructor(config, credentials) {
    this.config = config || {};
    this.credentials = credentials || {};
    this.running = false;
    this.activeUsers = new Set();
    this.metrics = {
      received: 0,
      sent: 0,
      errors: 0,
      lastEventAt: 0,
    };
  }

  // Lifecycle methods
  async start() {
    // Initialize connection to external platform
    this.running = true;
    console.log('My Channel started');
    return { ok: true, plugin: 'my-channel' };
  }

  async stop() {
    // Cleanup and disconnect
    this.running = false;
    console.log('My Channel stopped');
    return { ok: true };
  }

  isRunning() {
    return this.running;
  }

  // Bot information
  getBotInfo() {
    return {
      displayName: 'My Channel Bot',
      avatar: 'assets/icon.svg',
    };
  }

  getActiveUserCount() {
    return this.activeUsers.size;
  }

  // Message operations
  async sendMessage(chatId, message) {
    if (!this.running) {
      throw new Error('Channel plugin is not running');
    }

    try {
      // Send message to external platform
      // Example: await platformAPI.sendMessage(chatId, message);

      this.metrics.sent += 1;
      this.metrics.lastEventAt = Date.now();

      return {
        ok: true,
        messageId: `msg-${Date.now()}`,
      };
    } catch (error) {
      this.metrics.errors += 1;
      throw error;
    }
  }

  async editMessage(chatId, messageId, newMessage) {
    if (!this.running) {
      throw new Error('Channel plugin is not running');
    }

    try {
      // Edit message on external platform
      // Example: await platformAPI.editMessage(chatId, messageId, newMessage);

      this.metrics.lastEventAt = Date.now();

      return { ok: true };
    } catch (error) {
      this.metrics.errors += 1;
      throw error;
    }
  }

  // Event handling
  async ingestIncomingEvent(event) {
    if (!this.running) {
      return { ok: false, reason: 'not-running' };
    }

    try {
      // Process incoming event from external platform
      const eventId = event.eventId || String(Date.now());
      const userId = event.userId || 'unknown';

      // Track active users
      this.activeUsers.add(userId);

      // Update metrics
      this.metrics.received += 1;
      this.metrics.lastEventAt = Date.now();

      // Emit event to Largo
      // This is handled by the channel system

      return {
        ok: true,
        eventId,
        userId,
      };
    } catch (error) {
      this.metrics.errors += 1;
      return {
        ok: false,
        reason: error.message,
      };
    }
  }

  // Metrics and data collection
  getCollectedData() {
    return {
      ...this.metrics,
      activeUsers: this.activeUsers.size,
    };
  }

  // Utility methods
  async listChannels() {
    // Return list of available chats/channels
    return [
      { id: 'channel-1', name: 'Channel 1' },
      { id: 'channel-2', name: 'Channel 2' },
    ];
  }

  async getChannelInfo(channelId) {
    // Get information about a specific channel
    return {
      id: channelId,
      name: `Channel ${channelId}`,
      memberCount: 10,
    };
  }
}

module.exports = MyChannelPlugin;
```

### Step 4: Add Icon

Create an SVG icon in `assets/`:

```bash
mkdir assets
# Add icon.svg file
```

### Step 5: Add Internationalization (Optional)

Create locale files:

**i18n/en-US.json:**

```json
{
  "channelName": "My Channel",
  "channelDescription": "Custom channel integration",
  "apiKeyLabel": "API Key",
  "pollingIntervalLabel": "Polling Interval"
}
```

**i18n/fr-FR.json:**

```json
{
  "channelName": "Mon Canal",
  "channelDescription": "Intégration de canal personnalisé",
  "apiKeyLabel": "Clé API",
  "pollingIntervalLabel": "Intervalle de Polling"
}
```

### Step 6: Add WebUI Routes (Optional)

For additional API endpoints:

**webui/api-routes.js:**

```javascript
module.exports = {
  '/my-channel/stats': async (req, res) => {
    // Handle stats request
    res.json({ messageCount: 100, activeUsers: 50 });
  },

  '/my-channel/webhook': async (req, res) => {
    // Handle webhook from external platform
    const event = req.body;
    // Process event
    res.json({ ok: true });
  },
};
```

Add to manifest:

```json
{
  "contributes": {
    "webui": {
      "apiRoutes": [
        {
          "path": "/my-channel/stats",
          "entryPoint": "webui/api-routes.js",
          "description": "Channel statistics",
          "auth": true
        }
      ]
    }
  }
}
```

## Advanced Features

### Event Deduplication

Prevent processing duplicate events:

```javascript
class MyChannelPlugin {
  constructor(config, credentials) {
    // ... other initialization
    this.processedEvents = new Map();
    this.eventTTL = 5 * 60 * 1000; // 5 minutes
  }

  async ingestIncomingEvent(event) {
    const eventId = event.eventId;

    // Check if already processed
    if (this.processedEvents.has(eventId)) {
      const timestamp = this.processedEvents.get(eventId);
      if (Date.now() - timestamp < this.eventTTL) {
        return { ok: true, deduped: true };
      }
    }

    // Mark as processed
    this.processedEvents.set(eventId, Date.now());

    // Process event
    // ...

    // Cleanup old events
    this.cleanupExpiredEvents();
  }

  cleanupExpiredEvents() {
    const now = Date.now();
    for (const [eventId, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.eventTTL) {
        this.processedEvents.delete(eventId);
      }
    }
  }
}
```

### Webhook Integration

Receive events via webhook:

```javascript
// In webui/api-routes.js
module.exports = {
  '/my-channel/webhook': async (req, res) => {
    try {
      const event = req.body;

      // Validate event signature if needed
      // if (!validateSignature(event)) {
      //   return res.status(401).json({ error: 'Invalid signature' });
      // }

      // Forward to channel plugin
      // await channelPlugin.ingestIncomingEvent(event);

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
```

### Message Formatting

Format messages for external platform:

```javascript
async formatMessage(message) {
  // Convert Largo message format to platform-specific format
  return {
    text: message.content,
    attachments: message.attachments || [],
    mentions: message.mentions || []
  };
}

async parseIncomingEvent(event) {
  // Convert platform event to Largo format
  return {
    eventId: event.id,
    userId: event.user_id,
    content: event.text,
    timestamp: event.timestamp,
    chatId: event.chat_id
  };
}
```

### Authentication

Handle different authentication methods:

```javascript
async authenticate(credentials) {
  const { apiKey, apiSecret } = credentials;

  // Validate credentials
  const response = await fetch('https://api.example.com/auth', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  return await response.json();
}
```

## Testing

### Unit Testing

```javascript
// tests/channel-plugin.test.js
const MyChannelPlugin = require('../channels/my-channel');

describe('MyChannelPlugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new MyChannelPlugin({ pollingInterval: 5000 }, { apiKey: 'test-key' });
  });

  test('should start successfully', async () => {
    const result = await plugin.start();
    expect(result.ok).toBe(true);
    expect(plugin.isRunning()).toBe(true);
  });

  test('should send message', async () => {
    await plugin.start();
    const result = await plugin.sendMessage('chat-1', 'Hello');
    expect(result.ok).toBe(true);
  });

  test('should track metrics', async () => {
    await plugin.start();
    await plugin.sendMessage('chat-1', 'Hello');
    const metrics = plugin.getCollectedData();
    expect(metrics.sent).toBe(1);
  });
});
```

### Manual Testing

```bash
# Install extension
largo extension install ./my-channel-extension

# Configure credentials
# Open Largo settings → Channels → My Channel
# Enter API key and configuration

# Test sending message
# Create a conversation and select My Channel
# Send a test message

# Test receiving message
# Send message to the external platform
# Verify it appears in Largo
```

## Example: Feishu Channel

Based on `examples/ext-feishu/`:

**Key Features:**

- Event deduplication with TTL
- In-memory data collection
- Metrics tracking
- Active user tracking

**Manifest:**

```json
{
  "name": "ext-feishu",
  "displayName": "ext-飞书",
  "contributes": {
    "channelPlugins": [
      {
        "type": "ext-feishu",
        "name": "ext-飞书 Channel",
        "description": "Feishu channel adapter",
        "entryPoint": "channels/ext-feishu-channel.js",
        "credentialFields": [
          {
            "key": "appId",
            "label": "App ID",
            "type": "text",
            "required": true
          },
          {
            "key": "appSecret",
            "label": "App Secret",
            "type": "password",
            "required": true
          }
        ]
      }
    ]
  }
}
```

## Best Practices

### Error Handling

- Always wrap external API calls in try-catch
- Implement retry logic for transient failures
- Log errors with sufficient context
- Provide meaningful error messages to users

### Performance

- Implement event deduplication to prevent duplicate processing
- Use efficient data structures (Map, Set)
- Cleanup old events to prevent memory leaks
- Implement rate limiting for API calls

### Security

- Never hardcode credentials
- Validate webhook signatures
- Use HTTPS for all external communication
- Implement proper authentication

### Testing

- Test both sending and receiving messages
- Test error scenarios
- Test with real platform when possible
- Include unit tests for critical logic

## Troubleshooting

### Connection Failed

**Error**: Unable to connect to platform

**Solution**:

- Verify credentials are correct
- Check network connectivity
- Verify API endpoint is accessible
- Check platform service status

### Message Not Sending

**Error**: Message send failed

**Solution**:

- Verify message format is correct
- Check rate limits
- Verify chat ID is valid
- Check plugin is running

### Events Not Receiving

**Error**: No incoming events

**Solution**:

- Verify webhook URL is correct
- Check webhook is registered with platform
- Verify event format matches expectations
- Check event processing logic

## Related Documentation

- [Extension Manifest Reference](../api-reference/extension-manifest.md) - Full manifest schema
- [Extension Development Guide](../onboarding/extension-development.md) - General extension development
- [examples/ext-feishu/](../../examples/ext-feishu/) - Feishu channel example
- [examples/ext-wecom-bot/](../../examples/ext-wecom-bot/) - WeCom bot example
