# Completer Pass 1 — Handoff

- **Branch:** `track/completer/phase0-valuation-engine`
- **Parent of work:** `main` @ `50411cd5` (Merge PR #4 — add completer agent skill)
- **Date:** 2026-04-17
- **Scope:** Phase 0 foundation (CI + ADRs + i18n `ma` module) and the first
  piece of Phase 1 (ROADMAP § 1.3 — Enhanced Valuation Engine).

## Ground state at start

No `pass-file-*.md` existed — I am the first Completer. On inspection, the
repository had:

- No `.github/workflows/` directory despite ROADMAP § 0.1 making CI a P0.
- No `docs/adr/` directory despite the Orchestrator brief requiring an ADR per
  non-trivial change.
- No M&A valuation engine (§ 1.3 — zero code), no SIRENE / Pappers MCP, no
  deal pipeline, no Drizzle, no `ma` i18n module, and a vanilla `Dockerfile`
  that already produces the VPS webapp image.
- 267 files under `tests/unit/` using a flat layout, Vitest 4 with `node`
  and `dom` projects (see `vitest.config.ts`).
- `src/common/` already established as the process-agnostic home for pure
  logic. This is where the valuation engine went.

## What this pass ships

### 1. M&A Valuation Engine — ROADMAP § 1.3

Located at `src/common/ma/valuation/` with a single public API surface via
`index.ts`:

- `dcf.ts` — 5-year DCF with Gordon-Shapiro terminal value, WACC discount,
  optional `cashFlowSeriesOverride` for non-flat projections, optional
  `netDebt` for equity-value derivation. Exhaustive validation surfaced as
  `DcfValidationError`.
- `multiples.ts` — EV/EBITDA, EV/Revenue, P/E with caller-supplied benchmarks.
  Net-debt bridge applied only on EV-side metrics; P/E stays equity-side.
  Aggregate range (envelope of lows & highs across usable metrics).
- `anr.ts` — _Actif net réévalué_ from book equity plus a list of revaluation
  adjustments.
- `ruleOfThumb.ts` — ships 8 default sector rules (`pharmacie`, `restaurant`,
  `boulangerie`, `cabinet_expertise_comptable`, `agence_immobiliere`,
  `salon_coiffure`, `ecommerce`, `saas`). Callers can override with a custom
  `RuleOfThumbRule`.
- `sensitivity.ts` — 1-axis sweep on `wacc`, `growthRate`, or
  `terminalGrowthRate`. Feeds tornado charts downstream.
- `footballField.ts` — aggregates multiple `ValuationRange` into a single
  overall envelope.
- `types.ts` — readonly `type`s (per AGENTS.md "prefer `type` over
  `interface`").

**Constraints honoured.** Pure TS; no Electron, Node-only, or DOM imports. No
dependency on i18n. All functions are deterministic and side-effect-free, so
they run unchanged in main / renderer / worker processes.

**Tests.** 40 Vitest unit tests under `tests/unit/ma/`:

- `valuationDcf.test.ts` — 12 tests (known-answer terminal value, monotonicity
  in WACC and growth, validation failures).
- `valuationMultiples.test.ts` — 9 tests (net-debt bridge behaviour per
  metric, benchmark validation, currency override).
- `valuationSupport.test.ts` — 19 tests (ANR, rule-of-thumb defaults + custom
  override, sensitivity monotonicity across all three axes, football-field
  envelope + validation).

All pass in ~45 ms. See ROADMAP § 1.3's target of "30+ tests with known-answer
test cases" — achieved with 40.

### 2. `ma` i18n module — ROADMAP § 0.3 / 1.4

- Full French (`fr-FR`) translations for valuation methods, fields, results,
  sensitivity labels, sector names, company-profile labels, and the 8-stage
  deal pipeline (Origination → Teaser → NDA → IM → LOI → DD → SPA → Closing).
- Full English (`en-US`) translations.
- Stub copies of `en-US/ma.json` placed in the 7 other locales (`zh-CN`,
  `zh-TW`, `ja-JP`, `ko-KR`, `tr-TR`, `ru-RU`, `uk-UA`). **Next pass must
  machine-translate these.**
- `src/common/config/i18n-config.json` updated to list `"ma"` as the 20th
  module.
- All 9 locale `index.ts` files now import and export `ma`.
- `src/renderer/services/i18n/i18n-keys.d.ts` regenerated via
  `bun run i18n:types` — green.
- `node scripts/check-i18n.js` reports **PASS** (only unrelated pre-existing
  `settings.wecom.*` warnings remain).

### 3. CI foundation — ROADMAP § 0.1

- `.github/workflows/ci.yml` with five parallel jobs: `lint`, `typecheck`,
  `i18n`, `test` (`bunx vitest run --coverage`, uploads `coverage/`), and
  `build-webui` (builds `out/renderer` + `dist-server` and uploads them).
  Concurrency groups cancel superseded runs.
- `.github/workflows/docker.yml` builds the `largo-webapp:ci` image from the
  existing `Dockerfile` and performs a 30-second `curl` boot smoke on port 3000.
- Jobs use `oven-sh/setup-bun@v2` + `actions/setup-node@v4`.
- Release workflow deliberately omitted for now — see ADR 0003's "Not yet in
  scope" section for the queue (release signing, Playwright in CI, perf-delta,
  a11y-delta, dep audit / secret scanning).

### 4. Architecture Decision Records

- `docs/adr/0001-architecture-decision-records.md` — introduces the ADR
  process, required structure, immutability rule, and Critic enforcement.
- `docs/adr/0002-valuation-engine-placement.md` — documents why the engine
  lives at `src/common/ma/valuation/` today and how it migrates to
  `packages/ma-core/` when the monorepo ADR lands.
- `docs/adr/0003-ci-foundation.md` — documents this pass's CI/Docker
  workflows and lists the deferred gates.

### 5. CHANGELOG

- New `CHANGELOG.md` opened with an "Unreleased — towards v1.10.0" section
  covering this pass.

## Gate results on this branch

| Gate                                      | Result                                               |
| ----------------------------------------- | ---------------------------------------------------- |
| `bunx oxlint src/common/ma tests/unit/ma` | 0 warnings, 0 errors                                 |
| `bunx oxfmt --check` on changed files     | clean                                                |
| `bunx tsc --noEmit`                       | clean                                                |
| `node scripts/generate-i18n-types.js`     | clean (types unchanged after regen on a clean apply) |
| `node scripts/check-i18n.js`              | PASS (pre-existing `settings.wecom.*` warnings only) |
| `bunx vitest run tests/unit/ma`           | 47/47 (40 valuation + 7 incidentally matched)        |

Note: the full `vitest run` over the 267-file suite was not attempted in this
pass because many existing tests depend on Electron/node-pty/sqlite native
modules that are not built in the sandbox (`bun install --ignore-scripts`).
The CI workflow added in this pass runs the full suite with coverage on
GitHub-hosted runners.

## What the next Completer should do

In priority order, small enough to fit a single pass each:

1. **Machine-translate** `ma.json` in `zh-CN`, `zh-TW`, `ja-JP`, `ko-KR`,
   `tr-TR`, `ru-RU`, `uk-UA`. The stub currently contains English.
2. **Wire Sentry + OTel scaffolds** (ROADMAP § 1.7) — `@sentry/electron` is
   already a dependency but there is no central init module.
3. **SIRENE MCP server** (ROADMAP § 1.1). The `src/process/services/mcpServices/`
   directory already hosts MCP code; adding `sirene/` with SQLite-cached
   lookup + 15 integration tests is a well-scoped pass.
4. **Unified company profile schema** (ROADMAP § 1.5) can sit in
   `src/common/ma/company/` mirroring this pass's valuation layout.
5. **Drizzle dual-run** (ROADMAP § 0/1 P1) — introduce Drizzle behind a
   feature flag without migrating existing raw SQL yet.
6. **ADR 0004 release pipeline** is deferred per the Orchestrator's "FOCUS ON
   VPS DOCKER DEPLOYMENT" directive, but Dependabot + Gitleaks + Semgrep can
   be added now as `.github/workflows/security.yml`.

## Open risks and knowns

- `tests/unit/` is already at 267 files — the ≤10 children AGENTS.md rule is
  not enforced there. I added new tests to a `tests/unit/ma/` subfolder to
  start the drift-down. Do the same for future feature tests.
- `oxfmt` rewrote markdown in ADRs and CHANGELOG during the format pass; re-
  running the tool is idempotent but worth a re-check after any manual edits.
- The valuation engine ships without i18n error messages — error classes carry
  English strings for now. A small mapper from `*.ValidationError` to `ma.*`
  keys should be added in the renderer before exposing the engine to users.
- `build-webui` job relies on the pre-existing `bun run build:renderer:web`
  and `bun run build:server` scripts; they execute cleanly in local runs but
  have not been exercised on a cold GHA runner yet — first green run will
  confirm.

## Files added or touched in this pass

```
.github/workflows/ci.yml                                              (new)
.github/workflows/docker.yml                                          (new)
CHANGELOG.md                                                           (new)
docs/adr/0001-architecture-decision-records.md                         (new)
docs/adr/0002-valuation-engine-placement.md                            (new)
docs/adr/0003-ci-foundation.md                                         (new)
pass-file-1.md                                                         (new)
src/common/config/i18n-config.json                                     (edit: +ma)
src/common/ma/valuation/anr.ts                                         (new)
src/common/ma/valuation/dcf.ts                                         (new)
src/common/ma/valuation/footballField.ts                               (new)
src/common/ma/valuation/index.ts                                       (new)
src/common/ma/valuation/multiples.ts                                   (new)
src/common/ma/valuation/ruleOfThumb.ts                                 (new)
src/common/ma/valuation/sensitivity.ts                                 (new)
src/common/ma/valuation/types.ts                                       (new)
src/renderer/services/i18n/i18n-keys.d.ts                              (regen)
src/renderer/services/i18n/locales/{9 langs}/index.ts                  (edit: +ma)
src/renderer/services/i18n/locales/{9 langs}/ma.json                   (new)
tests/unit/ma/valuationDcf.test.ts                                     (new)
tests/unit/ma/valuationMultiples.test.ts                               (new)
tests/unit/ma/valuationSupport.test.ts                                 (new)
```
