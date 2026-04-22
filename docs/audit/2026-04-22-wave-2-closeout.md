# Wave 2 Close-out - 2026-04-22

## Scope

Wave 2 owns the end-to-end renderer and process truth for document ingestion and
due diligence handoff:

- `2A` process-backed ingestion contract
- `2B` renderer upload lifecycle rewrite
- `2C` due diligence runtime UX hardening
- `2D` regression close-out and audit evidence

This note closes Wave 2 as a whole.

## Source-backed outcome

Wave 2 is accepted.

The active M&A renderer now binds upload state to the real ingestion contract,
uses truthful cancel behavior, and blocks or enables due diligence based on
actual document readiness instead of renderer-invented transitions.

## What this close-out verifies

### Upload flow is process-backed and correlation-safe

- the renderer upload hook validates formats against the supported format set
- upload state tracks the real `uploadId` instead of losing the map key during
  rendering
- cancel actions only mark a row as cancelled after the process contract confirms
  cancellation or the truthful terminal event arrives
- upload error handling now localizes structured error responses before surfacing
  them to the UI

### Due diligence is honest about prerequisites and lifecycle

- the DD hook no longer exposes a fake local-only cancel transition
- the DD page blocks analysis when uploaded documents are still processing
- the DD page enables analysis only after a completed document is selected
- the async analysis region exposes a polite live announcement while analysis is
  running

### Regression harness now protects the upload-to-DD handoff

Wave 2 required focused integration-facing coverage rather than broader surface
refactors. That coverage is now present at the component and hook boundary:

- `tests/unit/useDocuments.dom.test.ts`
- `tests/unit/ma/documentUpload.dom.test.tsx`
- `tests/unit/ma/useDueDiligence.dom.test.ts`
- `tests/unit/ma/dueDiligencePage.dom.test.tsx`

Happy path now protected:

- a completed document can be selected and enables the DD start action

Unhappy paths now protected:

- processing documents keep DD blocked
- upload cancel refusal does not invent a cancelled state
- localized upload failures surface through the renderer contract

## Commands run

### Focused Wave 2 / 3 checkout slice

```bash
npm.cmd run test -- tests/unit/ma-formatters-date.test.ts tests/unit/ma-formatters-number.test.ts tests/unit/ma-formatters-money.test.ts tests/unit/ma-formatters-identifier.test.ts tests/unit/ma/documentUpload.dom.test.tsx tests/unit/ma/dueDiligencePage.dom.test.tsx tests/unit/useDocuments.dom.test.ts tests/unit/ma/useDueDiligence.dom.test.ts tests/unit/process/services/ma/DocumentIngestionService.test.ts
```

Result:

- `9` test files passed
- `97` tests passed

### Formatter check

```bash
npx.cmd oxfmt --check src/renderer/utils/ma/formatters/identifier.ts tests/unit/ma-formatters-number.test.ts tests/unit/ma-formatters-money.test.ts tests/unit/ma/documentUpload.dom.test.tsx tests/unit/ma/dueDiligencePage.dom.test.tsx
```

Result:

- all checked files matched formatter expectations

### i18n regeneration and validation

```bash
bun run i18n:types
node scripts/check-i18n.js
```

Result:

- i18n key types regenerated successfully
- validation passed with repo-wide warnings only
- no Wave 2 blocker remained in the M&A locale files touched by this wave

### Typecheck snapshot

```bash
npx.cmd tsc --noEmit
```

Result:

- still fails only on pre-existing `src/process/services/ma/DueDiligenceService.ts`
  typing issues
- no new Wave 2 renderer type failures remained at close-out time

Known unrelated type errors at audit time:

- `src/process/services/ma/DueDiligenceService.ts:816`
- `src/process/services/ma/DueDiligenceService.ts:1265`
- `src/process/services/ma/DueDiligenceService.ts:1368`

## Tests added or materially expanded

- `tests/unit/ma/documentUpload.dom.test.tsx`
- `tests/unit/ma/dueDiligencePage.dom.test.tsx`
- `tests/unit/ma/useDueDiligence.dom.test.ts`
- `tests/unit/useDocuments.dom.test.ts`

## Residual risk

- broader repo i18n warnings still exist, mostly outside the M&A module and not
  introduced by this wave
- pre-existing process-side DD typing errors still block a full clean repo
  typecheck
- Wave 3 compliance work still remains for raw interactive HTML, semantic color
  cleanup, formatter adoption in shipped pages, and broader accessibility polish

## Unlock statement

- Wave `2` is closed.
- Wave `3` is unlocked.
- Batches `3B` and `3C` may proceed on top of the `3A` shared foundations
  without reopening Wave 2 contracts.
