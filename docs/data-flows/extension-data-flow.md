# Extension Data Flow

## Overview

Documentation of data flow through the extension system, from installation to execution and interaction with the main application.

## Architecture

```
┌──────────────┐
│   Extension  │
│   (Files)    │
└──────┬───────┘
       │ 1. Load manifest
┌──────▼──────────────────────┐
│   ExtensionLoader           │
│   - Parse aion-extension.json│
│   - Validate structure      │
│   - Resolve dependencies    │
└──────┬──────────────────────┘
       │ 2. Register
┌──────▼──────────────────────┐
│   ExtensionRegistry         │
│   - Store metadata          │
│   - Track versions          │
│   - Manage lifecycle        │
└──────┬──────────────────────┘
       │ 3. Load code
┌──────▼──────────────────────┐
│   Sandbox                   │
│   - Isolated execution      │
│   - API restrictions        │
│   - Resource limits         │
└──────┬──────────────────────┘
       │ 4. Initialize
┌──────▼──────────────────────┐
│   Extension Lifecycle       │
│   - onActivate()            │
│   - Register contributions  │
│   - Setup event handlers    │
└──────┬──────────────────────┘
       │ 5. Contribute
┌──────▼──────────────────────┐
│   Contribution System       │
│   - Channels                │
│   - Assistants              │
│   - Skills                  │
│   - Themes                  │
└──────┬──────────────────────┘
       │ 6. Runtime interaction
┌──────▼──────────────────────┐
│   Main Application          │
│   - Use extension features  │
│   - Call extension APIs     │
│   - Handle extension events │
└─────────────────────────────┘
```

## Installation Flow

### Step 1: Discovery

```typescript
// From Hub
const extensions = await hubClient.searchExtensions('feishu');

// From Local File
const extension = await ExtensionLoader.fromPath('/path/to/extension');
```

### Step 2: Validation

```typescript
// src/process/extensions/ExtensionLoader.ts
async validate(manifest: ExtensionManifest): Promise<ValidationResult> {
  // Check required fields
  if (!manifest.name || !manifest.version) {
    return { valid: false, errors: ['Missing required fields'] }
  }

  // Validate structure
  const schema = loadExtensionSchema()
  const result = schema.validate(manifest)

  // Check dependencies
  const deps = manifest.dependencies || {}
  for (const [dep, version] of Object.entries(deps)) {
    const installed = await registry.find(dep)
    if (!installed || !satisfiesVersion(installed.version, version)) {
      return { valid: false, errors: [`Missing dependency: ${dep}`] }
    }
  }

  return result
}
```

### Step 3: Installation

```typescript
// src/process/extensions/lifecycle/
async install(extensionPath: string): Promise<void> {
  // Copy to extensions directory
  const targetDir = path.join(extensionsDir, manifest.name)
  await fs.copy(extensionPath, targetDir)

  // Register in registry
  await registry.register(manifest)

  // Run post-install hooks
  if (manifest.hooks?.postInstall) {
    await runHook(manifest.hooks.postInstall)
  }

  // Load extension
  await this.load(manifest.name)
}
```

## Loading Flow

### Step 1: Load Manifest

```typescript
// src/process/extensions/ExtensionLoader.ts
async load(extensionName: string): Promise<Extension> {
  const manifestPath = path.join(extensionsDir, extensionName, 'aion-extension.json')
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))

  return {
    manifest,
    path: path.join(extensionsDir, extensionName),
    state: 'loaded'
  }
}
```

### Step 2: Resolve Dependencies

```typescript
// src/process/extensions/resolvers/
async resolveDependencies(manifest: ExtensionManifest): Promise<void> {
  const deps = manifest.dependencies || {}

  for (const [dep, version] of Object.entries(deps)) {
    const installed = await registry.find(dep)

    if (!installed) {
      // Install from hub
      await hubClient.install(dep, version)
    } else if (!satisfiesVersion(installed.version, version)) {
      // Update to compatible version
      await hubClient.update(dep, version)
    }
  }
}
```

### Step 3: Create Sandbox

```typescript
// src/process/extensions/sandbox/
async createSandbox(extension: Extension): Promise<Sandbox> {
  const sandbox = {
    context: {
      // Expose safe APIs
      api: createSafeAPI(),
      storage: createSafeStorage(extension.id),
      logger: createSafeLogger(extension.id)
    },
    restrictions: {
      network: manifest.permissions?.network || false,
      filesystem: manifest.permissions?.filesystem || [],
      ipc: manifest.permissions?.ipc || []
    }
  }

  return sandbox
}
```

### Step 4: Load Extension Code

```typescript
// src/process/extensions/ExtensionLoader.ts
async loadCode(extension: Extension, sandbox: Sandbox): Promise<void> {
  const entryPoint = path.join(extension.path, extension.manifest.main)
  const code = await fs.readFile(entryPoint, 'utf-8')

  // Execute in sandbox
  const module = executeInSandbox(code, sandbox.context)

  extension.module = module
  extension.sandbox = sandbox
}
```

## Activation Flow

### Step 1: Call onActivate

```typescript
// src/process/extensions/lifecycle/
async activate(extension: Extension): Promise<void> {
  if (extension.module?.onActivate) {
    await extension.module.onActivate({
      api: extension.sandbox.context.api,
      storage: extension.sandbox.context.storage,
      logger: extension.sandbox.context.logger
    })
  }

  extension.state = 'active'
}
```

### Step 2: Register Contributions

```typescript
// Contributions from manifest
const contributions = extension.manifest.contributes || {};

// Register channels
if (contributions.channels) {
  for (const channel of contributions.channels) {
    await channelRegistry.register(channel, extension);
  }
}

// Register assistants
if (contributions.assistants) {
  for (const assistant of contributes.assistants) {
    await assistantRegistry.register(assistant, extension);
  }
}

// Register skills
if (contributions.skills) {
  for (const skill of contributes.skills) {
    await skillRegistry.register(skill, extension);
  }
}
```

## Runtime Interaction Flow

### Channel Extension Example

```typescript
// Extension provides channel
export function onActivate({ api, logger }) {
  // Register channel
  api.channels.register({
    id: 'feishu',
    name: 'Feishu',
    handler: async (message) => {
      // Handle incoming message
      logger.info('Received message:', message);
      // Process and respond
    },
  });
}

// Main application uses channel
const channel = channelRegistry.get('feishu');
await channel.sendMessage({
  to: 'user123',
  content: 'Hello from Largo',
});
```

### Assistant Extension Example

```typescript
// Extension provides assistant
export function onActivate({ api }) {
  api.assistants.register({
    id: 'custom-assistant',
    name: 'Custom Assistant',
    systemPrompt: 'You are a helpful assistant...',
    tools: [
      {
        name: 'search',
        description: 'Search database',
        handler: async (params) => {
          return await api.storage.query(params);
        },
      },
    ],
  });
}

// Main application uses assistant
const assistant = assistantRegistry.get('custom-assistant');
const response = await assistant.generateResponse(messages);
```

### Skill Extension Example

```typescript
// Extension provides skill
export function onActivate({ api }) {
  api.skills.register({
    id: 'custom-skill',
    name: 'Custom Skill',
    description: 'Does something custom',
    execute: async (context) => {
      // Skill logic
      return result;
    },
  });
}

// Agent uses skill
const result = await agent.executeSkill('custom-skill', params);
```

## Event System

### Extension Events

```typescript
// Extension subscribes to events
export function onActivate({ api }) {
  api.events.on('conversation:new', async (conversation) => {
    // Handle new conversation
  });

  api.events.on('message:sent', async (message) => {
    // Handle sent message
  });
}
```

### Main Application Events

```typescript
// Main application emits events
eventBus.emit('conversation:new', conversation);
eventBus.emit('message:sent', message);
```

## Data Flow Summary

1. **Installation**: Extension files → Validation → Registry
2. **Loading**: Manifest → Dependencies → Sandbox → Code
3. **Activation**: onActivate → Contributions → Event handlers
4. **Runtime**: Main app → Extension API → Extension code → Response

## Security Considerations

### Sandbox Restrictions

- Limited API access
- Filesystem restrictions
- Network restrictions
- IPC restrictions

### Permission Model

```json
{
  "permissions": {
    "network": true,
    "filesystem": ["read"],
    "ipc": ["conversation:*"]
  }
}
```

### Validation

- Manifest schema validation
- Code signature verification (optional)
- Dependency security checks
- Malware scanning

## Related Documentation

- [src/process/extensions/](../../src/process/extensions/) - Extension system
- [examples/](../../examples/) - Extension examples
- [docs/feature/extension-market/](../feature/extension-market/) - Extension marketplace
