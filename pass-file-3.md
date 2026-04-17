# Completer Pass 3 — Handoff

- **Branch:** `track/completer/phase1-ma-i18n-security`
- **Parent of work:** `main` @ `d24a9719` (Merge PR #7 — phase 2 company +
  glossary refinement already landed).
- **Date:** 2026-04-17
- **Scope:** close out the two highest-priority follow-ups from pass 2 —
  (1) machine-translate the `ma` i18n module across the 7 non-FR/EN
  locales and (2) land the deferred security CI pipeline — plus the
  natural by-product of wiring every sector in the catalogue to an
  i18n key with a regression-proof test.

## Ground state at start

Pass 2 shipped the unified company profile, 31-entry sector catalogue
and the 80-entry glossary, but left two sharp follow-ups:

1. `ma.json` in `zh-CN`, `zh-TW`, `ja-JP`, `ko-KR`, `tr-TR`, `ru-RU`,
   `uk-UA` was literally the English stub — the file hash was
   byte-identical to `en-US/ma.json`. `node scripts/check-i18n.js`
   passed only because the schemas matched; the content was wrong.
2. The ROADMAP § 0 Phase 0 security gate was still missing — no
   Dependabot, no Gitleaks, no Semgrep. ADR 0003 explicitly deferred it
   to a future pass; pass 2 re-prioritised it as item #7.

In addition, `ma.sectors.*` only covered 8 of the 31 sector ids in the
catalogue. The valuation engine links to those 8, but the sector module
that wins M&A-grade NAF prefix resolution can return any of the 31 —
the missing 23 would have rendered as empty strings in the UI.

## What this pass ships

### 1. Full `ma` i18n coverage — ROADMAP § 0.3 / 1.4 (pass 2 follow-up #1)

- Rewrote every `ma.json` payload through a single generator
  (`/tmp/gen_ma_locales.py`, temporary — not committed) so all 9
  locales share the exact shape, field order, and ICU placeholders
  (`{{sector}}`, `{{basis}}`), and the 7 non-FR/EN files now carry
  native-script translations of:
  - 4 valuation method labels (DCF, multiples, ANR, rule-of-thumb),
  - 11 field labels (WACC, growth, terminal growth, projection years,
    base FCF, net debt, revenue, EBITDA, net income, total assets,
    total liabilities),
  - 9 result labels (enterprise value, equity value, terminal value,
    projected / discounted cash flows, range, central, low, high),
  - 5 sensitivity labels + 2 football-field labels,
  - 7 validation error strings (preserving the `{{sector}}` /
    `{{basis}}` placeholders byte-for-byte),
  - 11 company-profile labels,
  - 8 deal-stage labels (with `NDA` / `SPA` kept as invariant
    abbreviations everywhere),
  - 13 glossary labels (UI title, search placeholder, empty state,
    related-terms heading, 8 category names).
- Locales covered in native script: `zh-CN` (Simplified Chinese),
  `zh-TW` (Traditional Chinese), `ja-JP` (Japanese, mixed kanji +
  katakana), `ko-KR` (Korean Hangul), `tr-TR` (Turkish with FAVÖK /
  Özsermaye / Kurumsal yönetim), `ru-RU` (Russian Cyrillic), `uk-UA`
  (Ukrainian Cyrillic).
- For `ru-RU` / `uk-UA` a handful of internationally-invariant labels
  (`Origination`, `Due diligence`, `Closing`) are kept in English on
  purpose — these are the industry-standard terms in Russian- and
  Ukrainian-language M&A materials.

Gate after the sweep:
`node scripts/check-i18n.js` reports "✅ {lang} translations are
complete" for every non-reference locale. Only pre-existing
`settings.wecom.*` literal-key warnings remain (unrelated to this
pass).

### 2. Complete sector i18n set — ROADMAP § 1.5 / 1.6

- `ma.sectors.*` grew from the 8 rule-of-thumb sectors to all 31 ids
  from `src/common/ma/sector/catalogue.ts` (`agriculture` …
  `other`), in every one of the 9 locales.
- `src/renderer/services/i18n/i18n-keys.d.ts` regenerated — `I18nKey`
  now includes the 23 new `ma.sectors.*` members.

### 3. Sector i18n contract test

- `tests/unit/ma/sectorI18n.test.ts` imports the catalogue and the 9
  `ma.json` payloads and asserts two invariants per locale:
  1. every `SECTORS[i].id` has a non-empty string translation;
  2. every key in `payload.sectors` maps back to a catalogue id — no
     stray entries.
- Also checks that the test file's locale list equals
  `i18nConfig.supportedLanguages` so a future locale addition fails
  fast instead of silently skipping the check.
- 20 new assertions (1 config sanity + 9 × 2 per-locale).

### 4. Security CI foundation — ROADMAP § 0.1 (pass 2 follow-up #7)

- `.github/workflows/security.yml` — standalone workflow with three
  parallel jobs triggered on push, PR and a weekly Monday 03:00 UTC
  cron:
  - `gitleaks` via `gitleaks/gitleaks-action@v2` on the full history;
  - `semgrep` via `semgrep/semgrep-action@v1` with the curated
    `p/owasp-top-ten`, `p/typescript`, `p/javascript`, `p/secrets`
    rulesets;
  - `audit` running `bun install --ignore-scripts` then
    `bun audit --audit-level=high || true` — advisory today, see ADR
    0006 for the escalation path.
- `.github/dependabot.yml` covering three ecosystems (`npm` grouped
  minor+patch with 10-PR cap, `github-actions`, `docker`) on the same
  Monday-04:00-Europe/Paris slot with dedicated Conventional Commit
  prefixes (`chore(deps)`, `chore(actions)`, `chore(docker)`).
- `docs/adr/0006-security-ci-foundation.md` — full ADR: context
  (ROADMAP § 0), decision (tool matrix + rationale), consequences
  (positive + watch items) and rejected alternatives (CodeQL, Snyk,
  Socket, single-job vs parallel-jobs).

### 5. CHANGELOG

- New `Added (Completer pass 3)` section under the existing
  `Unreleased` block covering all of the above.

## Gate results on this branch

| Gate                                                              | Result                                                                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `oxlint src/common/ma tests/unit/ma` (v1.56.0)                    | 0 warnings, 0 errors (27 files, 128 rules)                                                                                |
| `oxfmt --check src/common/ma tests/unit/ma docs/adr CHANGELOG.md` | clean                                                                                                                     |
| `oxfmt --check src/renderer/services/i18n/i18n-keys.d.ts`         | clean (regenerated types)                                                                                                 |
| `tsc --noEmit` on touched paths                                   | 0 errors (pre-existing `src/server.ts` + `uno.config.ts` errors from unbuilt `node_modules` are unchanged)                |
| `node scripts/generate-i18n-types.js`                             | types up to date after regen                                                                                              |
| `node scripts/check-i18n.js`                                      | PASS — every locale reports "translations are complete"; only pre-existing `settings.wecom.*` literal-key warnings remain |

Vitest was not exercised in the sandbox (the wider suite still requires
`bun install` with native modules built). The CI workflow from pass 1
will run the new `sectorI18n.test.ts` suite on GitHub-hosted runners;
the test is small, deterministic and uses no native dependencies.

## What the next Completer should do

In priority order:

1. **Wire Sentry + OTel scaffolds** (ROADMAP § 1.7). `@sentry/electron`
   is already a dependency — add a common init module under
   `src/common/observability/` with an opt-in toggle and a no-op
   default, plus process-specific bootstrap helpers in `src/process/`
   and `src/renderer/services/`. Opt-in telemetry is a non-negotiable
   from the Orchestrator brief.
2. **SIRENE MCP server** (ROADMAP § 1.1). `src/process/services/mcpServices/`
   already hosts MCP code; adding `sirene/` with SQLite-cached lookup
   (24 h TTL per ROADMAP), rate-limit handling, fr-FR error messages,
   and ≥15 integration tests is the next well-scoped pass.
3. **Pappers MCP server** (ROADMAP § 1.1) mirroring the SIRENE layout,
   sharing the cache backend and reaching the ≥35-combined-tests bar
   called out in the ROADMAP.
4. **Glossary growth to 130** — roughly 50 new entries leaning into
   Phase-3 (CRM / communication) and Phase-5 (enterprise / compliance)
   terminology (sell-side auction, GDPR, AML/KYC cards, sanctions
   screening, VDR sub-terms).
5. **Drizzle dual-run** (ROADMAP § 0/1 P1) — introduce Drizzle behind
   a feature flag without migrating existing raw SQL yet. Start with
   the read side so the existing write paths stay untouched.
6. **fr-FR reference flip** — the ROADMAP mandates `fr-FR` as the
   reference locale; today `i18n-config.json` still lists `en-US`.
   Dedicated pass needed to flip it after confirming every module
   (not just `ma`) is 100% fr-FR complete.
7. **Observability in CI** — hook `Sentry source-map upload` into the
   build-webui job once the observability init module lands.

## Open risks and knowns

- **Machine translations.** The 7 non-FR/EN payloads were produced by
  this agent, not reviewed by native speakers. The strings are short
  enough (labels, not prose) that the risk is low, but the next
  Completer should wire a lightweight translation-review workflow —
  or an `i18n:` label on Dependabot-style PRs — before Largo is made
  available to non-FR customers. Track this in ROADMAP Phase 5.
- **`semgrep-action` community rulesets** are tag-pinned upstream. The
  weekly cron will surface breakage within 7 days; if a ruleset is
  deprecated, update ADR 0006.
- **`bun audit` is advisory** — Dependabot is the authoritative path
  for vulnerable-dependency blocking until Bun 2.0 stabilises the
  exit-code contract. ADR 0006 documents the upgrade plan.
- **Pass-2 oxfmt churn warning** is gone: oxfmt-check was clean on
  every file touched in this pass before the commit.
- **`ru-RU` and `uk-UA` keep `Origination` / `Due diligence` /
  `Closing`** as English loan-words because that is current M&A
  practice in those markets. Revisit if native review flags it.

## Files added or touched in this pass

```
.github/dependabot.yml                                          (new)
.github/workflows/security.yml                                  (new)
CHANGELOG.md                                                     (edit: +pass 3 section)
docs/adr/0006-security-ci-foundation.md                          (new)
pass-file-3.md                                                   (new)
src/renderer/services/i18n/i18n-keys.d.ts                        (regen)
src/renderer/services/i18n/locales/en-US/ma.json                 (edit: +23 sector keys)
src/renderer/services/i18n/locales/fr-FR/ma.json                 (edit: +23 sector keys)
src/renderer/services/i18n/locales/ja-JP/ma.json                 (rewrite: native translation)
src/renderer/services/i18n/locales/ko-KR/ma.json                 (rewrite: native translation)
src/renderer/services/i18n/locales/ru-RU/ma.json                 (rewrite: native translation)
src/renderer/services/i18n/locales/tr-TR/ma.json                 (rewrite: native translation)
src/renderer/services/i18n/locales/uk-UA/ma.json                 (rewrite: native translation)
src/renderer/services/i18n/locales/zh-CN/ma.json                 (rewrite: native translation)
src/renderer/services/i18n/locales/zh-TW/ma.json                 (rewrite: native translation)
tests/unit/ma/sectorI18n.test.ts                                 (new, 19 new assertions)
```
