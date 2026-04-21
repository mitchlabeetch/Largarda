# ADR 0007 — Design System Component Contracts

- **Status:** Accepted
- **Date:** 2026-04-20
- **Deciders:** Largo Engineering (Wave 0)

## Context

The application previously used Arco Design components (Spin, Empty) directly across the codebase, leading to inconsistent loading states and empty state presentations. Wave 0 introduced base components (Skeleton, EmptyState) to standardise these patterns.

Two key contract sections emerged:

- **§ 1.4**: Skeleton component contract for loading states
- **§ 2**: EmptyState component contract for empty data scenarios

Without formal contracts, future contributors might introduce divergent implementations, breaking the design system consistency.

## Decision

### § 1.4 — Skeleton Component Contract

The Skeleton component provides consistent loading placeholders:

**API Contract:**

```typescript
interface SkeletonProps {
  variant?: 'card' | 'text' | 'circle' | 'rect';
  height?: string | number;
  width?: string | number;
  className?: string;
}
```

**Usage Rules:**

1. Use `variant='card'` for card-like containers (default height: 120px)
2. Use `variant='text'` for text line placeholders
3. Use `variant='circle'` for avatar/icon placeholders
4. Use `variant='rect'` for generic rectangular placeholders
5. Always provide explicit `height` when using `variant='card'` outside default contexts
6. Replace all Arco Design `Spin` components with `Skeleton` for better UX

**Implementation Location:** `src/renderer/components/base/Skeleton/`

### § 2 — EmptyState Component Contract

The EmptyState component provides consistent empty data presentations:

**API Contract:**

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}
```

**Usage Rules:**

1. Always provide an `icon` (preferably from `@icon-park/react`)
2. `title` should be a short, descriptive phrase (e.g., "No deals found")
3. `description` should provide context and guidance (e.g., "Create your first deal to get started")
4. `action` is optional but recommended for actionable empty states
5. Replace all Arco Design `Empty` components with `EmptyState`
6. All empty state text must use i18n keys (no hardcoded strings)

**Implementation Location:** `src/renderer/components/base/EmptyState/`

### Component Export Contract

Base components are exported from `src/renderer/components/base/index.ts`:

```typescript
export { Skeleton } from './Skeleton';
export { EmptyState } from './EmptyState';
```

## Consequences

- **Positive.** Consistent loading and empty states across the entire application
- **Positive.** Centralised maintenance for common UI patterns
- **Positive.** Type-safe component APIs prevent misuse
- **Positive.** i18n compliance enforced through EmptyState contract
- **Negative.** Requires migration of existing Arco Design usage (ongoing)
- **Negative.** Additional abstraction layer adds slight complexity

## References

- `DESIGN_SYSTEM.md` § 1.4 — Skeleton component specification
- `DESIGN_SYSTEM.md` § 2 — EmptyState component specification
- Wave 0 PR — Initial implementation of Skeleton and EmptyState
- RiskScoreCard refactoring — First consumer of new base components
