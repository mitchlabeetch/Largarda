# src/renderer/ - Renderer Process

## Overview

Renderer process code running in the browser/Chromium context. This process has access to DOM APIs, React, and browser APIs, but no Node.js APIs. It handles the UI, user interactions, and frontend logic.

## Directory Structure

### `assets/` (54 items)

Static assets for the renderer.

- Images, fonts, icons, and other static resources
- Pet animation states
- UI graphics and illustrations

### `components/` (113 items)

Reusable React components organized by domain.

- **IconParkHOC.tsx** - Higher-order component for IconPark icons
- **ShimmerText.tsx** - Shimmer loading effect text
- **Markdown/** - Markdown rendering components (5 items)
- **agent/** - Agent-related UI components (7 items)
- **base/** - Base UI components (9 items)
- **chat/** - Chat interface components (12 items)
- **layout/** - Layout and navigation components (23 items)
- **ma/** - M&A-specific components (11 items)
- **media/** - Media handling components (8 items)
- **settings/** - Settings UI components (34 items)
- **workspace/** - Workspace management components (2 items)

### `hooks/` (69 items)

Custom React hooks.

- **ui/** - UI-specific hooks
- State management hooks
- Data fetching hooks
- Effect hooks for common patterns

### `pages/` (301 items)

Page-level components for different application views.

- **TestShowcase.tsx** - Component showcase/testing page
- **conversation/** - Conversation interface pages (177 items)
- **cron/** - Scheduled task management pages (9 items)
- **guid/** - GUID/ID management pages (27 items)
- **login/** - Authentication pages (4 items)
- **ma/** - M&A feature pages (6 items)
- **settings/** - Settings pages (61 items)
- **team/** - Multi-agent team pages (16 items)

### `pet/` (7 items)

Pet companion UI components.

- Pet rendering and animation
- Interaction handlers
- State display

### `services/` (205 items)

Frontend services and API clients.

- API wrappers for backend services
- Data fetching and caching
- State management services
- Event handling

### `styles/` (8 items)

Global styles and theme configurations.

- **themes/** - Theme definitions (light/dark modes)
- Global CSS variables
- UnoCSS configuration extensions
- Arco Design overrides

### `utils/` (45 items)

Renderer-specific utilities.

- **chat/** - Chat utilities
- **ui/** - UI helper functions
- **workspace/** - Workspace utilities
- Form validation
- Data transformation

### Root Files

- **index.html** - HTML entry point
- **main.tsx** - React application entry point
- **types.d.ts** - Renderer-specific TypeScript declarations

## UI Library

### Arco Design

- Primary UI component library: `@arco-design/web-react`
- No raw interactive HTML elements (button, input, select, etc.)
- All interactive elements use Arco components

### Icons

- Icon library: `@icon-park/react`
- Consistent icon set throughout the application
- IconParkHOC wrapper for consistent styling

### Styling

- **UnoCSS** - Utility-first CSS framework
- **CSS Modules** - Component-specific styles (`.module.css`)
- **Semantic tokens** - Color tokens from `uno.config.ts`
- No hardcoded color values

## Component Organization

### Base Components

- Foundational UI elements
- Wrappers around Arco Design components
- Consistent styling and behavior

### Chat Components

- Message rendering
- Input handling
- Attachment management
- Markdown display
- Code highlighting

### Layout Components

- Navigation
- Sidebar
- Header
- Content areas
- Responsive layouts

### Settings Components

- Configuration forms
- Toggle switches
- API key management
- Theme selection
- Language selection

### M&A Components

- Financial data display
- Valuation results
- Company information
- Sector analysis
- Document generation

## Page Structure

### Conversation Pages

- Main chat interface
- Conversation list
- Message history
- Attachment preview
- Agent selection

### Settings Pages

- General settings
- API configuration
- Theme settings
- Language settings
- Extension management
- Team configuration

### Team Pages

- Team creation
- Agent configuration
- Workflow design
- Execution monitoring
- Result display

### M&A Pages

- Company analysis
- Valuation tools
- Sector multiples
- Document generation
- Report viewing

## State Management

### Services Pattern

- Services encapsulate data fetching and state
- Singleton instances for shared state
- React hooks for component integration

### Hooks Pattern

- Custom hooks for reusable state logic
- Separation of concerns
- Testable state management

## Styling System

### UnoCSS Utilities

- Utility classes for common styles
- Semantic color tokens
- Responsive utilities
- Animation utilities

### CSS Modules

- Component-scoped styles
- Avoid global style pollution
- :global() for Arco overrides

### Theme System

- Light/dark mode support
- CSS custom properties
- Theme switching without reload
- Mint Whisper color scheme

## Design Patterns

### Component Composition

- Small, focused components
- Composition over inheritance
- Reusable building blocks

### Container/Presenter

- Container components handle logic
- Presenter components handle rendering
- Separation of concerns

### Higher-Order Components

- IconParkHOC for icon consistency
- Cross-cutting concerns
- Reusable behavior

## Related Documentation

- [Design System](../../docs/DESIGN_SYSTEM.md) - Mint Whisper theme details
- [Code Style](../../docs/CODE_STYLE.md) - Component naming conventions
- [AGENTS.md](../../AGENTS.md) - File structure rules
