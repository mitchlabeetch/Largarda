# src/renderer/services/ - Frontend Services

## Overview

Frontend services and API clients for renderer process. Provide data fetching, state management, and business logic for the UI.

## Directory Structure

### Core Services

- **FileService.ts** (10KB) - File handling service
  - File upload/download
  - File preview
  - File validation
  - File management

- **PasteService.ts** (11.6KB) - Clipboard paste handling
  - Image paste
  - Text paste
  - File paste
  - Rich content handling

- **SpeechToTextService.ts** (2.8KB) - Speech recognition service
  - Voice input
  - Speech-to-text
  - Audio processing

- **registerPwa.ts** (1.1KB) - PWA registration
  - Service worker registration
  - PWA setup

### `i18n/` (201 items)

Internationalization service.

- Translation files
- Language switching
- Translation loading
- i18n client

## Service Pattern

### API Calls

```typescript
// Service wraps IPC calls
class ConversationService {
  async sendMessage(conversationId: string, content: string) {
    return await window.electronAPI.conversation.sendMessage({
      conversationId,
      content,
    });
  }
}
```

### State Management

Services manage state and provide reactive updates:

```typescript
class SettingsService {
  private settings = writable(defaultSettings);

  get() {
    return this.settings;
  }

  async update(newSettings: Partial<Settings>) {
    await window.electronAPI.settings.update(newSettings);
    this.settings.update((s) => ({ ...s, ...newSettings }));
  }
}
```

## Related Documentation

- [src/process/bridge/](../../process/bridge/) - IPC bridge APIs
- [src/renderer/hooks/](../hooks/) - React hooks
