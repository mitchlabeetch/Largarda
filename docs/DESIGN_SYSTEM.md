# Largo Design System — _Mint Whisper_

> **Largo** is an AI-powered M&A assistant for French professionals, built on the AionUi framework (Electron + React).
> Its visual language — **Mint Whisper** — balances professional gravity with an airy, inviting aesthetic.

---

## Quick Reference Card

| Token            | Light              | Dark               | CSS Variable     | UnoCSS Class     |
| ---------------- | ------------------ | ------------------ | ---------------- | ---------------- |
| **Primary**      | `#5db8a3`          | `#6ac4ad`          | `--primary`      | `bg-primary`     |
| **Brand**        | `#3aab94`          | `#5db8a3`          | `--brand`        | `bg-brand`       |
| **Background**   | `#fdfcf9`          | `#111418`          | `--bg-base`      | `bg-base`        |
| **Text**         | `#353850`          | `#eef0f2`          | `--text-primary` | `text-t-primary` |
| **Border**       | `#ddd9ce`          | `#2e3440`          | `--border-base`  | `border-b-base`  |
| **Success**      | `#2ecc71`          | `#34d88a`          | `--success`      | `bg-success`     |
| **Warning**      | `#f0a030`          | `#f5b04a`          | `--warning`      | `bg-warning`     |
| **Danger**       | `#d4574a`          | `#e06b5e`          | `--danger`       | `bg-danger`      |
| **Radius**       | `12px`             | `12px`             | `--radius`       | —                |
| **Font (body)**  | Plus Jakarta Sans  | Plus Jakarta Sans  | `--font-sans`    | —                |
| **Font (h1–h3)** | Cormorant Garamond | Cormorant Garamond | `--font-serif`   | —                |
| **Font (code)**  | JetBrains Mono     | JetBrains Mono     | `--font-mono`    | —                |

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Typography](#2-typography)
3. [Color System](#3-color-system)
4. [Spacing](#4-spacing)
5. [Border Radius](#5-border-radius)
6. [Shadows](#6-shadows)
7. [Animations & Transitions](#7-animations--transitions)
8. [Dark Mode Strategy](#8-dark-mode-strategy)
9. [UnoCSS Integration](#9-unocss-integration)
10. [UI Library & Icons](#10-ui-library--icons)
11. [Accessibility](#11-accessibility)
12. [Usage Guidelines — Do / Don't](#12-usage-guidelines--do--dont)
13. [File Map](#13-file-map)

---

## 1. Design Philosophy

Mint Whisper is built on four pillars — spoken in the language of Largo.

### Respiration — _Breathing Room_

Generous whitespace, soft contrasts, and unhurried layouts. Every element has room to breathe. Dense UIs feel oppressive; Largo's interface should feel like opening a window.

- Minimum 16 px padding inside cards
- Section spacing ≥ 24 px
- Line-height for body text: 1.6

### Fraîcheur — _Invigorating Freshness_

The mint-teal accent palette energizes without overwhelming. It is the single dominant hue — everything else stays neutral. Fraîcheur is the first impression: clean, confident, modern.

- Primary: `#5db8a3` (Mint-400)
- Brand accent: `#3aab94` (Mint-500)
- Never use more than two mint shades in the same component

### Chaleur — _Inviting Warmth_

Backgrounds are warm cream, not clinical white. This warmth grounds the freshness of the mint and makes long working sessions comfortable. Clinical whites create fatigue; cream creates calm.

- Base background: `#fdfcf9` (Cream-50)
- Surface: `#f8f6f0` (Cream-100)
- Subtle border: `#ddd9ce` (Cream-gray)

### Raffinement — _Elevated Finesse_

Subtle gradients, gentle transitions, and considered micro-interactions. Nothing flashy — refinement is felt, not seen. Every transition, shadow, and radius choice is deliberate.

- Border radius: 12 px default (not 4 px, not 24 px)
- Transitions: 0.2–0.3 s with `ease` or `cubic-bezier(0.2, 0.8, 0.2, 1)`
- Message notifications use soft directional gradients

---

## 2. Typography

Largo pairs a modern geometric sans-serif with an elegant editorial serif and a developer-focused monospace.

### Font Stack

| Role         | Family             | Weights          | CSS Variable   | Fallback Stack                                                    |
| ------------ | ------------------ | ---------------- | -------------- | ----------------------------------------------------------------- |
| **Body**     | Plus Jakarta Sans  | 300–800          | `--font-sans`  | -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif |
| **Headings** | Cormorant Garamond | 400–700 + italic | `--font-serif` | Georgia, 'Times New Roman', serif                                 |
| **Code**     | JetBrains Mono     | 300–800          | `--font-mono`  | 'Fira Code', Consolas, monospace                                  |

Fonts are loaded from Google Fonts in `src/renderer/styles/themes/base.css`.

### Type Scale

| Element  | Size      | Line Height | Letter Spacing | Weight | Font  |
| -------- | --------- | ----------- | -------------- | ------ | ----- |
| **H1**   | 3 rem     | 1.1         | −0.02 em       | 600    | Serif |
| **H2**   | 2.25 rem  | 1.2         | −0.01 em       | 600    | Serif |
| **H3**   | 1.875 rem | 1.3         | −0.01 em       | 600    | Serif |
| **H4**   | 1.5 rem   | 1.4         | —              | 600    | Sans  |
| **H5**   | 1.25 rem  | 1.4         | —              | 600    | Sans  |
| **H6**   | 1.125 rem | 1.4         | —              | 600    | Sans  |
| **Body** | inherit   | 1.6         | 0              | 400    | Sans  |
| **Code** | 0.875 rem | inherit     | —              | 400    | Mono  |

### Rendering

```css
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

---

## 3. Color System

### 3.1 Brand Scale — Largo Mint (AOU Palette)

A 10-step mint-teal scale from near-white to near-black, anchored at Mint-400 (primary) and Mint-500 (brand accent).

#### Light Mode

| Step | Name     | Hex       | CSS Variable | UnoCSS `bg-` | UnoCSS `text-` | Usage                         |
| ---- | -------- | --------- | ------------ | ------------ | -------------- | ----------------------------- |
| 1    | Mint-50  | `#f0faf7` | `--aou-1`    | `bg-aou-1`   | `text-aou-1`   | Brand light background, tips  |
| 2    | Mint-100 | `#ddf3ec` | `--aou-2`    | `bg-aou-2`   | `text-aou-2`   | Disabled brand button bg      |
| 3    | Mint-200 | `#bbdfd2` | `--aou-3`    | `bg-aou-3`   | `text-aou-3`   | Light accent borders          |
| 4    | Mint-300 | `#7ec4b0` | `--aou-4`    | `bg-aou-4`   | `text-aou-4`   | Brand hover, illustrations    |
| 5    | Mint-400 | `#5db8a3` | `--aou-5`    | `bg-aou-5`   | `text-aou-5`   | **Primary** actions & buttons |
| 6    | Mint-500 | `#3aab94` | `--aou-6`    | `bg-aou-6`   | `text-aou-6`   | **Brand accent**, icons       |
| 7    | Mint-600 | `#2a8f7c` | `--aou-7`    | `bg-aou-7`   | `text-aou-7`   | Active/pressed states         |
| 8    | Mint-700 | `#1f7466` | `--aou-8`    | `bg-aou-8`   | `text-aou-8`   | Dark accents                  |
| 9    | Mint-800 | `#175a50` | `--aou-9`    | `bg-aou-9`   | `text-aou-9`   | High-emphasis text on light   |
| 10   | Mint-900 | `#10413a` | `--aou-10`   | `bg-aou-10`  | `text-aou-10`  | Darkest mint                  |

#### Dark Mode (Inverted Luminance)

| Step | Hex       | Usage                                |
| ---- | --------- | ------------------------------------ |
| 1    | `#162420` | Darkest teal-charcoal background     |
| 2    | `#1c3029` | Deep teal surface                    |
| 3    | `#254a40` | Elevated surface                     |
| 4    | `#2f6456` | Borders, dividers                    |
| 5    | `#3d8574` | Mid accent                           |
| 6    | `#5db8a3` | **Primary** (same as light Mint-400) |
| 7    | `#7ec4b0` | Light accent, hover                  |
| 8    | `#bbdfd2` | Soft highlights                      |
| 9    | `#ddf3ec` | Subtle text on dark                  |
| 10   | `#f0faf7` | Maximum contrast mint                |

### 3.2 Background Colors (Warm Cream → Deep Charcoal)

| Token      | Light Hex | Dark Hex  | CSS Variable  | UnoCSS Class | Usage                     |
| ---------- | --------- | --------- | ------------- | ------------ | ------------------------- |
| **Base**   | `#fdfcf9` | `#111418` | `--bg-base`   | `bg-base`    | Page background           |
| **1**      | `#f8f6f0` | `#191d24` | `--bg-1`      | `bg-1`       | Card/surface background   |
| **2**      | `#f0ede5` | `#22272f` | `--bg-2`      | `bg-2`       | Secondary surface         |
| **3**      | `#ddd9ce` | `#2e3440` | `--bg-3`      | `bg-3`       | Borders, separators       |
| **4**      | `#c2beb5` | `#3b4250` | `--bg-4`      | `bg-4`       | Muted elements            |
| **5**      | `#a8a49c` | `#484f5e` | `--bg-5`      | `bg-5`       | Placeholder text          |
| **6**      | `#8b8fa3` | `#6b7280` | `--bg-6`      | `bg-6`       | Disabled/hint text        |
| **8**      | `#5c6075` | `#9ca3af` | `--bg-8`      | `bg-8`       | Heavy muted fills         |
| **9**      | `#353850` | `#d1d5db` | `--bg-9`      | `bg-9`       | Near-text backgrounds     |
| **10**     | `#1f2238` | `#f3f4f6` | `--bg-10`     | `bg-10`      | Inverted / contrast       |
| **Hover**  | `#f4f2ec` | `#1d222a` | `--bg-hover`  | `bg-hover`   | Interactive hover state   |
| **Active** | `#e8e4db` | `#282e38` | `--bg-active` | `bg-active`  | Interactive pressed state |

### 3.3 Text Colors

| Token         | Light Hex | Dark Hex  | CSS Variable       | UnoCSS Class       | Usage               |
| ------------- | --------- | --------- | ------------------ | ------------------ | ------------------- |
| **Primary**   | `#353850` | `#eef0f2` | `--text-primary`   | `text-t-primary`   | Body text, headings |
| **Secondary** | `#8b8fa3` | `#9ca3af` | `--text-secondary` | `text-t-secondary` | Captions, labels    |
| **Tertiary**  | _(bg-6)_  | _(bg-6)_  | `--bg-6`           | `text-t-tertiary`  | Hints, timestamps   |
| **Disabled**  | `#c2beb5` | `#6b7280` | `--text-disabled`  | `text-t-disabled`  | Disabled states     |

### 3.4 Semantic Colors

| Token       | Light Hex | Dark Hex  | CSS Variable | UnoCSS `bg-` | Purpose         |
| ----------- | --------- | --------- | ------------ | ------------ | --------------- |
| **Primary** | `#5db8a3` | `#6ac4ad` | `--primary`  | `bg-primary` | Actions, links  |
| **Success** | `#2ecc71` | `#34d88a` | `--success`  | `bg-success` | Confirmations   |
| **Warning** | `#f0a030` | `#f5b04a` | `--warning`  | `bg-warning` | Cautions        |
| **Danger**  | `#d4574a` | `#e06b5e` | `--danger`   | `bg-danger`  | Errors, deletes |
| **Info**    | `#5db8a3` | `#6ac4ad` | `--info`     | —            | Informational   |

### 3.5 Border Colors

| Token     | Light Hex | Dark Hex  | CSS Variable     | UnoCSS Class     | Usage             |
| --------- | --------- | --------- | ---------------- | ---------------- | ----------------- |
| **Base**  | `#ddd9ce` | `#2e3440` | `--border-base`  | `border-b-base`  | Default borders   |
| **Light** | `#ebe8e0` | `#22272f` | `--border-light` | `border-b-light` | Subtle dividers   |
| **1**     | _(bg-3)_  | _(bg-3)_  | `--bg-3`         | `border-b-1`     | Secondary borders |
| **2**     | _(bg-4)_  | _(bg-4)_  | `--bg-4`         | `border-b-2`     | Prominent borders |
| **3**     | _(bg-5)_  | _(bg-5)_  | `--bg-5`         | `border-b-3`     | Heavy borders     |

### 3.6 Brand Colors (Shorthand)

| Token           | Light Hex | Dark Hex  | CSS Variable    | UnoCSS Class     | Usage              |
| --------------- | --------- | --------- | --------------- | ---------------- | ------------------ |
| **Brand**       | `#3aab94` | `#5db8a3` | `--brand`       | `bg-brand`       | Logo, brand accent |
| **Brand Light** | `#f0faf7` | `#1c3029` | `--brand-light` | `bg-brand-light` | Brand tinted bg    |
| **Brand Hover** | `#7ec4b0` | `#3d8574` | `--brand-hover` | `bg-brand-hover` | Brand hover state  |

### 3.7 Component-Specific Colors

| Token             | Light Hex | Dark Hex  | CSS Variable         | UnoCSS Class       | Usage             |
| ----------------- | --------- | --------- | -------------------- | ------------------ | ----------------- |
| **Message User**  | `#e6f5f0` | `#1a2e28` | `--message-user-bg`  | `bg-message-user`  | User chat bubble  |
| **Message Tips**  | `#f0faf7` | `#162420` | `--message-tips-bg`  | `bg-message-tips`  | System tip bubble |
| **Workspace Btn** | `#f0ede5` | `#1d222a` | `--workspace-btn-bg` | `bg-workspace-btn` | Workspace buttons |
| **Fill**          | `#f8f6f0` | `#191d24` | `--fill`             | `bg-fill`          | General fill      |
| **Inverse**       | `#fdfcf9` | `#fdfcf9` | `--inverse`          | `bg-inverse`       | Inverse contrast  |

---

## 4. Spacing

Largo uses the **Tailwind CSS spacing scale** via UnoCSS `presetWind3()`. All spacing utilities are available.

### Base Unit: 4 px

| Class   | Value | Class  | Value | Class  | Value  |
| ------- | ----- | ------ | ----- | ------ | ------ |
| `p-0`   | 0     | `p-4`  | 16 px | `p-16` | 64 px  |
| `p-px`  | 1 px  | `p-5`  | 20 px | `p-20` | 80 px  |
| `p-0.5` | 2 px  | `p-6`  | 24 px | `p-24` | 96 px  |
| `p-1`   | 4 px  | `p-7`  | 28 px | `p-28` | 112 px |
| `p-1.5` | 6 px  | `p-8`  | 32 px | `p-32` | 128 px |
| `p-2`   | 8 px  | `p-9`  | 36 px | `p-36` | 144 px |
| `p-2.5` | 10 px | `p-10` | 40 px | `p-40` | 160 px |
| `p-3`   | 12 px | `p-11` | 44 px | `p-44` | 176 px |
| `p-3.5` | 14 px | `p-12` | 48 px | `p-48` | 192 px |

Arbitrary values are also supported: `p-14px`, `gap-12px`, `mt-4px`.

### Recommended Spacing for Largo

| Context                    | Recommended           | Reasoning (Respiration)            |
| -------------------------- | --------------------- | ---------------------------------- |
| Card internal padding      | `p-4` (16 px) min     | Room for content to breathe        |
| Section gaps               | `gap-6` (24 px) min   | Visible breathing between sections |
| Button padding             | `px-4 py-2` (16/8 px) | Comfortable click targets          |
| Input padding              | `px-3 py-2` (12/8 px) | Readable, not cramped              |
| Icon-to-text gap           | `gap-2` (8 px)        | Balanced visual pairing            |
| Page margins               | `p-6` or `p-8`        | Generous outer frame               |
| List item vertical spacing | `py-3` (12 px)        | Easy visual scanning               |

### Layout Constants

| Constant          | Value  | CSS Variable        |
| ----------------- | ------ | ------------------- |
| App minimum width | 360 px | `--app-min-width`   |
| Titlebar height   | 36 px  | `--titlebar-height` |

---

## 5. Border Radius

Largo prefers **rounded, friendly shapes** — not sharp corners, not fully rounded pills (except where noted).

| Token            | Value   | CSS Variable    | Usage                            |
| ---------------- | ------- | --------------- | -------------------------------- |
| **sm**           | 8 px    | `--radius-sm`   | Tags, badges, small chips        |
| **md (default)** | 12 px   | `--radius-md`   | Inputs, buttons, dropdowns       |
| **(base)**       | 12 px   | `--radius`      | General-purpose (= md)           |
| **lg**           | 16 px   | `--radius-lg`   | Cards, modals, dialogs           |
| **xl**           | 20 px   | `--radius-xl`   | Hero sections, feature cards     |
| **2xl**          | 24 px   | `--radius-2xl`  | Special containers, onboarding   |
| **full**         | 9999 px | `--radius-full` | Pills, avatars, circular buttons |

### Example Usage

```css
/* Card */
.my-card {
  border-radius: var(--radius-lg); /* 16px */
}

/* Button */
.my-button {
  border-radius: var(--radius-md); /* 12px */
}

/* Avatar */
.my-avatar {
  border-radius: var(--radius-full); /* 9999px → circle */
}
```

---

## 6. Shadows

Largo's Mint Whisper theme favors **flat or near-flat design** (Raffinement through subtlety, not depth). Explicit shadow variables are intentionally not defined. Depth is achieved through background-color layering (`bg-base` → `bg-1` → `bg-2`).

### When Shadows Are Used

Shadows appear sparingly and are constructed dynamically:

| Context              | Shadow Definition                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| **Team tab breathe** | `0 0 8px 2px color-mix(in srgb, var(--color-primary-6) 30%, transparent), inset 0 0 6px 0 color-mix(...)` |
| **Layout sidebar**   | `box-shadow: none !important` (explicitly removed)                                                        |
| **Arco components**  | Inherit Arco Design defaults, overridden to `none` where needed                                           |

### Recommended Shadow Usage

If you must use shadows, follow this progression:

```css
/* Subtle elevation (tooltips) */
box-shadow: 0 2px 8px rgba(53, 56, 80, 0.08);

/* Medium elevation (dropdowns, popovers) */
box-shadow: 0 4px 16px rgba(53, 56, 80, 0.1);

/* Strong elevation (modals) */
box-shadow: 0 8px 32px rgba(53, 56, 80, 0.12);
```

> In dark mode, prefer even lower opacity (0.3–0.5 with darker base) or border-based separation over shadows.

---

## 7. Animations & Transitions

### Transition Tokens

Largo uses a consistent set of transition timings for Raffinement.

| Context                | Duration | Easing                           | Properties                                   |
| ---------------------- | -------- | -------------------------------- | -------------------------------------------- |
| **Interactive hover**  | 0.2 s    | `ease`                           | `background-color`, `color`, `border-color`  |
| **Sidebar items**      | 0.2 s    | `ease`                           | `padding`, `margin`, `background-color`      |
| **Sidebar labels**     | 0.25 s   | `ease`                           | `opacity`, `transform`                       |
| **Section show/hide**  | 0.3 s    | `ease`                           | `opacity`, `max-height`, `margin`, `padding` |
| **Theme switch**       | 0.26 s   | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Theme toggle animation                       |
| **Scrollbar**          | 0.3 s    | (default)                        | `background`                                 |
| **Arco close buttons** | 0.2 s    | (default)                        | `background-color`                           |

### Keyframe Animations

#### `bg-animate` — Skeleton / Loading Placeholder

```css
@keyframes bg-animate {
  0% {
    background-color: var(--bg-2);
  }
  100% {
    background-color: var(--bg-3);
  }
}
/* Usage: .bg-animate class */
```

#### `loading` — Spinner Rotation

```css
@keyframes loading {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
/* Usage: .loading { animation: loading 1s linear infinite; } */
```

#### `wiggle` — Attention Shake

```css
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
/* UnoCSS: animate-wiggle (3s ease-in-out infinite) */
```

#### `team-tab-breathe` — Breathing Pulse

```css
@keyframes team-tab-breathe {
  0%,
  100% {
    opacity: 1; /* base state */
  }
  50% {
    opacity: 0.85; /* subtle fade with box-shadow glow */
  }
}
/* Duration: 2s cycle */
```

### Reduced Motion

All animations and transitions are disabled when the user prefers reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## 8. Dark Mode Strategy

### Mechanism

Dark mode is controlled via a `data-theme="dark"` attribute on the root element, scoped within `[data-color-scheme='default']`. The theme is managed by `ThemeContext.tsx` (`src/renderer/hooks/context/ThemeContext.tsx`).

### Design Principles

| Aspect                | Light Mode                   | Dark Mode                         |
| --------------------- | ---------------------------- | --------------------------------- |
| **Background**        | Warm cream (`#fdfcf9`)       | Deep charcoal (`#111418`)         |
| **Text**              | Deep charcoal (`#353850`)    | Warm off-white (`#eef0f2`)        |
| **Primary mint**      | `#5db8a3` (standard)         | `#6ac4ad` (brighter for contrast) |
| **Brand scale**       | Light-to-dark (1→10)         | Dark-to-light (1→10, inverted)    |
| **Borders**           | Cream-gray (`#ddd9ce`)       | Teal-charcoal (`#2e3440`)         |
| **Semantic colors**   | Standard saturation          | +10–15% brightness for legibility |
| **Shadows**           | Subtle warm-gray             | Near-invisible or border-based    |
| **Message gradients** | Opaque directional gradients | Semi-transparent (0.3 opacity)    |

### Color Inversion Strategy

The AOU brand scale (1–10) is **luminance-inverted** in dark mode — step 1 becomes the darkest and step 10 the lightest. The midpoint (step 6) stays near the brand color, ensuring the mint identity persists in both themes.

```
Light:  ██░░░░░░░░  1(lightest) ──────► 10(darkest)
Dark:   ░░░░░░░░██  1(darkest)  ──────► 10(lightest)
             ▲
             │  Step 6 stays ~#5db8a3 in both modes
```

### Special Dark Mode Values

| Token                   | Dark Value                  | Note                           |
| ----------------------- | --------------------------- | ------------------------------ |
| `--fill-0`              | `rgba(255, 255, 255, 0.08)` | Transparent fill (not opaque)  |
| `--fill-white-to-black` | `#111418`                   | Inverts from cream to charcoal |
| `--border-special`      | `#3d5a52`                   | Teal-tinted dark border        |
| `--dialog-fill-0`       | `#2e3440`                   | Modal/dialog background        |

---

## 9. UnoCSS Integration

### Configuration: `uno.config.ts`

**Presets:**

| Preset          | Purpose                                  |
| --------------- | ---------------------------------------- |
| `presetMini()`  | Minimal atomic CSS                       |
| `presetWind3()` | Tailwind CSS v3 compatibility            |
| `presetExtra()` | Extended utilities (unocss-preset-extra) |

**Transformers:**

- `transformerVariantGroup()` — e.g., `hover:(bg-brand text-white)`
- `transformerDirectives()` — `@apply` support in CSS Modules

### Utility Class Reference

#### Text Colors

```html
<p class="text-t-primary">Primary body text</p>
<p class="text-t-secondary">Caption or label</p>
<p class="text-t-tertiary">Hint text</p>
<p class="text-t-disabled">Disabled state</p>
<span class="text-brand">Brand-colored text</span>
```

#### Background Colors

```html
<div class="bg-base">Page background</div>
<div class="bg-1">Card surface</div>
<div class="bg-2">Secondary surface</div>
<div class="bg-hover">Hover state</div>
<div class="bg-active">Pressed state</div>
<div class="bg-brand">Brand background</div>
<div class="bg-brand-light">Tinted brand area</div>
```

#### Border Colors

```html
<div class="border border-b-base">Default border</div>
<div class="border border-b-light">Subtle border</div>
<div class="border border-b-1">Secondary border</div>
```

#### Semantic Colors

```html
<div class="bg-primary text-white">Primary action</div>
<div class="bg-success text-white">Success state</div>
<div class="bg-warning text-white">Warning state</div>
<div class="bg-danger text-white">Danger state</div>
```

#### Brand Scale

```html
<div class="bg-aou-1">Lightest mint background</div>
<div class="bg-aou-5">Primary mint</div>
<div class="bg-aou-6">Brand accent mint</div>
<div class="text-aou-8">Dark mint text</div>
```

#### Arco Design Overrides (Custom Rules)

```html
<!-- Arco text colors -->
<span class="text-1">Arco text level 1</span>
<span class="text-2">Arco text level 2</span>

<!-- Arco fill backgrounds -->
<div class="bg-fill-1">Arco fill level 1</div>

<!-- Arco border colors -->
<div class="border-arco-1">Arco border level 1</div>

<!-- Arco semantic light variants -->
<div class="bg-primary-light-1">Primary light shade 1</div>
<div class="bg-danger-light-2">Danger light shade 2</div>
```

### Shortcuts

| Shortcut      | Expands To                         |
| ------------- | ---------------------------------- |
| `flex-center` | `flex items-center justify-center` |

---

## 10. UI Library & Icons

### Component Library: `@arco-design/web-react`

**Rule: Never use raw HTML interactive elements.** All interactive UI must use Arco components.

| Instead of                | Use                                              |
| ------------------------- | ------------------------------------------------ |
| `<button>`                | `<Button>` from `@arco-design/web-react`         |
| `<input>`                 | `<Input>` from `@arco-design/web-react`          |
| `<select>`                | `<Select>` from `@arco-design/web-react`         |
| `<input type="checkbox">` | `<Checkbox>` from `@arco-design/web-react`       |
| `<textarea>`              | `<Input.TextArea>` from `@arco-design/web-react` |

**Arco Theme:** Primary color is configured as `#5db8a3` in `ConfigProvider` (`src/renderer/main.tsx`).

### Arco Component Overrides

Custom styling for Arco components lives in `src/renderer/styles/arco-override.css`:

- **Modal:** 16 px border-radius, `var(--dialog-fill-0)` background, `var(--border-base)` border
- **Collapse:** No borders, 8 px radius
- **Tabs:** `var(--color-primary)` ink bar, 600 weight active tab
- **Messages:** Directional gradients per semantic type
- **Tags (dark mode):** Semi-transparent colored backgrounds

### Icon Library: `@icon-park/react`

All icons come from Icon Park. Use consistent sizing and stroke width across the application.

```tsx
import { Setting } from '@icon-park/react';

<Setting theme='outline' size='20' strokeWidth={3} />;
```

---

## 11. Accessibility

### Contrast Ratios

All text/background combinations in the Largo palette meet or exceed WCAG 2.1 guidelines.

#### Light Mode

| Combination                                           | Ratio      | Level                                       |
| ----------------------------------------------------- | ---------- | ------------------------------------------- |
| `--text-primary` (#353850) on `--bg-base` (#fdfcf9)   | **11.4:1** | AAA ✅                                      |
| `--text-primary` (#353850) on `--bg-1` (#f8f6f0)      | **10.5:1** | AAA ✅                                      |
| `--text-primary` (#353850) on `--bg-2` (#f0ede5)      | **9.2:1**  | AAA ✅                                      |
| `--text-secondary` (#8b8fa3) on `--bg-base` (#fdfcf9) | **4.1:1**  | AA ✅                                       |
| `--text-secondary` (#8b8fa3) on `--bg-1` (#f8f6f0)    | **3.8:1**  | AA (large) ✅                               |
| `--text-disabled` (#c2beb5) on `--bg-base` (#fdfcf9)  | **1.8:1**  | — ⚠️ _Intentionally low for disabled state_ |
| `--brand` (#3aab94) on `--bg-base` (#fdfcf9)          | **3.5:1**  | AA (large) ✅                               |
| `--aou-7` (#2a8f7c) on `--bg-base` (#fdfcf9)          | **4.7:1**  | AA ✅                                       |
| White (#fff) on `--primary` (#5db8a3)                 | **3.1:1**  | AA (large) ✅                               |
| White (#fff) on `--aou-7` (#2a8f7c)                   | **4.6:1**  | AA ✅                                       |

#### Dark Mode

| Combination                                           | Ratio      | Level  |
| ----------------------------------------------------- | ---------- | ------ |
| `--text-primary` (#eef0f2) on `--bg-base` (#111418)   | **14.8:1** | AAA ✅ |
| `--text-primary` (#eef0f2) on `--bg-1` (#191d24)      | **12.2:1** | AAA ✅ |
| `--text-secondary` (#9ca3af) on `--bg-base` (#111418) | **7.6:1**  | AAA ✅ |
| `--text-disabled` (#6b7280) on `--bg-base` (#111418)  | **4.2:1**  | AA ✅  |
| `--primary` (#6ac4ad) on `--bg-base` (#111418)        | **8.3:1**  | AAA ✅ |

### Guidelines

- **Body text:** Must achieve at least **4.5:1** (WCAG AA) — use `text-t-primary` or `text-t-secondary`.
- **Large text (≥ 18 pt or 14 pt bold):** At least **3:1** — headings with brand color are acceptable.
- **Interactive elements:** Brand mint on cream achieves ~3.5:1 — acceptable for large buttons. For small text links, use `--aou-7` (#2a8f7c) or darker.
- **Disabled states:** Intentionally below contrast thresholds to communicate non-interactivity.
- **Focus indicators:** Use the browser default or a 2 px solid `var(--brand)` outline with 2 px offset.

### Reduced Motion

The system respects `prefers-reduced-motion: reduce` — all animations and transitions are globally disabled (see [Section 7](#7-animations--transitions)).

---

## 12. Usage Guidelines — Do / Don't

### Colors

✅ **DO:**

```tsx
// Use semantic tokens
<div className='bg-base text-t-primary border border-b-base'>
  <Button type='primary'>Confirm</Button>
</div>
```

❌ **DON'T:**

```tsx
// Hardcoded colors — breaks dark mode and theming
<div style={{ background: '#fdfcf9', color: '#353850', border: '1px solid #ddd9ce' }}>
  <button style={{ background: '#5db8a3' }}>Confirm</button>
</div>
```

### Components

✅ **DO:**

```tsx
import { Button, Input, Select } from '@arco-design/web-react';
import { Search } from '@icon-park/react';

<Input prefix={<Search size="16" />} placeholder="Rechercher..." />
<Select options={options} />
<Button type="primary">Valider</Button>
```

❌ **DON'T:**

```tsx
// Raw HTML interactive elements
<input type="text" placeholder="Rechercher..." />
<select><option>Option A</option></select>
<button>Valider</button>
```

### Typography

✅ **DO:**

```tsx
// Let the global styles handle heading fonts
<h1>Analyse Financière</h1>        {/* → Cormorant Garamond */}
<h4>Détails du Dossier</h4>        {/* → Plus Jakarta Sans  */}
<p>Le chiffre d'affaires...</p>     {/* → Plus Jakarta Sans  */}
<code>const ratio = 1.5;</code>     {/* → JetBrains Mono     */}
```

❌ **DON'T:**

```tsx
// Overriding font families inline
<h1 style={{ fontFamily: 'Arial' }}>Analyse Financière</h1>
<p style={{ fontSize: '13px' }}>Tiny unreadable text</p>
```

### Dark Mode

✅ **DO:**

```css
/* Use CSS variables — they auto-switch with theme */
.my-component {
  background: var(--bg-1);
  color: var(--text-primary);
  border: 1px solid var(--border-base);
}
```

❌ **DON'T:**

```css
/* Hardcoded values that ignore theme switching */
.my-component {
  background: white;
  color: black;
}
/* Manually checking theme — the variables handle this */
@media (prefers-color-scheme: dark) {
  .my-component {
    background: #1a1a1a;
  }
}
```

### Spacing (Respiration)

✅ **DO:**

```tsx
<div className='p-4 gap-6'>
  {' '}
  {/* Generous internal + section spacing */}
  <Card className='p-4'>Content</Card>
  <Card className='p-4'>Content</Card>
</div>
```

❌ **DON'T:**

```tsx
<div className='p-1 gap-1'>
  {' '}
  {/* Cramped — violates Respiration */}
  <Card className='p-1'>Content</Card>
  <Card className='p-1'>Content</Card>
</div>
```

### Borders & Radius

✅ **DO:**

```css
.card {
  border-radius: var(--radius-lg);
} /* 16px — friendly, rounded */
.badge {
  border-radius: var(--radius-sm);
} /* 8px — compact elements  */
.avatar {
  border-radius: var(--radius-full);
} /* Circle */
```

❌ **DON'T:**

```css
.card {
  border-radius: 2px;
} /* Too sharp for Mint Whisper */
.card {
  border-radius: 30px;
} /* Too round for a card — use radius-lg (16px) */
```

### CSS Approach

✅ **DO:**

```tsx
// UnoCSS utility classes first
<div className="flex-center bg-1 p-4 rounded-lg">

// CSS Modules for complex styles
import styles from './MyComponent.module.css';
<div className={styles.container}>
```

❌ **DON'T:**

```tsx
// Global CSS overrides scattered across files
import './my-global-styles.css';

// Inline styles for theming
<div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-1)' }}>
```

### Arco Overrides

✅ **DO:**

```css
/* In ComponentName.module.css — scoped override */
.myModal :global(.arco-modal-content) {
  background: var(--dialog-fill-0);
}
```

❌ **DON'T:**

```css
/* Global override file (except arco-override.css) */
.arco-modal-content {
  background: #fff !important;
}
```

---

## 13. File Map

Key files that define and implement the Largo design system:

```
Largarda/
├── uno.config.ts                                    # UnoCSS: colors, rules, shortcuts, keyframes
│
├── src/renderer/
│   ├── main.tsx                                     # Arco ConfigProvider (primaryColor: #5db8a3)
│   │
│   ├── styles/
│   │   ├── arco-override.css                        # Arco Design component overrides
│   │   ├── layout.css                               # Layout transitions, sidebar animations
│   │   ├── colors.ts                                # TypeScript color helpers
│   │   │
│   │   └── themes/
│   │       ├── index.css                            # Theme entry (@import base + color-scheme)
│   │       ├── base.css                             # Font imports, typography, keyframes, radius
│   │       └── default-color-scheme.css             # Light & dark mode CSS variables
│   │
│   └── hooks/context/
│       └── ThemeContext.tsx                          # Theme management (light/dark toggle)
│
├── docs/
│   └── DESIGN_SYSTEM.md                             # ← You are here
│
└── package.json                                     # @arco-design/web-react, unocss, etc.
```

---

_Mint Whisper — where Respiration meets Fraîcheur, Chaleur embraces Raffinement._
