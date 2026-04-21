# src/renderer/pages/conversation/ - Conversation Pages

## Overview

Page components for the conversation interface. The largest page module with 177 items, handling all aspects of chat conversations.

## Directory Structure

### Core Files

- **index.tsx** (2.3KB) - Conversation page entry point

### `Messages/` (33 items)

Message display and management components.

- Message rendering
- Streaming messages
- Message actions
- Message history
- Message search
- Message filtering

### `Preview/` (45 items)

File and document preview components.

- Image preview
- PDF preview
- Document preview
- Code preview
- Preview controls
- Preview navigation

### `Workspace/` (24 items)

Workspace management components.

- Workspace selector
- Workspace settings
- Workspace sharing
- Workspace history

### `GroupedHistory/` (19 items)

Grouped conversation history components.

- History grouping
- Date headers
- Search in history
- History navigation

### `components/` (18 items)

Shared conversation components.

- Message containers
- Input wrappers
- Action buttons
- Status indicators

### `hooks/` (7 items)

Conversation-specific hooks.

- Message state
- Conversation state
- Input state
- Streaming state

### `platforms/` (25 items)

Platform-specific conversation components.

- Desktop platform
- WebUI platform
- Mobile platform
- Platform adaptations

### `utils/` (5 items)

Conversation utilities.

- Message formatting
- Time formatting
- Search utilities
- Filtering logic

## Key Features

### Message Display

- Rich message rendering
- Markdown support
- Code highlighting
- Image display
- File attachments
- Streaming message updates

### Message Actions

- Copy message
- Edit message
- Delete message
- Regenerate response
- Quote/reply

### Conversation Management

- New conversation
- Conversation list
- Conversation search
- Conversation settings
- Conversation sharing

### Preview System

- Multi-format preview (PDF, images, code, documents)
- Preview controls (zoom, rotate, navigate)
- Preview history
- Download from preview

### Workspace Integration

- Workspace switching
- Workspace settings
- Workspace sharing
- Workspace snapshots

### Platform Adaptations

- Desktop-specific features
- WebUI-specific features
- Mobile-specific features
- Responsive design

## Related Documentation

- [src/renderer/components/chat/](../../components/chat/) - Chat components
- [src/common/chat/](../../../common/chat/) - Chat system logic
- [src/renderer/pages/](../) - Pages overview
