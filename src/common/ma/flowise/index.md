# src/common/ma/flowise/ — Flowise catalogue & flowKey registry

## Overview

Stable, environment-agnostic registry of every Largo AI surface. The
renderer and the bridge never address a Flowise flow id directly —
they resolve a stable `flowKey` through this catalogue, which Wave 6.4
may override at runtime (e.g. to target staging or a local Flowise).

## Files

- **flowKey.ts** — `KNOWN_FLOW_KEYS` array, `FlowKey` union type,
  `FlowKeySchema` Zod validator, and `isFlowKey` type guard.
- **catalog.ts** — `FlowSpec` type and the `FLOW_CATALOG` registry
  mapping each `flowKey` to its Flowise flow id, prompt version, KB
  scopes, tool dependencies, streaming capability, and lifecycle
  status (`draft | authored | deployed | deprecated`).
- **index.ts** — barrel re-exporting the public surface.

## Lifecycle of a `flowKey`

1. **Author the spec.** Add a new entry to `KNOWN_FLOW_KEYS` and a
   matching row in `FLOW_CATALOG` with `status: 'draft'` and an
   `id` prefixed `draft_`. This is type-safe as of that commit — the
   catalogue test ensures every key has a spec.
2. **Implement the flow in Flowise** (either by hand in the Flowise
   UI, then exporting to `chatbuild/flowise_automation/flows/`, or by
   authoring the flow JSON directly under that folder).
3. **Flip to `authored`.** Update the `id` to the real Flowise UUID
   and `status` to `'authored'`. The flow is now callable in dev.
4. **Deploy to production** through the Wave 6.3 reconcile script
   (`chatbuild/flowise_automation/Update-LargoFlowise.ps1`). Flip
   `status` to `'deployed'`.
5. **Bump `promptVersionId`** any time the flow's prompt or graph
   changes. Wave 6.6 persists every version; Wave 6.7's audit asserts
   observability carries this field.
6. **Deprecate** before removal: set `status: 'deprecated'` and
   cross-link to the successor in the `description`. Keep the entry
   for at least one release cycle, then remove.

## Related documentation

- [docs/audit/2026-04-20-backend-snapshot-findings.md](../../../../docs/audit/2026-04-20-backend-snapshot-findings.md) —
  why this registry exists (audit findings).
- [docs/plans/2026-04-20-backend-scaling-plan.md](../../../../docs/plans/2026-04-20-backend-scaling-plan.md) —
  the full target architecture (§ 1 for the chatflow catalogue).
- [tasks.md](../../../../tasks.md) Wave 6.6 — prompt versioning +
  catalogue surface.
