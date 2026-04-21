# src/renderer/components/chat/ - Chat Components

## Overview

React components for the chat interface. Includes message rendering, input handling, command menus, and chat-specific UI elements.

## Directory Structure

### Core Components

- **sendbox.tsx** (57KB) - Main message input component
  - Message composition
  - Attachment handling
  - Markdown preview
  - Command execution
  - Streaming input

- **sendbox.css** (10KB) - Sendbox styles

- **CollapsibleContent.tsx** (8.7KB) - Collapsible content wrapper
  - Expand/collapse functionality
  - Smooth animations
  - State management

- **CommandQueuePanel.tsx** (13.4KB) - Command queue display
  - Queued commands visualization
  - Command status
  - Queue management

- **SlashCommandMenu.tsx** (4.6KB) - Slash command menu
  - Command suggestions
  - Command help
  - Keyboard navigation

- **EmojiPicker.tsx** (10.6KB) - Emoji picker component
  - Emoji search
  - Category filtering
  - Recent emojis

- **SpeechInputButton.tsx** (8.1KB) - Speech-to-text input button
  - Voice recording
  - Speech recognition
  - Audio visualization

- **ThoughtDisplay.tsx** (3.9KB) - Agent thought/reasoning display
  - Reasoning visualization
  - Collapsible sections
  - Formatting

### Subdirectories

#### `AtFileMenu/` (1 items)

@mention file menu component.

#### `BtwOverlay/` (3 items)

"Btw" (by the way) overlay component for side questions.

## Component Features

### Sendbox

- Rich text input with Markdown support
- File attachment handling
- Image paste support
- Command execution (/ and @)
- Streaming message input
- Auto-resize textarea
- Keyboard shortcuts

### Command Queue

- Visual display of queued commands
- Status indicators
- Cancel capability
- Progress tracking

### Slash Commands

- Command autocomplete
- Command descriptions
- Parameter hints
- Keyboard navigation

### Emoji Picker

- Search functionality
- Category tabs
- Recent emoji tracking
- Skin tone selection

### Speech Input

- Voice recording
- Real-time transcription
- Audio visualization
- Language selection

### Thought Display

- Agent reasoning visualization
- Collapsible sections
- Syntax highlighting
- Copy functionality

## Related Documentation

- [src/renderer/components/](../) - Components overview
- [src/common/chat/](../../../common/chat/) - Chat system logic
- [src/renderer/pages/conversation/](../../pages/conversation/) - Conversation pages
