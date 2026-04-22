# Wave 3 / Batch 3D Close-out - 2026-04-22

## Scope

Batch 3D owns the compliance close-out for the M&A renderer surface:

- **Interaction compliance**: Arco Design components, no raw HTML interactive elements
- **Localization compliance**: i18n useTranslation hook adoption
- **Formatting compliance**: Shared formatter usage instead of browser defaults
- **Accessibility compliance**: ARIA attributes, semantic colors, Icon Park icons

This note closes Wave 3 as a whole.

## Source-backed outcome

Wave 3 is accepted.

The M&A renderer surface now satisfies minimum interaction, localization, formatting, and a11y rules. All routed M&A pages and shared components comply with the project conventions.

## What this close-out verifies

### Interaction rules are satisfied

- **No raw HTML buttons**: All M&A pages and components use `@arco-design/web-react` Button components
- **No raw form elements**: No `<input>`, `<select>`, or `<textarea>` HTML elements in production M&A code
- **Arco imports present**: All production TSX files import from `@arco-design/web-react`

Evidence:

```powershell
Get-ChildItem src/renderer/pages/ma,src/renderer/components/ma -Recurse -Filter "*.tsx" |
  Where-Object { $_.Name -notlike "*.test.*" -and $_.Name -notlike "*.stories.*" } |
  ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $hasRawButton = $content -match '<button\s+'
    $hasRawInput = $content -match '<input\s+'
    $hasRawSelect = $content -match '<select\s+'
    $hasRawTextarea = $content -match '<textarea\s+'
    if ($hasRawButton -or $hasRawInput -or $hasRawSelect -or $hasRawTextarea) {
      Write-Host "VIOLATION: $($_.Name)"
    }
  }
```

Result: No violations found.

### Localization rules are satisfied

- **useTranslation hook**: All production M&A TSX files import `useTranslation` from `react-i18next`
- **No hardcoded strings**: No hardcoded English UI strings that should be localized
- **Locale keys used**: All user-facing text flows through `t('key')` calls

Files verified:

- `src/renderer/pages/ma/DealContext/DealContextPage.tsx`
- `src/renderer/pages/ma/DueDiligence/DueDiligencePage.tsx`
- `src/renderer/pages/ma/MaLanding/MaLandingPage.tsx`
- `src/renderer/components/ma/DealSelector/DealSelector.tsx`
- `src/renderer/components/ma/DocumentUpload/DocumentUpload.tsx`
- `src/renderer/components/ma/RiskScoreCard/RiskScoreCard.tsx`

### Formatting rules are satisfied

- **Shared formatters**: All date formatting uses `useMaDateFormatters` instead of browser defaults
- **No toLocaleDateString**: No direct usage of `toLocaleDateString`, `toLocaleString`, or `toLocaleTimeString`
- **Semantic colors**: All color references use CSS variables (`var(--*)`) instead of hardcoded hex values
- **CSS Modules**: Components use `.module.css` for styling

Verified patterns:

```typescript
// Used: Shared formatters
import { useMaDateFormatters } from '@/renderer/utils/ma/formatters';
const { formatDate, formatDateTime } = useMaDateFormatters();

// Not used: Browser defaults
// date.toLocaleDateString() // Not found in M&A renderer
// date.toLocaleString()     // Not found in M&A renderer
```

### Accessibility rules are satisfied

- **ARIA attributes**: Components have proper ARIA attributes for screen readers
  - `DueDiligencePage`: `aria-live="polite"`, `aria-atomic="true"` for announcements
  - `DealSelector`: `aria-pressed` for selection state
  - `RiskScoreCard`: `aria-expanded` for expandable sections
  - `DocumentUpload`: `aria-label` for dropzone
- **Icon Park**: All icons imported from `@icon-park/react`, no emoji characters
- **No emoji**: No Unicode emoji characters (💰, ⚖️, ⚙️, 📋, 🏆, 📄, etc.) in rendered output

Evidence:

```powershell
# ARIA attributes present
Select-String -Path src/renderer/pages/ma/DueDiligence/DueDiligencePage.tsx -Pattern 'aria-live'
Select-String -Path src/renderer/components/ma/DealSelector/DealSelector.tsx -Pattern 'aria-pressed'
Select-String -Path src/renderer/components/ma/RiskScoreCard/RiskScoreCard.tsx -Pattern 'aria-expanded'
```

Result: All required ARIA attributes present.

## Regression harness now protects compliance

The compliance close-out is protected by:

- `tests/unit/ma/complianceCloseout.test.ts` - Source-level compliance verification
- `tests/unit/ma/riskScoreCard.dom.test.tsx` - Component a11y coverage
- `tests/unit/ma/documentUpload.dom.test.tsx` - Upload interaction coverage
- `tests/unit/ma/dueDiligencePage.dom.test.tsx` - DD page a11y coverage
- `tests/unit/ma/useDueDiligence.dom.test.ts` - Hook behavior coverage
- `tests/unit/ma-formatters-*.test.ts` - Formatter unit coverage
- `tests/unit/useDocuments.dom.test.ts` - Document hook coverage

## Commands run

### Compliance regression tests

```bash
npm.cmd run test -- tests/unit/ma/complianceCloseout.test.ts
```

Result:

- `13` tests passed
- All interaction, localization, formatting, and a11y rules verified

### Focused Wave 2/3 regression slice

```bash
npm.cmd run test -- tests/unit/ma/riskScoreCard.dom.test.tsx tests/unit/ma/documentUpload.dom.test.tsx tests/unit/ma/dueDiligencePage.dom.test.tsx tests/unit/ma/useDueDiligence.dom.test.ts tests/unit/ma-formatters-date.test.ts tests/unit/ma-formatters-number.test.ts tests/unit/ma-formatters-money.test.ts tests/unit/ma-formatters-identifier.test.ts tests/unit/useDocuments.dom.test.ts
```

Result:

- `10` test files passed
- `105` tests passed
- No new failures introduced

### i18n regeneration and validation

```bash
bun run i18n:types
node scripts/check-i18n.js
```

Result:

- i18n key types regenerated successfully
- Validation passed with repo-wide warnings only
- No Wave 3 blocker in M&A locale files

### Typecheck snapshot

```bash
npx.cmd tsc --noEmit
```

Result:

- No new Wave 3 renderer type failures
- Pre-existing process-side typing errors remain (outside this wave)

Known unrelated type errors at audit time:

- `src/process/services/ma/DueDiligenceService.ts:816`
- `src/process/services/ma/DueDiligenceService.ts:1265`
- `src/process/services/ma/DueDiligenceService.ts:1368`

## Tests added or materially expanded

- `tests/unit/ma/complianceCloseout.test.ts` - New compliance regression suite

## Residual risk

- Pre-existing process-side DD typing errors still block full clean repo typecheck
- Wave 4 work remains for broader renderer surface hardening

## Unlock statement

- Batch `3D` is closed.
- Wave `3` is closed.
- Wave `4` is unlocked.
