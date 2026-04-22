# Wave 3 / Batch 3A Checkout - 2026-04-22

## Scope

Batch 3A owns the shared compliance foundations for the M&A renderer surface:

- locale seeding for shared M&A copy
- shared locale-aware formatters
- any reusable formatter or label helper surface needed by later compliance
  batches

This note checks out Batch 3A only. Wave 3 remains open until Batches 3B
through 3D are complete.

## Source-backed outcome

Batch 3A is accepted.

The repo now has a shared formatter path for the visible M&A surface and seeded
locale keys for the upload and DD work that landed during Wave 2. That gives
Wave 3 follow-up batches a stable shared base without reopening locale files.

## Shared foundations present

### Shared formatter package

The M&A formatter package now exists under:

- `src/renderer/utils/ma/formatters/date.ts`
- `src/renderer/utils/ma/formatters/number.ts`
- `src/renderer/utils/ma/formatters/money.ts`
- `src/renderer/utils/ma/formatters/identifier.ts`
- `src/renderer/utils/ma/formatters/index.ts`

Formatter unit coverage now exists for:

- `tests/unit/ma-formatters-date.test.ts`
- `tests/unit/ma-formatters-number.test.ts`
- `tests/unit/ma-formatters-money.test.ts`
- `tests/unit/ma-formatters-identifier.test.ts`

### Locale seeding

The M&A locale module now includes the seeded DD readiness and prerequisite copy
needed by later compliance sweeps, including the reference fallback locale
`fr-FR` and the shipped seeded locales:

- `src/renderer/services/i18n/locales/fr-FR/ma.json`
- `src/renderer/services/i18n/locales/ja-JP/ma.json`
- `src/renderer/services/i18n/locales/ko-KR/ma.json`
- `src/renderer/services/i18n/locales/tr-TR/ma.json`
- `src/renderer/services/i18n/locales/ru-RU/ma.json`
- `src/renderer/services/i18n/locales/uk-UA/ma.json`
- `src/renderer/services/i18n/locales/zh-CN/ma.json`
- `src/renderer/services/i18n/locales/zh-TW/ma.json`

## Evidence gathered

### Focused searches

The formatter package is present and isolated in the shared M&A utility path.

```bash
Get-ChildItem src/renderer/utils/ma/formatters | Select-Object -ExpandProperty Name
```

Result:

- `date.ts`
- `identifier.ts`
- `index.ts`
- `money.ts`
- `number.ts`

The search below shows where browser-default formatting shortcuts still remain.
Those are explicitly left for `3B` and `3C` consumption work rather than being
treated as a `3A` blocker.

```bash
Select-String -Path src/renderer/pages/ma/DealContext/DealContextPage.tsx,src/renderer/pages/ma/DueDiligence/DueDiligencePage.tsx -Pattern 'toLocaleDateString|toLocaleString|toLocaleTimeString'
```

Result:

- `src/renderer/pages/ma/DealContext/DealContextPage.tsx:346`
- `src/renderer/pages/ma/DealContext/DealContextPage.tsx:350`
- `src/renderer/pages/ma/DueDiligence/DueDiligencePage.tsx:298`
- `src/renderer/pages/ma/DueDiligence/DueDiligencePage.tsx:669`

That is acceptable for this batch because 3A seeds the shared helper path; it
does not own page-by-page formatter adoption.

## Commands run

### Focused formatter and regression tests

```bash
npm.cmd run test -- tests/unit/ma-formatters-date.test.ts tests/unit/ma-formatters-number.test.ts tests/unit/ma-formatters-money.test.ts tests/unit/ma-formatters-identifier.test.ts tests/unit/ma/documentUpload.dom.test.tsx tests/unit/ma/dueDiligencePage.dom.test.tsx tests/unit/useDocuments.dom.test.ts tests/unit/ma/useDueDiligence.dom.test.ts tests/unit/process/services/ma/DocumentIngestionService.test.ts
```

Result:

- `9` test files passed
- `97` tests passed

### i18n regeneration and validation

```bash
bun run i18n:types
node scripts/check-i18n.js
```

Result:

- i18n key types regenerated successfully
- validation passed with warnings only
- the touched M&A locale files were structurally valid and complete for the new
  keys introduced in this batch

### Typecheck snapshot

```bash
npx.cmd tsc --noEmit
```

Result:

- no new 3A-specific renderer type failures
- repo still has the pre-existing process-side `DueDiligenceService.ts` typing
  issues outside this batch

Known unrelated type errors at audit time:

- `src/process/services/ma/DueDiligenceService.ts:816`
- `src/process/services/ma/DueDiligenceService.ts:1265`
- `src/process/services/ma/DueDiligenceService.ts:1368`

## Residual risk

- 3A seeds the shared formatter path, but the routed M&A pages have not fully
  adopted those helpers yet
- raw interactive HTML, semantic colors, and broader accessibility compliance
  remain owned by `3B` and `3C`
- repo-wide i18n warnings remain outside the M&A module and are not caused by
  this batch

## Unlock statement

- Batch `3A` is checked out.
- Batches `3B` and `3C` may proceed in parallel without editing locale files.
- Wave `3` is not closed by this note.
- Wave `4` is not unlocked yet.
