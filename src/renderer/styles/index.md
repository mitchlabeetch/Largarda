# src/renderer/styles/ - Styling System

## Overview

Global styles, theme definitions, and Arco Design overrides.

## Directory Structure

### Core Files

- **MIGRATION.md** (3.4KB) - Style migration guide
- **arco-override.css** (9.7KB) - Arco Design component overrides
- **colors.ts** (4.4KB) - Color token definitions
- **layout.css** (5.9KB) - Global layout styles

### `themes/` (4 items)

Theme definitions.

- Light theme
- Dark theme
- Custom themes
- Theme utilities

## Styling System

### UnoCSS

Primary styling framework:

- Utility classes
- Semantic color tokens
- Responsive utilities
- Animation utilities

### CSS Modules

Component-specific styles:

- `.module.css` files
- Scoped styles
- `:global()` for Arco overrides

### Color Tokens

Semantic color system:

```typescript
// colors.ts
export const colors = {
  primary: 'mint-teal',
  secondary: 'warm-cream',
  // ... semantic tokens
};
```

### Theme System

- Light/dark mode support
- CSS custom properties
- Theme switching without reload
- Mint Whisper color scheme

### Arco Overrides

Component-specific overrides via CSS Modules:

```css
/* Component.module.css */
:global(.arco-btn) {
  /* Override Arco button styles */
}
```

## Related Documentation

- [docs/DESIGN_SYSTEM.md](../../../../docs/DESIGN_SYSTEM.md) - Design system
- [uno.config.ts](../../../../uno.config.ts) - UnoCSS configuration
