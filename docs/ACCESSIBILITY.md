# Accessibility (a11y) Policy & Guidelines

Largo targets **WCAG 2.1 Level AA** compliance across the Electron desktop app and web viewer.

---

## Table of Contents

1. [Compliance Goals](#compliance-goals)
2. [Keyboard Navigation](#keyboard-navigation)
3. [Screen Reader Support](#screen-reader-support)
4. [Color Contrast](#color-contrast)
5. [Focus Indicators](#focus-indicators)
6. [ARIA Pattern Library](#aria-pattern-library)
7. [Reduced Motion & High Contrast](#reduced-motion--high-contrast)
8. [Testing Procedures](#testing-procedures)
9. [Known Limitations & Roadmap](#known-limitations--roadmap)

---

## Compliance Goals

| Criterion          | Target                     | Status         |
| ------------------ | -------------------------- | -------------- |
| WCAG 2.1 Level A   | Full compliance            | 🔄 In progress |
| WCAG 2.1 Level AA  | Full compliance            | 🔄 In progress |
| WCAG 2.1 Level AAA | Best-effort (not required) | ⏳ Planned     |
| Section 508        | Informational              | —              |

### Core Principles (POUR)

- **Perceivable** — Content is available to all senses (sight, hearing, touch).
- **Operable** — All functionality is reachable via keyboard and assistive technology.
- **Understandable** — UI behavior is predictable; language is clear.
- **Robust** — Content works across assistive technologies and browsers.

---

## Keyboard Navigation

### Requirements

1. **All interactive elements** must be reachable via `Tab` / `Shift+Tab`.
2. **Logical tab order** — follows visual reading flow (left-to-right, top-to-bottom).
3. **No keyboard traps** — users must be able to leave any component with standard keys.
4. **Skip navigation** — a visually hidden "Skip to main content" link must be the first focusable element. Use the `.skip-link` CSS class from `base.css`.
5. **Arrow key navigation** within composite widgets (menus, tabs, tree views).
6. **Escape** closes modals, popovers, and dropdowns.

### Shortcuts

| Action              | Key(s)                 |
| ------------------- | ---------------------- |
| Focus main content  | `Skip link → Enter`    |
| Close modal/overlay | `Escape`               |
| Navigate sidebar    | `Arrow Up / Down`      |
| Submit message      | `Enter` (configurable) |

---

## Screen Reader Support

### Guidelines

- Every `<img>` must have `alt` text (or `alt=""` if purely decorative).
- Icon-only buttons must have `aria-label` or visually hidden text.
- Form inputs must have associated `<label>` elements or `aria-label`.
- Dynamic content changes must use `aria-live` regions.
- Use the `.sr-only` CSS class (defined in `base.css`) for visually hidden but screen-reader-accessible text.

### Live Region Strategy

| Content Type        | `aria-live` | `aria-atomic` | Notes                          |
| ------------------- | ----------- | ------------- | ------------------------------ |
| New chat messages   | `polite`    | `false`       | Don't interrupt current speech |
| Error alerts        | `assertive` | `true`        | Immediate notification         |
| Status updates      | `polite`    | `true`        | e.g., "Connecting…", "Ready"   |
| Toast notifications | `polite`    | `true`        | Auto-dismiss after timeout     |

---

## Color Contrast

### Mint Whisper Theme Tokens

Largo's "Mint Whisper" design system uses mint-teal colors on cream backgrounds. All token pairings must meet WCAG AA contrast ratios:

| Usage                             | Minimum Ratio | Standard |
| --------------------------------- | ------------- | -------- |
| Normal text (< 18pt)              | 4.5:1         | AA       |
| Large text (≥ 18pt / 14pt bold)   | 3:1           | AA       |
| UI components & graphical objects | 3:1           | AA       |
| Focus indicators                  | 3:1           | AA       |

### Token Pairings to Verify

- `--color-text-1` on `--color-bg-1` — primary text on primary background
- `--color-text-2` on `--color-bg-1` — secondary text on primary background
- `--color-text-3` on `--color-bg-2` — tertiary text on secondary background
- `--color-primary-6` on `--color-bg-1` — primary accent on background
- `--color-primary-6` on white — links and interactive elements
- Placeholder text on input backgrounds

### Dark Mode

All contrast requirements apply equally to the dark theme (`[data-theme='dark']`). Verify both themes independently.

---

## Focus Indicators

### Standards

- **Visible focus ring** on all interactive elements when navigated via keyboard.
- Focus indicator must have **≥ 3:1 contrast** against adjacent colors.
- Use `:focus-visible` (not `:focus`) to show focus rings only for keyboard users.
- The base focus style is defined in `base.css` using `--color-primary-6` with a 2px offset ring.

### Implementation

```css
/* Already in base.css — do not duplicate */
:focus-visible {
  outline: 2px solid var(--color-primary-6);
  outline-offset: 2px;
}
```

Arco Design components inherit this style. Custom components must not suppress it without providing an equivalent indicator.

---

## ARIA Pattern Library

### Chat Message List

The main chat area is a live log of messages.

```html
<div role="log" aria-label="Chat messages" aria-live="polite" aria-relevant="additions">
  <div role="article" aria-label="Message from Alice, 2:30 PM">
    <!-- message content -->
  </div>
</div>
```

| Attribute       | Value             | Purpose                                     |
| --------------- | ----------------- | ------------------------------------------- |
| `role`          | `log`             | Identifies as a sequential log              |
| `aria-live`     | `polite`          | Announces new messages without interrupting |
| `aria-relevant` | `additions`       | Only announce new messages, not removals    |
| `aria-label`    | `"Chat messages"` | Names the region                            |

### Sidebar Navigation

```html
<nav role="navigation" aria-label="Main navigation">
  <ul role="list">
    <li><a href="#" aria-current="page">Conversations</a></li>
    <li><a href="#">Settings</a></li>
  </ul>
</nav>
```

- Use `aria-current="page"` on the active item.
- Collapsible sections use `aria-expanded`.

### Modal Dialogs

```html
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
  <h2 id="dialog-title">Confirm Action</h2>
  <p id="dialog-desc">Are you sure you want to proceed?</p>
  <!-- Focus trapped inside; Escape closes -->
</div>
```

- Focus must move to the dialog on open.
- Focus must be trapped inside the dialog.
- `Escape` must close the dialog.
- Focus returns to the triggering element on close.

### Settings Forms

```html
<form role="form" aria-label="Application settings">
  <fieldset>
    <legend>Appearance</legend>
    <label for="theme-select">Theme</label>
    <select id="theme-select">
      ...
    </select>
  </fieldset>
</form>
```

- Group related fields with `<fieldset>` and `<legend>`.
- Every input has an explicit `<label>` or `aria-label`.
- Validation errors use `aria-describedby` linked to error messages.
- Required fields use `aria-required="true"`.

### Status Messages

```html
<div role="status" aria-live="polite" aria-atomic="true">Connecting to server…</div>
```

- Announced by screen readers without interrupting.
- Used for connection status, typing indicators, sync state.

### Alert Messages

```html
<div role="alert" aria-live="assertive" aria-atomic="true">Error: Failed to send message. Please try again.</div>
```

- **Immediately** announced by screen readers.
- Used for errors, warnings, and urgent notifications.
- Avoid overuse — only for genuinely important messages.

---

## Reduced Motion & High Contrast

### Reduced Motion

Users who prefer reduced motion (via OS settings) must not see animations. The `base.css` file includes:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### High Contrast / Forced Colors

Windows High Contrast mode is supported via:

```css
@media (forced-colors: active) {
  /* Borders and outlines use system colors */
}
```

See `base.css` for the full implementation.

---

## Testing Procedures

### Automated Testing

| Tool                             | Purpose                          | When to Run    |
| -------------------------------- | -------------------------------- | -------------- |
| axe-core / @axe-core/react       | Runtime a11y violation detection | Development    |
| eslint-plugin-jsx-a11y           | Static analysis of JSX           | `bun run lint` |
| Lighthouse (Accessibility audit) | Scoring and recommendations      | Before release |

### Manual Testing Checklist

Run through these checks before each release:

- [ ] **Keyboard-only navigation** — complete all primary flows without a mouse.
- [ ] **Screen reader** — test with VoiceOver (macOS) or NVDA (Windows).
- [ ] **Zoom** — content is usable at 200% zoom.
- [ ] **Color contrast** — verify with browser DevTools or a contrast checker.
- [ ] **Reduced motion** — enable "Reduce motion" in OS settings; verify no animations.
- [ ] **High contrast** — test on Windows High Contrast mode.
- [ ] **Focus order** — tab through the entire page; order is logical.
- [ ] **Focus visibility** — focus ring is visible on every interactive element.
- [ ] **Error identification** — form errors are announced and visually indicated.
- [ ] **Skip navigation** — "Skip to main content" link works.

### Screen Reader Test Matrix

| Platform | Screen Reader | Browser/Runtime    |
| -------- | ------------- | ------------------ |
| macOS    | VoiceOver     | Electron / Safari  |
| Windows  | NVDA          | Electron / Chrome  |
| Windows  | JAWS          | Chrome             |
| Linux    | Orca          | Electron / Firefox |

---

## Known Limitations & Roadmap

### Current Limitations

1. **Chat message virtualization** — Virtualized lists may not expose all messages to the accessibility tree. Investigating alternatives.
2. **Drag-and-drop** — File upload via drag-and-drop lacks keyboard alternative. Workaround: use the file picker button.
3. **Canvas/WebGL rendering** — If any canvas-based rendering is used, it is not accessible to screen readers. Text alternatives must be provided.
4. **Third-party components** — Arco Design components generally have good a11y, but some edge cases may need custom ARIA overrides.

### Planned Improvements

| Priority | Improvement                                  | Target       |
| -------- | -------------------------------------------- | ------------ |
| P0       | Skip navigation link in main layout          | Next release |
| P0       | Audit all icon-only buttons for `aria-label` | Next release |
| P1       | Add `aria-live` regions to chat message list | v2.x         |
| P1       | Keyboard shortcuts overlay / help dialog     | v2.x         |
| P2       | Full NVDA + JAWS test pass                   | v2.x         |
| P2       | axe-core integration in CI pipeline          | v2.x         |
| P3       | WCAG 2.1 AAA best-effort pass                | v3.x         |

---

## Resources

- [WCAG 2.1 Specification](https://www.w3.org/TR/WCAG21/)
- [WAI-ARIA Authoring Practices 1.2](https://www.w3.org/TR/wai-aria-practices-1.2/)
- [Arco Design Accessibility](https://arco.design/docs/spec/accessibility)
- [Inclusive Components](https://inclusive-components.design/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
