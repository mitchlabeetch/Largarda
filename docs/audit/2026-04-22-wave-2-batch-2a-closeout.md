# Wave 2 / Batch 2A Close-out - 2026-04-22

## Scope

Batch 2A owns the process-side document ingestion and progress contract:

- real process-owned ingestion state machine
- truthful progress emission
- cooperative cancellation
- stable process/worker correlation on `documentId`
- regression coverage for happy and unhappy paths

This note closes Batch 2A only. Wave 2 remains open until Batches 2B through
2D are complete.

## Source-backed outcome

Batch 2A is accepted after corrective audit follow-up.

The process-side ingestion path now has a real state machine in
`DocumentIngestionService`, cancellation support in `DocumentProcessor`,
worker-side `documentId` remapping, and regression tests that protect the
truthfulness guarantees introduced by this batch.

## Corrective fixes applied after audit

### 1. Progress emission now fails closed on repository write failure

`DocumentIngestionService` previously emitted `queued`, `failed`, or
`cancelled` progress even when the backing `DocumentRepository.update()` write
did not succeed.

That is now corrected by routing those state writes through a shared
`updateDocumentOrThrow(...)` helper and refusing to emit progress when the row
did not persist.

Affected paths:

- `transition(...)`
- `finalizeCancelled(...)`
- `finalizeFailed(...)`

### 2. Worker progress/result now use the persisted row id

`DocumentWorker` previously forwarded the processor-generated `documentId`,
which is derived from the file path and not guaranteed to match the persisted
`ma_documents` row id.

That is now corrected by remapping both progress and completion payloads to
`input.documentId` before posting back to the parent.

## Regression coverage added

Added or expanded tests now cover:

- no `queued` progress when the `queued` write fails
- no `failed` terminal progress when the `failed` write fails
- no `cancelled` terminal progress when the `cancelled` write fails
- cleanup of active ingestion state after failure and cancellation write errors
- worker-side `documentId` remap for both progress and completion payloads

## Commands run

### Focused tests

```bash
npm.cmd run test -- tests/unit/process/services/ma/DocumentIngestionService.test.ts tests/unit/process/worker/ma/DocumentWorker.test.ts tests/unit/process/services/ma/DocumentProcessor.test.ts tests/unit/process/services/ma/DealContextService.test.ts tests/unit/process/services/ma/DueDiligenceService.test.ts
```

Result:

- `5` test files passed
- `80` tests passed

### Formatting check

```bash
npx.cmd oxfmt --check src/process/services/ma/DocumentIngestionService.ts src/process/worker/ma/DocumentWorker.ts tests/unit/process/services/ma/DocumentIngestionService.test.ts tests/unit/process/worker/ma/DocumentWorker.test.ts
```

Result:

- all checked files matched formatter expectations

### Typecheck snapshot

```bash
npx.cmd tsc --noEmit
```

Result:

- still fails only on pre-existing `DueDiligenceService.ts` typing issues
- no new 2A-specific type failures introduced

Known unrelated type errors at audit time:

- `src/process/services/ma/DueDiligenceService.ts:816`
- `src/process/services/ma/DueDiligenceService.ts:1265`
- `src/process/services/ma/DueDiligenceService.ts:1368`

## Intentional deferrals

These items are intentionally not treated as 2A blockers and remain owned by
later Wave 2 batches:

- renderer upload flow still uses the old fake `processing` path in
  `src/renderer/hooks/ma/useDocuments.ts`
- DD renderer compatibility for the newer document states remains to be handled
  in `src/renderer/pages/ma/DueDiligence/DueDiligencePage.tsx`
- renderer localization and unhappy-path coverage remain Wave 2B / 2D scope

## Residual risk

- `DocumentWorker` now emits correlation-safe ids, but the current shipped
  renderer path does not consume the new ingest/progress contract yet.
- Wave 2 is not closed until the renderer adopts the real ingestion path and
  route-to-upload-to-DD behavior is protected by integration-facing regression
  tests.

## Unlock statement

- Batch `2A` is closed.
- Batch `2B` may proceed on top of this process contract.
- Wave `2` is not yet closed.
- Wave `3` is not unlocked by this note.
