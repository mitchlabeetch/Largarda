# src/renderer/components/ - React Components

## Overview

Reusable React components organized by domain. All components use Arco Design library with UnoCSS styling and follow the project's naming conventions (PascalCase).

## Directory Structure

### Root Components

- **IconParkHOC.tsx** (909B) - Higher-order component for IconPark icons
  - Consistent icon styling
  - Size and color props
  - Theme awareness

- **ShimmerText.tsx** (2.2KB) - Shimmer loading effect text
  - Loading placeholder
  - Animated shimmer effect
  - Configurable dimensions

### `Markdown/` (5 items)

Markdown rendering components.

- Markdown to HTML rendering
- Code syntax highlighting
- Math formula support (KaTeX)
- GFM (GitHub Flavored Markdown)
- Custom component rendering

### `agent/` (7 items)

Agent-related UI components.

- Agent selection UI
- Agent configuration panels
- Agent status displays
- Agent avatar components

### `base/` (9 items)

Base UI components.

- Foundational building blocks
- Wrappers around Arco Design
- Common patterns
- Reusable primitives

### `chat/` (12 items)

Chat interface components.

- Message rendering
- Input components
- Attachment handlers
- Chat history display
- Streaming message indicators
- Code blocks with syntax highlighting

### `layout/` (23 items)

Layout and navigation components.

- Sidebar navigation
- Header components
- Content areas
- Responsive layouts
- Breadcrumb navigation
- Tab systems
- Split panes

### `ma/` (11 items)

M&A-specific components.

- Financial data displays
- Valuation result tables
- Company profile cards
- Sector comparison charts
- Document generation UI

### `media/` (8 items)

Media handling components.

- Image preview
- Video player
- File viewers
- Media galleries
- Attachment lists

### `settings/` (34 items)

Settings UI components.

- Configuration forms
- Toggle switches
- API key management
- Theme selection
- Language selection
- Extension management
- Team configuration

### `workspace/` (2 items)

Workspace management components.

- Workspace selector
- Workspace settings

## Component Patterns

### Container/Presenter

- Container components handle logic and state
- Presenter components handle rendering
- Separation of concerns for testability

### Composition

- Small, focused components
- Compose for complex UIs
- Reusable building blocks

### Higher-Order Components

- IconParkHOC for icon consistency
- Cross-cutting concerns
- Reusable behavior

## Styling

### UnoCSS Utilities

- Utility classes for common styles
- Semantic color tokens
- Responsive utilities

### CSS Modules

- Component-scoped styles
- `.module.css` files
- :global() for Arco overrides

### Theme System

- Light/dark mode support
- CSS custom properties
- Theme switching

## Related Documentation

- [src/renderer/styles/](../styles/) - Styling system
- [docs/DESIGN_SYSTEM.md](../../../docs/DESIGN_SYSTEM.md) - Design system
- [AGENTS.md](../../../AGENTS.md) - Component naming conventions
