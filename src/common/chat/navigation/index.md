# src/common/chat/navigation/ - Chat Navigation

## Overview

Chat navigation and history management. Handles route interception, navigation state, and URL parameter handling for chat interfaces.

## Directory Structure

### Files

- **NavigationInterceptor.ts** (7.7KB) - Navigation interception and handling
  - Route interception
  - Navigation state management
  - URL parameter parsing
  - Navigation guards
  - History tracking

- **index.ts** (338B) - Module exports

## Features

### Route Interception

- Intercept navigation events
- Modify routes before navigation
- Prevent navigation when needed
- Custom routing logic

### URL Parameter Handling

- Parse URL parameters
- Extract conversation IDs
- Handle message IDs
- Manage query parameters

### Navigation Guards

- Prevent unauthorized navigation
- Validate navigation targets
- Check permissions
- Redirect as needed

### History Management

- Track navigation history
- Support back/forward
- Maintain state across navigation
- Restore state on return

## Usage Patterns

### Setting Up Interceptor

```typescript
import { NavigationInterceptor } from '@/common/chat/navigation';

const interceptor = new NavigationInterceptor({
  onBeforeNavigate: (to, from) => {
    // Guard logic
    return true; // allow navigation
  },
});
```

### Extracting Parameters

```typescript
const params = interceptor.parseUrl('/conversation/123?message=456');
// params: { conversationId: '123', messageId: '456' }
```

## Related Documentation

- [src/common/chat/](../) - Chat system overview
- [src/renderer/pages/conversation/](../../renderer/pages/conversation/) - Conversation pages
