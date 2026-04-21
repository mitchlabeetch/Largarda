# Wave 0 Visual Diff — Design System Integration

This document captures the visual changes introduced in Wave 0, focusing on the design system component integration.

## Overview

Wave 0 replaced Arco Design's native loading and empty state components with custom base components (Skeleton, EmptyState) for consistent UX across the application.

## Component Changes

### 1. Skeleton Component (Loading States)

**Before:** Arco Design `Spin` component

```tsx
<Spin />
<span>Analyzing risks...</span>
```

**After:** Custom `Skeleton` component

```tsx
<Skeleton variant='card' height='120px' />
```

#### Visual Comparison

| Before (Spin)                                          | After (Skeleton)                                              |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| ![Spin loading state](./images/wave-0-spin-before.png) | ![Skeleton loading state](./images/wave-0-skeleton-after.png) |

**Key Differences:**

- Skeleton provides a card-shaped placeholder that matches the content dimensions
- More professional appearance with structured layout
- Better visual feedback for card-based content areas

---

### 2. EmptyState Component (Empty Data States)

**Before:** Arco Design `Empty` component

```tsx
<Empty description='No risk data available' />
```

**After:** Custom `EmptyState` component

```tsx
<EmptyState
  icon={<FileText size={64} />}
  title='No risk data available'
  description='Upload documents to analyze risks'
/>
```

#### Visual Comparison

| Before (Empty)                                   | After (EmptyState)                                            |
| ------------------------------------------------ | ------------------------------------------------------------- |
| ![Empty state](./images/wave-0-empty-before.png) | ![EmptyState component](./images/wave-0-emptystate-after.png) |

**Key Differences:**

- Custom icon (FileText) provides semantic context
- Title + description structure for better information hierarchy
- Actionable guidance ("Upload documents to analyze risks")
- Consistent styling with design system tokens

---

## RiskScoreCard Integration

The RiskScoreCard component was the first consumer of the new base components.

### Loading State

**Before:**

```tsx
<div className={styles.loadingState}>
  <Spin />
  <span>Analyzing risks...</span>
</div>
```

**After:**

```tsx
<div className={styles.loadingState}>
  <Skeleton variant='card' height='120px' />
</div>
```

#### Visual Comparison

| Before                                                                       | After                                                                      |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ![RiskScoreCard loading before](./images/wave-0-riskcard-loading-before.png) | ![RiskScoreCard loading after](./images/wave-0-riskcard-loading-after.png) |

---

### Empty State

**Before:**

```tsx
<Empty description='No risk data available' />
```

**After:**

```tsx
<EmptyState
  icon={<FileText size={64} />}
  title='No risk data available'
  description='Upload documents to analyze risks'
/>
```

#### Visual Comparison

| Before                                                                   | After                                                                  |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| ![RiskScoreCard empty before](./images/wave-0-riskcard-empty-before.png) | ![RiskScoreCard empty after](./images/wave-0-riskcard-empty-after.png) |

---

## Design System Benefits

### Consistency

- All loading states now use the Skeleton component
- All empty states now use the EmptyState component
- Unified visual language across the application

### UX Improvements

- Skeleton provides better visual feedback for content dimensions
- EmptyState provides actionable guidance to users
- Semantic icons improve comprehension

### Maintainability

- Single source of truth for loading/empty patterns
- Centralised styling via design system tokens
- Type-safe component APIs prevent misuse

---

## Migration Path

### Completed Components

- ✅ RiskScoreCard — fully migrated to Skeleton and EmptyState

### Pending Migration

- ⏳ DocumentUpload — currently uses Arco Design components
- ⏳ DealSelector — currently uses Arco Design components
- ⏳ DealContextPage — currently uses Arco Design components
- ⏳ Other components across the application

### Migration Checklist

For each component:

1. Replace `Spin` with `Skeleton` (use appropriate variant)
2. Replace `Empty` with `EmptyState` (add icon, title, description)
3. Ensure all text uses i18n keys
4. Test loading and empty states visually
5. Update component stories in Storybook

---

## Screenshots Directory

All screenshots referenced in this document should be placed in:

```
docs/pr/images/
```

Naming convention: `wave-0-{component}-{state}-{before|after}.png`

Example:

- `wave-0-riskcard-loading-before.png`
- `wave-0-riskcard-loading-after.png`
- `wave-0-riskcard-empty-before.png`
- `wave-0-riskcard-empty-after.png`

---

## Notes

- Screenshots are placeholders and should be replaced with actual captures
- Visual diff should be updated as more components are migrated
- Consider adding video captures for loading state animations
