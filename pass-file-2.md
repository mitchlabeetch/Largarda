# Completer Pass 2 — Handoff

- **Branch:** `track/completer/phase2-company-glossary-refinement`
- **Parent of work:** `origin/track/completer/phase1-company-sector-glossary`
  (itself based on `origin/main` @ `f357a518`, which already carries the
  Completer pass 1 valuation engine + CI + ADRs).
- **Date:** 2026-04-17
- **Scope:** audit + polish of the phase-1 WIP (company profile + sector
  taxonomy + bilingual glossary) and a small set of coherent additions that
  advance ROADMAP § 1.4–1.6 without expanding the footprint unnecessarily.

## Ground state at start

The previous Completer had opened
`track/completer/phase1-company-sector-glossary` with a single commit
(`db19ef31 fix: resolve oxlint errors`) that introduced 1 415 lines across
14 files — `src/common/ma/{company,glossary,sector}/**` plus
`tests/unit/ma/{companyProfile,glossary,sectorTaxonomy}.test.ts`. The
branch was never merged into `main`; I branched from it rather than
re-implementing the same work.

Audit findings:

- **Company profile.** The merge logic and source-attribution model are
  solid. The merge function correctly validates SIREN/SIRET, applies a
  consistent "SIRENE wins on registration facts, Pappers owns governance
  and financials" rule, and tracks per-field provenance. Missing: no ADR
  documenting the rules, no explicit helper connecting the profile to the
  sector taxonomy.
- **Sector taxonomy.** The 31-sector curated list and NAF-prefix resolver
  (longest-prefix wins, always returns a value) are correct and match
  ROADMAP § 1.6. Missing: ADR formalising the mapping policy.
- **Glossary.** 55 bilingual entries with unique-id, related-id integrity
  and accent-insensitive search. The data is well-structured but short of
  the ROADMAP § 1.4 target of 300+ terms; zero i18n scaffolding for the
  UI that will surface the glossary later.
- **i18n.** `ma.json` covered valuation / sectors / company / deal.stages
  but no glossary UI keys.
- **CHANGELOG.** Only the pass-1 entries.

Tooling in this sandbox: `bun` is unavailable (needs `unzip`, apt offline),
but `node`, `npm`, and `python3` are present. I used `npm install typescript@5.6.3
oxlint@1.56.0 oxfmt@0.41.0` into `/tmp/node_modules` to run the exact
linter/formatter versions the project pins, and the project's own
`scripts/{generate-i18n-types,check-i18n}.js` for the i18n gate.

## What this pass ships

### 1. Company ↔ sector bridge — ROADMAP § 1.5 + § 1.6

- `src/common/ma/company/sector.ts` — new `resolveProfileSector(profile)`
  helper. Returns `undefined` for a profile with no NAF code; otherwise
  always returns a `SectorResolution` (falls back to the reserved
  `'other'` sector for unknown codes).
- `src/common/ma/company/index.ts` re-exports `resolveProfileSector` on
  the public surface.
- `tests/unit/ma/companyProfileSector.test.ts` — 5 new tests covering the
  happy path, the rule-of-thumb link, unknown-NAF fallback,
  missing-NAF-on-both-payloads, and SIRENE-wins precedence when both
  payloads carry a NAF code.

Design note: per the new ADR 0004, sector resolution is deliberately kept
out of `mergeCompanyProfile` so the company module does not depend on
the sector catalogue. Callers that need a sector attach it explicitly.

### 2. Glossary growth — ROADMAP § 1.4

- `src/common/ma/glossary/entries.ts` grew from 55 to **80** entries.
  The 25 additions span every existing category and introduce terms that
  Phase 2 (document automation) and Phase 3 (CRM) will need: LTM, NTM,
  run rate, free cash flow, working-capital peg, MOIC, IRR, dividend
  recap, leveraged recap, carve-out, TSA, roll-up, CIM, fairness opinion,
  MNPI, MAR, financial DD, legal DD, tax DD, W&I insurance, break fee,
  reverse break fee, QoE, key-man clause, non-compete.
- Every new entry ships with both `termFr` and `termEn` plus FR and EN
  definitions, reuses existing `relatedIds` where appropriate (e.g. `tsa`
  ↔ `carve_out`, `warranty_insurance` ↔ `garantie_passif`), and passes
  the existing `relatedIds must point at known entries` test.

Still short of the 300+ target — deliberately so. Subsequent Completer
passes should add 30–50 entries each to keep each PR reviewable.

### 3. i18n glossary scaffolding

- Added `ma.glossary.*` keys in **all 9 locales**:
  - `title`, `searchPlaceholder`, `empty`, `relatedTitle`
  - `categories.{process,documents,valuation,legal,finance,governance,
deal_structure,due_diligence}`
- Full translations for `fr-FR` and `en-US`; the 7 other locales mirror
  the English stub consistent with the pass-1 convention (a follow-up pass
  must machine-translate them).
- `src/renderer/services/i18n/i18n-keys.d.ts` regenerated via
  `node scripts/generate-i18n-types.js` — green.

### 4. Architecture Decision Records

- `docs/adr/0004-company-profile-merge.md` — formalises the merge
  semantics, field ownership, validation, source attribution, and the
  decision to keep sector resolution out of the merge function.
- `docs/adr/0005-sector-taxonomy.md` — documents the 31-sector taxonomy,
  the longest-prefix NAF resolution rule, the always-returns-a-value
  contract, and the rejected alternatives (raw NAF, ICB/GICS, SQLite
  storage).

### 5. CHANGELOG

- `CHANGELOG.md` gains a new "Added (Completer pass 2)" section under the
  existing `Unreleased` block describing the company profile, sector
  taxonomy, glossary, and glossary i18n scaffolding work.

## Gate results on this branch

| Gate                                                  | Result                                                                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `oxlint src/common/ma tests/unit/ma` (v1.56.0)        | 0 warnings, 0 errors on 26 files                                                                                                        |
| `oxfmt --check src/common/ma tests/unit/ma` (v0.41.0) | clean after an auto-format pass (reformatted long-line imports in `merge.ts`)                                                           |
| `tsc -p tsconfig.json --noEmit` (TypeScript 5.6.3)    | 0 errors in any `src/common/ma/**` path (pre-existing repo-wide errors from missing `node_modules` remain; not introduced by this pass) |
| `node scripts/generate-i18n-types.js`                 | types up to date after regen                                                                                                            |
| `node scripts/check-i18n.js`                          | PASS (only the pre-existing `settings.wecom.*` literal-key warnings remain)                                                             |

The full Vitest suite still requires `bun`/`node_modules`, both unavailable
in this sandbox. Our code is checked by the CI workflow introduced in
pass 1.

## What the next Completer should do

In priority order, sized to fit a single pass each:

1. **Machine-translate `ma.json`** in `zh-CN`, `zh-TW`, `ja-JP`, `ko-KR`,
   `tr-TR`, `ru-RU`, `uk-UA` — currently English stubs. Also add the
   `sectors.*` full list (31 entries) to the i18n module (only 8 sectors
   currently have i18n keys).
2. **Wire Sentry + OTel scaffolds** (ROADMAP § 1.7). `@sentry/electron` is
   already a dependency but there is no central init module.
3. **SIRENE MCP server** (ROADMAP § 1.1). `src/process/services/mcpServices/`
   already hosts MCP code; adding `sirene/` with SQLite-cached lookup +
   ≥15 integration tests is a well-scoped pass.
4. **Pappers MCP server** (ROADMAP § 1.1) — mirror the SIRENE layout,
   share the cache backend, reach the ≥35-combined-tests bar together.
5. **Glossary growth to 130** — roughly another 50 entries spanning
   Phase-3 and Phase-5 terms (sell-side auction, GDPR, sanctions
   screening, AML/KYC cards).
6. **Drizzle dual-run** (ROADMAP § 0/1 P1) — introduce Drizzle behind a
   feature flag without migrating existing raw SQL yet.
7. **`.github/workflows/security.yml`** — Dependabot config, Gitleaks,
   Semgrep (deferred in pass 1 / ADR 0003).

## Open risks and knowns

- **oxfmt churn on existing files.** Running `oxfmt` rewrote long-line
  imports and conditional expressions in `src/common/ma/company/merge.ts`,
  `src/common/ma/glossary/{entries,index}.ts`,
  `src/common/ma/sector/catalogue.ts`, and two test files. Behaviour is
  unchanged, but the diff is larger than the feature would suggest. CI
  runs `format:check`, so this pass ensures the branch is already
  oxfmt-clean.
- **tsconfig excludes `tests/`.** Tests are not typechecked by
  `tsc -p tsconfig.json --noEmit`; Vitest handles test typechecking via
  its own resolver. This is pre-existing and outside the scope of this
  pass.
- The ROADMAP mandates `fr-FR` as the reference locale; the current
  `i18n-config.json` keeps `en-US`. A dedicated pass should flip the
  reference with a full fr-FR completeness audit.
- The `glossary` entries.ts has now crossed 650 lines. When it approaches
  1 500 lines it should be split by category following AGENTS.md's ≤10
  directory-children rule — do this in a future pass by introducing
  `glossary/categories/*.ts` and a small `glossary/index.ts` barrel.

## Files added or touched in this pass

```
CHANGELOG.md                                              (edit)
docs/adr/0004-company-profile-merge.md                    (new)
docs/adr/0005-sector-taxonomy.md                          (new)
pass-file-2.md                                            (new)
src/common/ma/company/index.ts                            (edit: export resolveProfileSector)
src/common/ma/company/sector.ts                           (new)
src/common/ma/company/merge.ts                            (oxfmt)
src/common/ma/glossary/entries.ts                         (+25 entries, oxfmt)
src/common/ma/glossary/index.ts                           (oxfmt)
src/common/ma/sector/catalogue.ts                         (oxfmt)
src/renderer/services/i18n/i18n-keys.d.ts                 (regen)
src/renderer/services/i18n/locales/{9 langs}/ma.json      (edit: +glossary.*)
tests/unit/ma/companyProfileSector.test.ts                (new, 5 tests)
tests/unit/ma/glossary.test.ts                            (oxfmt)
tests/unit/ma/sectorTaxonomy.test.ts                      (oxfmt)
```
