# ADR 0008 — Mint Whisper Token Migration for M&A Components

- **Status:** Accepted
- **Date:** 2026-04-20
- **Deciders:** Largo Engineering (Wave 0)

## Context

The M&A (Mergers & Acquisitions) feature components previously used Arco Design CSS tokens directly in their CSS Modules. This created a dependency on Arco's design system and made it difficult to migrate to the Mint Whisper design system.

**Affected Components:**

- `src/renderer/components/ma/RiskScoreCard/RiskScoreCard.module.css`
- `src/renderer/components/ma/DealSelector/DealSelector.module.css`
- `src/renderer/components/ma/DealSelector/DealForm.module.css`
- `src/renderer/components/ma/DocumentUpload/DocumentUpload.module.css`
- `src/renderer/pages/ma/DealContext/DealContextPage.module.css`
- `src/renderer/pages/ma/DueDiligence/DueDiligencePage.module.css`

**Issues:**

- Direct use of Arco tokens (`var(--color-bg-*)`, `var(--color-text-*)`, `rgb(var(--arcoblue-*))`, etc.)
- Hardcoded hex color values in TypeScript files
- Emoji icons in RiskScoreCard.tsx instead of @icon-park/react icons
- Inconsistent border-radius values (4px, 6px, 8px instead of semantic tokens)

## Decision

### Token Migration Strategy

All Arco Design tokens have been replaced with Mint Whisper semantic tokens:

**Background Tokens:**

- `var(--color-bg-1)` → `var(--bg-1)`
- `var(--color-bg-2)` → `var(--bg-2)`
- `var(--color-fill-1)` → `var(--fill-0)`
- `var(--color-fill-2)` → `var(--fill-0)`

**Text Tokens:**

- `var(--color-text-1)` → `var(--text-primary)`
- `var(--color-text-2)` → `var(--text-secondary)`
- `var(--color-text-3)` → `var(--bg-6)` (tertiary text)

**Border Tokens:**

- `var(--color-border)` → `var(--bg-3)`
- `var(--color-border-2)` → `var(--bg-4)`

**Semantic Color Tokens:**

- `rgb(var(--arcoblue-6))` → `var(--primary)`
- `rgb(var(--arcoblue-1))` → `var(--aou-1)`
- `rgb(var(--arcoblue-5))` → `var(--aou-5)`
- `rgb(var(--green-6))` → `var(--success)`
- `rgb(var(--orange-6))` → `var(--warning)`
- `rgb(var(--red-6))` → `var(--danger)`
- `rgb(var(--gray-1))` → `var(--bg-3)`

**Border-Radius Tokens:**

- `4px`, `6px` (inputs/buttons) → `var(--radius-md)` (12px)
- `8px` (cards) → `var(--radius-lg)` (16px)

### Icon Migration

Emoji icons in `RiskScoreCard.tsx` have been replaced with @icon-park/react icons:

- 💰 → `Wallet`
- ⚖️ → `Scale`
- ⚙️ → `Tool`
- 📋 → `FileText`
- 🏆 → `Trophy`

### Test Coverage

Two new test files ensure migration integrity:

1. **`tests/unit/styles/tokenLint.test.ts`**
   - Validates that no forbidden Arco tokens remain in M&A CSS files
   - Asserts presence of Mint Whisper semantic tokens
   - Runs as part of the test suite

2. **`tests/unit/ma/riskScoreCard.dom.test.tsx`**
   - Asserts that no emoji codepoints exist in rendered output
   - Validates @icon-park/react SVG icons are rendered
   - Ensures all category icons use icon-park components

## Consequences

- **Positive.** M&A components now use Mint Whisper design system tokens
- **Positive.** Consistent styling across all M&A components
- **Positive.** Easier to maintain design system consistency
- **Positive.** Icon accessibility improved with @icon-park/react
- **Positive.** Automated tests prevent regression
- **Negative.** Requires review of visual appearance in dark mode
- **Negative.** Border-radius values increased (may affect layout)

## Migration Checklist

- [x] Migrate all 6 M&A CSS Module files to Mint Whisper tokens
- [x] Replace emoji icons in RiskScoreCard.tsx with @icon-park/react
- [x] Update border-radius values to semantic tokens
- [x] Create tokenLint.test.ts for validation
- [x] Create riskScoreCard.dom.test.tsx for icon validation
- [x] Run oxlint, oxfmt, tsc --noEmit (all pass)
- [x] Run tests (tokenLint.test.ts passes)
- [ ] Dark mode screenshot parity verification (manual step)

## References

- `uno.config.ts` — Mint Whisper token definitions
- `DESIGN_SYSTEM.md` — Design system guidelines
- RiskScoreCard component — Icon migration example
- Wave 0.2 task — Original migration requirement
