# Wave 2B / 2C Remaining Remediation Prompt

Use this prompt for the follow-up agent that will finish the remaining `2B` and
`2C` work while `3A` runs in parallel.

## Operator intent

- This prompt owns the remaining truthful renderer behavior for Wave 2 upload
  and due diligence.
- It must not collide with Wave `3A`, which owns locale files and shared
  formatter / label helpers.
- After this prompt lands and `3A` lands, the auditor will complete `2D` and
  `3A` close-out.

## Feed-ready prompt

```text
You own the remaining remediation for Wave 2 / Batches 2B and 2C.

This run is parallel to Wave 3 / Batch 3A.

Your job:
- finish the remaining truthful upload and due-diligence renderer behavior
- remove the currently audited regressions
- add the missing renderer/hook tests
- avoid collisions with 3A locale/helper ownership

Goal:
- make upload and DD behavior truthful, type-safe, and test-backed
- leave locale seeding and shared formatter/helper creation to 3A
- return any exact locale/helper delta that 3A must absorb

Read first:
- tasks.md sections for Batch 2B, 2C, 2D, and 3A
- docs/audit/2026-04-22-wave-2-batch-2a-closeout.md
- src/renderer/hooks/ma/useDocuments.ts
- src/renderer/components/ma/DocumentUpload/DocumentUpload.tsx
- src/renderer/pages/ma/DueDiligence/DueDiligencePage.tsx
- src/renderer/hooks/ma/useDueDiligence.ts
- tests/unit/useDocuments.dom.test.ts
- tests/unit/ma/dueDiligencePage.dom.test.tsx

Current blocking findings you must resolve:
1. useDocuments currently breaks typecheck because SUPPORTED_FORMATS is typed as
   DocumentFormat[] but initialized as a Set and later read via .has().
2. DocumentUpload loses the upload map key and passes documentId into
   cancel/remove handlers that expect uploadId.
3. useDocuments.cancelUpload() invents a cancelled state even when the process
   cancel call fails or returns false.
4. useDueDiligence.cancelAnalysis() is local-only and dishonest because there is
   no backend cancel bridge/provider; the page must not pretend cancel worked.
5. Remaining user-facing upload/DD copy must no longer be hardcoded in the hook.
   Use existing keys or 3A-seeded keys, and return exact locale deltas if 3A
   still needs to patch reference translations.

Write only:
- src/renderer/components/ma/DocumentUpload/**
- src/renderer/hooks/ma/useDocuments.ts
- src/renderer/hooks/ma/useDueDiligence.ts
- src/renderer/pages/ma/DueDiligence/**
- tests/unit/useDocuments.dom.test.ts
- tests/unit/ma/dueDiligencePage.dom.test.tsx
- any new focused renderer/hook test files needed for these surfaces only

Do not edit:
- src/process/**
- src/common/adapter/ipcBridge.ts
- src/common/ma/types.ts
- src/renderer/services/i18n/locales/**
- shared formatter/helper files owned by 3A unless they are already merged and
  you are only consuming them
- docs/audit/**

3A coordination rules:
- If 3A has already landed shared helpers or locale keys, consume them.
- If a needed key/helper is missing, do not edit locale files or invent a new
  shared helper in this run.
- Instead, return an explicit 3A delta request with:
  - exact locale keys needed
  - exact English and French reference copy needed
  - exact shared helper signature needed, if any

Implementation requirements:

Upload (2B):
- fix the SUPPORTED_FORMATS type issue cleanly
- keep uploadStatus keyed by uploadId and preserve that key through render,
  cancel, and clear flows
- cancelUpload() must be truthful:
  - if process cancel returns true, reflect pending/awaited cancellation and let
    truthful terminal progress finalize state
  - if process cancel returns false, do not mark cancelled; keep the prior state
    and surface a user-visible error path or stable failed action result
  - if process cancel throws, do not mark cancelled
- remove remaining hardcoded upload validation/failure copy from the hook;
  consume i18n in a renderer-safe way
- keep upload affordances keyboard-safe and AGENTS compliant
- do not reintroduce fake progress or fake provenance

Due diligence (2C):
- because there is no backend cancel contract in the current process bridge, the
  DD UI must not pretend cancellation happened
- choose one truthful option within renderer scope:
  - remove the cancel affordance entirely, or
  - disable it with a clearly localized blocked explanation
- update any announcement logic so it no longer claims cancelled when the
  backend is still running
- keep readiness-off, no-docs, processing, failure, and success states honest
- ensure async changes remain accessible

Testing requirements:
- upload hook tests must cover:
  - validation failure
  - success lifecycle
  - truthful cancel success path
  - cancel false / cancel reject path that does NOT invent cancelled state
  - cleanup behavior
- upload component DOM tests must cover:
  - cancel/remove using the true uploadId
  - visible error state
  - keyboard-safe affordance if touched
- DD page tests must cover:
  - readiness-off
  - no-docs
  - processing/loading
  - failure
  - success
  - aria-live or equivalent async announcement assertion
- add a focused useDueDiligence hook test if needed to prove cancel is no longer
  dishonest

Required command checklist:
- npm.cmd run test -- tests/unit/useDocuments.dom.test.ts tests/unit/ma/dueDiligencePage.dom.test.tsx [plus any new focused test files]
- npx.cmd tsc --noEmit
- npx.cmd oxfmt --check [all touched files]
- if you consume 3A locale changes already merged, also run:
  - bun run i18n:types
  - node scripts/check-i18n.js

Quality bar:
- no new type errors outside the known pre-existing DueDiligenceService errors
- no fake cancel state remains
- no upload cancel/remove no-op remains
- no hardcoded English upload validation strings remain in code
- tests fail if these exact regressions return

Return with:
- files changed
- exact behavior fixes made
- commands run and outcomes
- any 3A delta request still needed
- explicit statement whether 2B and 2C are ready for auditor close-out

Abort and escalate if:
- a truthful DD cancel path requires process/bridge changes
- 3A-owned locale/helper work is required and cannot be expressed as a delta
- a required fix would force edits in src/process/** or shared IPC contracts
```

## Auditor note

When this prompt returns:

- I will audit the resulting `2B/2C` tree against the existing findings plus
  the Wave 2 contracts.
- If `3A` has also landed, I will then complete:
  - Wave 2 / Batch 2D close-out
  - Wave 3 / Batch 3A checkout
