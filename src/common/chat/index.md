# src/common/chat/ - Chat System

## Overview

Core chat system logic shared across all processes. Handles message processing, slash commands, document integration, image generation, navigation, and approval workflows.

## Directory Structure

### Core Files

- **chatLib.ts** (21KB) - Core chat library
  - Message handling and context management
  - Conversation state management
  - Message formatting and parsing
  - Context window management
  - Streaming message handling

- **atCommandParser.ts** (4.3KB) - @mention command parser
  - Parses @mentions in messages
  - Extracts agent references
  - Command extraction
  - Validation logic

- **imageGenCore.ts** (11KB) - Image generation integration
  - Image generation API integration
  - Prompt engineering for images
  - Image format handling
  - Generation result processing

- **sideQuestion.ts** (555B) - Side question handling
  - Manages parallel questions
  - Context separation
  - Question routing

### `slash/` (2 items)

Slash command system for quick actions.

- **availability.ts** (1KB) - Availability slash command
  - Check agent availability
  - Status queries
  - Command execution

- **types.ts** (1.4KB) - Slash command type definitions
  - Command interface definitions
  - Parameter types
  - Response types

### `approval/` (2 items)

Message approval workflow system.

- **ApprovalStore.ts** (2KB) - Approval state management
  - Pending approval tracking
  - Approval history
  - State persistence

- **index.ts** (191B) - Module exports

### `document/` (1 items)

Document processing within chat.

- **DocumentConverter.ts** (6.6KB) - Document conversion for chat
  - PDF to text conversion
  - Word document parsing
  - Excel data extraction
  - Content preprocessing
  - Text chunking for context

### `navigation/` (2 items)

Chat navigation and history management.

- **NavigationInterceptor.ts** (7.7KB) - Navigation interception and handling
  - Route interception
  - Navigation state management
  - URL parameter handling
  - Navigation guards

- **index.ts** (338B) - Module exports

## Key Features

### Message Handling

- Message creation and formatting
- Context management
- Streaming support
- Message history
- Attachment handling

### Slash Commands

Quick actions via commands:

- `/availability` - Check agent status
- Custom command registration
- Parameter parsing
- Command execution

### Document Integration

- Document upload and processing
- Content extraction
- Text chunking
- Context integration
- Multi-format support (PDF, Word, Excel)

### Image Generation

- AI-powered image generation
- Prompt optimization
- Format handling
- Result display

### Approval Workflow

- Message approval required for sensitive actions
- Approval queue management
- Approval history tracking
- Multi-step approval support

### Navigation

- Chat navigation state
- URL parameter handling
- Route interception
- Navigation guards
- History management

## Usage Patterns

### Creating a Message

```typescript
import { chatLib } from '@/common/chat';

const message = await chatLib.createMessage({
  role: 'user',
  content: 'Hello',
  conversationId: '...',
});
```

### Parsing Slash Commands

```typescript
import { atCommandParser } from '@/common/chat';

const command = atCommandParser.parse('@agent help');
```

### Document Conversion

```typescript
import { DocumentConverter } from '@/common/chat/document';

const converter = new DocumentConverter();
const text = await converter.convertToText(file);
```

## Related Documentation

- [src/common/api/](../api/) - AI client integrations
- [src/renderer/components/chat/](../../renderer/components/chat/) - Chat UI components
- [src/renderer/pages/conversation/](../../renderer/pages/conversation/) - Conversation pages
