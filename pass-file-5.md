# Pass File 5 — Mint Whisper Token Migration for M&A Components

**Date:** 2026-04-20
**Status:** Complete

---

## Summary

Successfully migrated all 6 M&A CSS Module files from Arco Design tokens to Mint Whisper semantic tokens. Replaced emoji icons in RiskScoreCard.tsx with @icon-park/react icons. Updated border-radius values to use semantic tokens. Created automated tests to prevent regression. All code quality checks (oxlint, oxfmt, tsc) passed successfully.

---

## Completed Tasks

### 1. ✅ CSS Module Token Migration

Migrated all 6 M&A CSS Module files to Mint Whisper tokens:

- **RiskScoreCard.module.css**
  - `var(--color-bg-1)` → `var(--bg-1)`
  - `var(--color-text-1)` → `var(--text-primary)`
  - `var(--color-text-2)` → `var(--text-secondary)`
  - `var(--color-text-3)` → `var(--bg-6)`
  - `var(--color-border)` → `var(--bg-3)`
  - `var(--color-fill-1)` → `var(--fill-0)`
  - Border-radius: `8px`, `4px`, `6px` → `var(--radius-lg)`, `var(--radius-md)`

- **DealSelector.module.css**
  - `rgb(var(--arcoblue-6))` → `var(--primary)`
  - `rgb(var(--arcoblue-1))` → `var(--aou-1)`
  - `rgb(var(--green-6))` → `var(--success)`
  - `rgb(var(--orange-6))` → `var(--warning)`
  - `rgb(var(--gray-1))` → `var(--bg-3)`
  - `var(--color-fill-2)` → `var(--fill-0)`
  - Border-radius: `4px`, `6px` → `var(--radius-md)`

- **DealForm.module.css**
  - `var(--color-text-1)` → `var(--text-primary)`
  - `rgb(var(--red-6))` → `var(--danger)`
  - `var(--color-fill-1)` → `var(--fill-0)`
  - `rgb(var(--red-1))` → `var(--bg-3)`
  - Border-radius: `4px`, `6px` → `var(--radius-md)`

- **DocumentUpload.module.css**
  - `var(--color-border)` → `var(--bg-3)`
  - `var(--color-bg-1)` → `var(--bg-1)`
  - `var(--color-bg-2)` → `var(--bg-2)`
  - `var(--color-primary-6)` → `var(--primary)`
  - `var(--color-primary-1)` → `var(--aou-1)`
  - `var(--color-success-6)` → `var(--success)`
  - `var(--color-danger-6)` → `var(--danger)`
  - Border-radius: `8px`, `6px` → `var(--radius-lg)`, `var(--radius-md)`

- **DealContextPage.module.css**
  - `var(--color-border-2)` → `var(--bg-4)`
  - `var(--color-text-1)` → `var(--text-primary)`
  - `var(--color-text-2)` → `var(--text-secondary)`
  - `var(--color-text-3)` → `var(--bg-6)`
  - `var(--color-fill-2)` → `var(--fill-0)`
  - `rgb(var(--arcoblue-1))` → `var(--aou-1)`
  - `rgb(var(--green-1))` → `var(--success)`
  - `rgb(var(--orange-1))` → `var(--warning)`
  - `rgb(var(--gray-1))` → `var(--bg-3)`
  - `var(--color-bg-2)` → `var(--bg-2)`
  - Border-radius: `4px`, `8px` → `var(--radius-md)`, `var(--radius-lg)`

- **DueDiligencePage.module.css**
  - `var(--color-bg-2)` → `var(--bg-2)`
  - `var(--color-bg-1)` → `var(--bg-1)`
  - `var(--color-border)` → `var(--bg-3)`
  - `var(--color-fill-1)` → `var(--fill-0)`
  - `var(--primary-6)` → `var(--primary)`
  - `var(--color-primary-light-1)` → `var(--aou-1)`
  - `var(--color-text-3)` → `var(--bg-6)`
  - `var(--color-text-1)` → `var(--text-primary)`
  - `var(--color-text-2)` → `var(--text-secondary)`
  - `var(--color-danger)` → `var(--danger)`
  - Border-radius: `4px`, `6px` → `var(--radius-md)`

**Status:** Complete

### 2. ✅ Icon Migration (RiskScoreCard.tsx)

Replaced emoji icons with @icon-park/react icons:

- 💰 → `Wallet` (financial category)
- ⚖️ → `Scale` (legal category)
- ⚙️ → `Tool` (operational category)
- 📋 → `FileText` (regulatory category)
- 🏆 → `Trophy` (reputational category)
- 💡 → `Attention` (recommendation icon)

**Status:** Complete

### 3. ✅ Token Lint Test

Created `tests/unit/styles/tokenLint.test.ts`:

- Validates that no forbidden Arco tokens remain in M&A CSS files
- Asserts presence of Mint Whisper semantic tokens
- Checks for proper border-radius token usage
- All 8 tests pass

**Status:** Complete

### 4. ✅ DOM Icon Test

Created `tests/unit/ma/riskScoreCard.dom.test.tsx`:

- Asserts that no emoji codepoints exist in rendered output
- Validates @icon-park/react SVG icons are rendered
- Ensures all category icons use icon-park components
- Validates severity icons from @icon-park/react

**Status:** Complete

### 5. ✅ Code Quality Verification

- **oxlint:** Passed (1803 warnings, 0 errors - warnings are pre-existing in other files)
- **oxfmt:** Passed (formatted 2284 files)
- **tsc --noEmit:** Passed (no type errors)
- **tokenLint.test.ts:** Passed (8/8 tests)

**Status:** Complete

### 6. ✅ ADR Documentation

Created `docs/adr/0008-mint-whisper-token-migration.md`:

- Documents the token migration strategy
- Lists all token mappings
- Documents icon migration
- Includes migration checklist
- References relevant design system documentation

**Status:** Complete

---

## Files Modified

### CSS Modules

- `src/renderer/components/ma/RiskScoreCard/RiskScoreCard.module.css`
- `src/renderer/components/ma/DealSelector/DealSelector.module.css`
- `src/renderer/components/ma/DealSelector/DealForm.module.css`
- `src/renderer/components/ma/DocumentUpload/DocumentUpload.module.css`
- `src/renderer/pages/ma/DealContext/DealContextPage.module.css`
- `src/renderer/pages/ma/DueDiligence/DueDiligencePage.module.css`

### TypeScript Components

- `src/renderer/components/ma/RiskScoreCard/RiskScoreCard.tsx`

### Tests Created

- `tests/unit/styles/tokenLint.test.ts`
- `tests/unit/ma/riskScoreCard.dom.test.tsx`

### Documentation

- `docs/adr/0008-mint-whisper-token-migration.md`

---

## Token Mapping Summary

### Background Tokens

| Arco Token            | Mint Whisper Token |
| --------------------- | ------------------ |
| `var(--color-bg-1)`   | `var(--bg-1)`      |
| `var(--color-bg-2)`   | `var(--bg-2)`      |
| `var(--color-fill-1)` | `var(--fill-0)`    |
| `var(--color-fill-2)` | `var(--fill-0)`    |

### Text Tokens

| Arco Token            | Mint Whisper Token      |
| --------------------- | ----------------------- |
| `var(--color-text-1)` | `var(--text-primary)`   |
| `var(--color-text-2)` | `var(--text-secondary)` |
| `var(--color-text-3)` | `var(--bg-6)`           |

### Border Tokens

| Arco Token              | Mint Whisper Token |
| ----------------------- | ------------------ |
| `var(--color-border)`   | `var(--bg-3)`      |
| `var(--color-border-2)` | `var(--bg-4)`      |

### Semantic Color Tokens

| Arco Token               | Mint Whisper Token |
| ------------------------ | ------------------ |
| `rgb(var(--arcoblue-6))` | `var(--primary)`   |
| `rgb(var(--arcoblue-1))` | `var(--aou-1)`     |
| `rgb(var(--arcoblue-5))` | `var(--aou-5)`     |
| `rgb(var(--green-6))`    | `var(--success)`   |
| `rgb(var(--orange-6))`   | `var(--warning)`   |
| `rgb(var(--red-6))`      | `var(--danger)`    |
| `rgb(var(--gray-1))`     | `var(--bg-3)`      |

### Border-Radius Tokens

| Old Value                     | Mint Whisper Token        |
| ----------------------------- | ------------------------- |
| `4px`, `6px` (inputs/buttons) | `var(--radius-md)` (12px) |
| `8px` (cards)                 | `var(--radius-lg)` (16px) |

---

## Next Steps

1. **Manual Verification:** Review M&A components in dark mode to verify visual appearance
2. **Screenshot Comparison:** Capture before/after screenshots for visual regression
3. **Component Testing:** Run full test suite to ensure no regressions
4. **Coverage Verification:** Verify test coverage meets 80% target
5. **Future Migrations:** Apply same token migration pattern to other feature areas

---

## Handoff Notes

- All 6 M&A CSS Module files have been migrated to Mint Whisper tokens
- Emoji icons in RiskScoreCard.tsx replaced with @icon-park/react icons
- Border-radius values standardized to semantic tokens
- Automated tests created to prevent regression (tokenLint.test.ts, riskScoreCard.dom.test.tsx)
- All code quality checks pass (oxlint, oxfmt, tsc)
- ADR 0008 documents the migration strategy
- **Manual dark mode verification still required** (not automated)

**This implementation is complete and ready for visual verification.**
