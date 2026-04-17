# ADR 0002 — Place the M&A Valuation Engine under `src/common/ma/valuation/`

- **Status:** Accepted
- **Date:** 2026-04-17
- **Deciders:** Largo Engineering (Completer pass 1)

## Context

ROADMAP § "Phase 1 — M&A Intelligence" plans a `packages/ma-core/valuation/`
module inside a future Turborepo layout. The monorepo migration itself is a
separate, larger ADR (forthcoming: `0003-turborepo-monorepo-migration`).

We still need to ship valuation today so that downstream work (company profiles,
IM generation, valuation report) has a concrete, pure, testable core.

The repository already uses `src/common/` for cross-process pure logic — the
AionUi convention says: **no Electron, no DOM, no Node-only APIs** — so it is
the correct transitional home for an engine that must run in the main process,
the renderer, and future workers.

## Decision

1. The valuation engine lives at `src/common/ma/valuation/` with one module per
   method:
   - `dcf.ts` — _Flux de trésorerie actualisés_, Gordon-Shapiro terminal
     value, WACC discounting.
   - `multiples.ts` — EV/EBITDA, EV/Revenue, P/E with caller-supplied
     sector benchmarks.
   - `anr.ts` — _Actif net réévalué_.
   - `ruleOfThumb.ts` — sector heuristics with a ships-by-default table for
     eight common French small-business sectors.
   - `sensitivity.ts` — 1-axis DCF sweep used to feed tornado charts.
   - `footballField.ts` — aggregation of ranges into the football-field
     summary.
   - `types.ts` — shared, readonly types.
   - `index.ts` — public API surface.
2. Every function is **pure** and deterministic. Validation errors are
   surfaced via dedicated named error classes (e.g. `DcfValidationError`) so
   downstream i18n layers can map them without string-matching.
3. All types use `type` (not `interface`) per `AGENTS.md`.
4. No dependency on i18n, storage, Electron, or any framework: the engine can
   run inside a Vitest project without additional setup.
5. Tests live under `tests/unit/ma/` with at least 30 known-answer cases and
   monotonicity checks. Coverage target ≥ 90% for the `valuation/` directory.

## Migration path to `packages/ma-core/`

When `0003-turborepo-monorepo-migration` is accepted, the entire
`src/common/ma/valuation/` directory moves verbatim to
`packages/ma-core/src/valuation/`, with zero behavioural change: only the
import path shifts from `@/common/ma/valuation` to `@largo/ma-core/valuation`.
Tests are expected to move unchanged.

## Consequences

- **Positive.** Unblocks Phase 1 valuation work without waiting on the
  monorepo migration.
- **Positive.** Pure, process-agnostic placement matches existing `src/common/`
  usage; the Critic subagent import-graph rule holds.
- **Positive.** Clear, narrow public API via `src/common/ma/valuation/index.ts`.
- **Negative.** A future rename is required when monorepo lands; mitigated by a
  single public import path (re-exported from `index.ts`).
- **Neutral.** Benchmarks and sector multipliers are shipped as in-code
  defaults. A future ADR will move them into an SQLite-backed `comparables`
  table (Phase 4 — _Comparables_ database).
