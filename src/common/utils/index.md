# src/common/utils/ - Shared Utilities

## Overview

Shared utility functions used across all processes.

## Directory Structure

### Core Files

- **appConfig.ts** (1.2KB) - Application configuration utilities
- **buildAgentConversationParams.ts** (3.7KB) - Agent conversation parameter building
- **index.ts** (160B) - Module exports
- **platformAuthType.ts** (2.6KB) - Platform authentication type handling
- **platformConstants.ts** (432B) - Platform-specific constants
- **presetAssistantResources.ts** (3.7KB) - Preset assistant resource management
- **protocolDetector.ts** (13.9KB) - AI protocol detection
- **urlValidation.ts** (2.9KB) - URL validation utilities
- **utils.ts** (1.9KB) - General utility functions

### `shims/` (1 items)

Compatibility shims for different environments.

## Key Utilities

### Protocol Detection

Determines which AI provider to use based on configuration:

```typescript
const provider = detectProtocol(modelName);
// Returns: 'anthropic' | 'openai' | 'gemini' | 'bedrock'
```

### URL Validation

Validates and sanitizes URLs:

```typescript
const isValid = isValidUrl(url);
const sanitized = sanitizeUrl(url);
```

### Platform Authentication

Handles platform-specific authentication types:

```typescript
const authType = getPlatformAuthType(platform);
```

### Agent Parameters

Builds conversation parameters for agents:

```typescript
const params = buildAgentConversationParams(config);
```

## Related Documentation

- [src/common/api/](../api/) - API client utilities
