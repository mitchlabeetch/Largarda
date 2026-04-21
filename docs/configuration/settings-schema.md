# Settings Schema Reference

## Overview

Application settings structure and schema. Settings are stored in the database and managed through the SettingsService.

## Settings Structure

```typescript
interface Settings {
  // General
  language: string;
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;

  // AI Models
  anthropic: {
    apiKey: string;
    model: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  gemini: {
    apiKey: string;
    model: string;
  };
  bedrock: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    model: string;
  };

  // Extensions
  extensions: {
    enabled: string[];
    configs: Record<string, any>;
  };

  // Team
  team: {
    enabled: boolean;
    defaultTeamId: string;
  };

  // Pet
  pet: {
    enabled: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };

  // Privacy
  privacy: {
    telemetry: boolean;
    crashReports: boolean;
  };

  // Advanced
  advanced: {
    debugMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}
```

## Key Settings

### Language

- **Type**: `string`
- **Default**: `fr-FR`
- **Options**: `fr-FR`, `en-US`, `zh-CN`, `ja-JP`, `zh-TW`, `ko-KR`, `tr-TR`, `ru-RU`, `uk-UA`
- **Description**: Application language

### Theme

- **Type**: `'light' | 'dark' | 'auto'`
- **Default**: `'auto'`
- **Description**: UI theme (follows system when auto)

### Font Size

- **Type**: `number`
- **Default**: `14`
- **Range**: `12` - `24`
- **Description**: Base font size in pixels

### AI Provider Settings

#### Anthropic

```typescript
{
  apiKey: string,        // API key
  model: string          // Model ID (e.g., 'claude-3-sonnet-20240229')
}
```

#### OpenAI

```typescript
{
  apiKey: string,        // API key
  model: string          // Model ID (e.g., 'gpt-4o')
}
```

#### Gemini

```typescript
{
  apiKey: string,        // API key
  model: string          // Model ID (e.g., 'gemini-pro')
}
```

#### AWS Bedrock

```typescript
{
  accessKeyId: string,   // AWS access key
  secretAccessKey: string, // AWS secret key
  region: string,        // AWS region
  model: string          // Model ID
}
```

### Extension Settings

```typescript
{
  enabled: string[],     // List of enabled extension IDs
  configs: Record<string, any>  // Extension-specific configurations
}
```

### Team Settings

```typescript
{
  enabled: boolean,      // Enable multi-agent teams
  defaultTeamId: string  // Default team ID
}
```

### Pet Settings

```typescript
{
  enabled: boolean,      // Enable pet companion
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}
```

### Privacy Settings

```typescript
{
  telemetry: boolean,    // Enable telemetry
  crashReports: boolean  // Enable crash reporting
}
```

### Advanced Settings

```typescript
{
  debugMode: boolean,    // Enable debug mode
  logLevel: 'error' | 'warn' | 'info' | 'debug'
}
```

## Settings Storage

### Database Storage

Settings are persisted in the `settings` table:

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt INTEGER NOT NULL
)
```

### Access Pattern

```typescript
// Get all settings
const settings = await window.electronAPI.systemSettings.getSettings();

// Get single setting
const theme = await window.electronAPI.systemSettings.getSetting('theme');

// Update setting
await window.electronAPI.systemSettings.updateSetting('theme', 'dark');

// Reset to defaults
await window.electronAPI.systemSettings.resetSettings();
```

## Default Values

Default values are defined in `src/common/config/storage.ts`:

```typescript
const defaultSettings: Settings = {
  language: 'fr-FR',
  theme: 'auto',
  fontSize: 14,
  anthropic: { apiKey: '', model: 'claude-3-sonnet-20240229' },
  openai: { apiKey: '', model: 'gpt-4o' },
  gemini: { apiKey: '', model: 'gemini-pro' },
  extensions: { enabled: [], configs: {} },
  team: { enabled: false, defaultTeamId: '' },
  pet: { enabled: true, position: 'top-right' },
  privacy: { telemetry: true, crashReports: true },
  advanced: { debugMode: false, logLevel: 'info' },
};
```

## Validation

Settings are validated before saving:

- Type checking
- Range validation (e.g., font size)
- Enum validation (e.g., theme, language)
- Required field validation

## Related Documentation

- [src/common/config/storage.ts](../../src/common/config/storage.ts) - Settings storage
- [src/process/services/settings/](../../src/process/services/settings/) - Settings service
- [src/renderer/pages/settings/](../../src/renderer/pages/settings/) - Settings UI
