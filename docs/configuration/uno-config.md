# UnoCSS Configuration Reference

## Overview

UnoCSS is the utility-first CSS framework used in Largo. Configuration defines semantic color tokens, custom rules, and shortcuts.

## uno.config.ts

### Presets

```typescript
{
  presets: [
    presetMini(), // Minimal preset
    presetExtra(), // Extra utilities
    presetWind3(), // Tailwind-like utilities
  ];
}
```

### Transformers

```typescript
{
  transformers: [
    transformerVariantGroup(), // Group variants
    transformerDirectives({ enforce: 'pre' }), // CSS directives
  ];
}
```

### Content Pipeline

```typescript
{
  content: {
    pipeline: {
      include: [/\.[jt]sx?($|\?)/, /\.vue($|\?)/, /\.css($|\?)/],
      exclude: [/[\\/]node_modules[\\/]/, /\.html($|\?)/]
    }
  }
}
```

## Color System

### Semantic Text Colors

For body text and headings:

```typescript
{
  't-primary': 'var(--text-primary)',    // Primary text
  't-secondary': 'var(--text-secondary)', // Secondary text
  't-tertiary': 'var(--bg-6)',           // Tertiary/hint text
  't-disabled': 'var(--text-disabled)'   // Disabled text
}
```

### Semantic State Colors

For status indicators, buttons, tags:

```typescript
{
  primary: 'var(--primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)'
}
```

### Background Colors

For backgrounds and containers (numeric keys support both `bg-*` and `border-*`):

```typescript
{
  base: 'var(--bg-base)',    // Main background
  1: 'var(--bg-1)',         // Secondary background
  2: 'var(--bg-2)',         // Tertiary background
  3: 'var(--bg-3)',         // Border/separator
  4: 'var(--bg-4)',
  5: 'var(--bg-5)',
  6: 'var(--bg-6)',
  8: 'var(--bg-8)',
  9: 'var(--bg-9)',
  10: 'var(--bg-10)',
  hover: 'var(--bg-hover)',  // Hover background
  active: 'var(--bg-active)' // Active background
}
```

### Border Colors

```typescript
{
  'b-base': 'var(--border-base)',  // Base border
  'b-light': 'var(--border-light)', // Light border
  'b-1': 'var(--bg-3)',           // Based on bg-3
  'b-2': 'var(--bg-4)',           // Based on bg-4
  'b-3': 'var(--bg-5)'            // Based on bg-5
}
```

### Brand Colors

```typescript
{
  brand: 'var(--brand)',
  'brand-light': 'var(--brand-light)',
  'brand-hover': 'var(--brand-hover)'
}
```

### AOU Brand Colors

```typescript
{
  aou: {
    1: 'var(--aou-1)',
    2: 'var(--aou-2)',
    3: 'var(--aou-3)',
    4: 'var(--aou-4)',
    5: 'var(--aou-5)',
    6: 'var(--aou-6)',
    7: 'var(--aou-7)',
    8: 'var(--aou-8)',
    9: 'var(--aou-9)',
    10: 'var(--aou-10)'
  }
}
```

### Component-Specific Colors

```typescript
{
  'message-user': 'var(--message-user-bg)',
  'message-tips': 'var(--message-tips-bg)',
  'workspace-btn': 'var(--workspace-btn-bg)'
}
```

### Special Colors

```typescript
{
  fill: 'var(--fill)',
  inverse: 'var(--inverse)'
}
```

## Custom Rules

### Arco Design Text Colors

```typescript
[/^text-([1-4])$/, ([, d]) => ({ color: `var(--color-text-${d})` })];
// Usage: text-1, text-2, text-3, text-4
```

### Arco Design Fill Colors

```typescript
[/^bg-fill-([1-4])$/, ([, d]) => ({ 'background-color': `var(--color-fill-${d})` })];
// Usage: bg-fill-1, bg-fill-2, bg-fill-3, bg-fill-4
```

### Arco Design Border Colors

```typescript
[/^border-arco-([1-4])$/, ([, d]) => ({ 'border-color': `var(--color-border-${d})` })];
// Usage: border-arco-1, border-arco-2, border-arco-3, border-arco-4
```

### Arco Design Light Variants

```typescript
[
  /^bg-(primary|success|warning|danger|link)-light-([1-4])$/,
  ([, color, d]) => ({ 'background-color': `var(--color-${color}-light-${d})` }),
];
// Usage: bg-primary-light-1, bg-success-light-2, etc.
```

### Arco Design Color Levels

```typescript
[
  /^(bg|text|border)-(primary|success|warning|danger)-([1-9])$/,
  ([, prefix, color, d]) => {
    const prop = prefix === 'bg' ? 'background-color' : prefix === 'text' ? 'color' : 'border-color';
    return { [prop]: `rgb(var(--${color}-${d}))` };
  },
];
// Usage: bg-primary-1, text-success-5, border-danger-3, etc.
```

### Arco Design White/Black

```typescript
[
  'bg-color-white',
  { 'background-color': 'var(--color-white)' },
  'text-color-white',
  { color: 'var(--color-white)' },
  'bg-color-black',
  { 'background-color': 'var(--color-black)' },
  'text-color-black',
  { color: 'var(--color-black)' },
];
```

### Project Custom Colors

```typescript
[
  'bg-dialog-fill-0',
  { 'background-color': 'var(--dialog-fill-0)' },
  'text-0',
  { color: 'var(--text-0)' },
  'text-white',
  { color: 'var(--text-white)' },
  'bg-fill-0',
  { 'background-color': 'var(--fill-0)' },
  'bg-fill-white-to-black',
  { 'background-color': 'var(--fill-white-to-black)' },
  'border-special',
  { 'border-color': 'var(--border-special)' },
];
```

### Animations

```typescript
['animate-wiggle', { animation: 'wiggle 3s ease-in-out infinite' }];
// Usage for attention indicators (e.g., pending permission badge)
```

## Shortcuts

```typescript
{
  'flex-center': 'flex items-center justify-center'
}
```

## Preflights (Global Styles)

```css
* {
  color: inherit; /* Default text color follows theme */
}

@keyframes wiggle {
  0%,
  20%,
  100% {
    transform: rotate(0deg);
  }
  4% {
    transform: rotate(8deg);
  }
  8% {
    transform: rotate(-8deg);
  }
  12% {
    transform: rotate(6deg);
  }
  16% {
    transform: rotate(-4deg);
  }
}
```

## Usage Examples

### Semantic Colors

```tsx
<div className="bg-base text-t-primary">Main content</div>
<div className="bg-1 text-t-secondary">Secondary content</div>
<div className="bg-primary text-white">Primary action</div>
```

### State Colors

```tsx
<div className="text-success">Success message</div>
<div className="bg-warning text-black">Warning</div>
```

### Backgrounds

```tsx
<div className="bg-base">Main background</div>
<div className="bg-1">Card background</div>
<div className="bg-2">Nested background</div>
```

### Borders

```tsx
<div className="border-b-1">Thin border</div>
<div className="border-b-2">Medium border</div>
```

## Related Documentation

- [uno.config.ts](../../uno.config.ts) - UnoCSS configuration
- [src/renderer/styles/](../../src/renderer/styles/) - Styling system
- [docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) - Design system
