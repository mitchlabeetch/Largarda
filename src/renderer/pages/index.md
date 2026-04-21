# src/renderer/pages/ - Page Components

## Overview

Page-level components for different application views. Each page represents a major screen or route in the application.

## Directory Structure

### Root Pages

- **TestShowcase.tsx** (5.9KB) - Component showcase and testing page
  - Component library preview
  - Interactive examples
  - Development tool

### `conversation/` (177 items)

Conversation interface pages.

- Main chat interface
- Conversation list
- Message history
- New conversation creation
- Conversation settings
- Attachment management
- Agent selection
- Streaming message display

### `cron/` (9 items)

Scheduled task management pages.

- Cron job configuration
- Task list
- Execution history
- Schedule editor
- Task logs

### `guid/` (27 items)

GUID/ID management pages.

- GUID generation
- ID tracking
- Reference management
- ID validation

### `login/` (4 items)

Authentication pages.

- Login form
- Password reset
- Authentication flows
- WebUI login

### `ma/` (6 items)

M&A feature pages.

- Company analysis
- Valuation tools
- Sector comparison
- Document generation
- Financial reporting

### `settings/` (61 items)

Settings pages.

- General settings
- API configuration
- Theme settings
- Language settings
- Extension management
- Team configuration
- Account settings
- Privacy settings

### `team/` (16 items)

Multi-agent team pages.

- Team creation
- Agent configuration
- Workflow design
- Execution monitoring
- Result display
- Team history

## Page Architecture

### Routing

Pages are routed using React Router:

- File-based routing hints
- Route configuration
- Nested routes
- Protected routes

### Layout

Pages use common layout components:

- Sidebar navigation
- Header
- Content area
- Responsive layouts

### State Management

Pages use services and hooks:

- Service layer for data
- Custom hooks for state
- Context for global state
- Local state for UI

## Key Pages

### Conversation Pages

Core chat functionality:

- Real-time messaging
- Streaming responses
- Attachment handling
- Agent switching
- Conversation history

### Settings Pages

Application configuration:

- Modular settings organization
- Form validation
- Persistence
- Real-time preview

### Team Pages

Multi-agent workflows:

- Team configuration
- Agent orchestration
- Workflow visualization
- Execution monitoring

### M&A Pages

Domain-specific features:

- Financial analysis
- Valuation tools
- Document generation
- Sector benchmarks

## Related Documentation

- [src/renderer/components/](../components/) - Reusable components
- [src/renderer/services/](../services/) - Frontend services
- [src/renderer/hooks/](../hooks/) - Custom hooks
