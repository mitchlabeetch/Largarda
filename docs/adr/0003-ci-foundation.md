# ADR 0003 — CI Foundation (GitHub Actions)

- **Status:** Accepted
- **Date:** 2026-04-17
- **Deciders:** Largo Engineering (Completer pass 1)

## Context

Until this pass, the repository had no `.github/workflows/` directory even
though `ROADMAP.md` § 0.1 makes CI a P0 deliverable of Phase 0 and the
Orchestrator brief requires every merge to be gated by an automated pipeline.

The brief explicitly states that the quality gate is:

> lint + typecheck + format + unit + integration + e2e-smoke + app-boot-smoke
>
> - perf-delta + a11y-delta + i18n-gate + Critic-subagent

This ADR covers the first iteration of that pipeline, scoped to what is
trivially green today, with a clear roadmap for the remaining checks.

## Decision

1. Introduce two workflows:
   - `.github/workflows/ci.yml` — runs on every push to `main` and every PR.
     Jobs:
     - `lint` — `bun run lint` + `bun run format:check`.
     - `typecheck` — `bunx tsc --noEmit`.
     - `i18n` — `bun run i18n:types` + `node scripts/check-i18n.js`.
     - `test` — `bunx vitest run --coverage`, uploads `coverage/` as artifact.
     - `build-webui` — `bun run build:renderer:web` + `bun run build:server`,
       uploads the build artifacts for downstream Docker smoke.
   - `.github/workflows/docker.yml` — runs when the Dockerfile or server
     sources change. Builds the VPS-targeted image and performs a
     `curl`-based boot smoke test.
2. Jobs use `oven-sh/setup-bun@v2` for Bun parity with local development.
3. Concurrency groups cancel in-progress runs on the same ref to keep the CI
   queue healthy.
4. Coverage thresholds remain at `0` until Phase 0's coverage ramp-up
   completes; this ADR does not set numerical thresholds to avoid blocking
   unrelated work while `0.2 — Test Coverage to 80%+` is in flight.

## Not yet in scope (future ADRs)

The following remain open items to be tackled in subsequent passes:

- `0004-release-pipeline` — signed desktop builds, notarization, auto-update.
  Out of scope for the webapp focus of this phase.
- `0005-e2e-smoke-in-ci` — Playwright + xvfb on CI runners.
- `0006-perf-and-a11y-gates` — Vitest bench and axe-core gate deltas.
- `0007-secret-scanning-and-dependency-audit` — Gitleaks + Semgrep + Dependabot.

## Consequences

- **Positive.** Every PR is now gated by the four checks that block the bulk of
  regressions today (lint, typecheck, i18n, tests) plus a webapp build.
- **Positive.** Docker workflow proves the VPS deployment path remains
  buildable and bootable on every relevant change.
- **Positive.** Artifacts are uploaded on every run, enabling Critic to inspect
  coverage deltas without re-running the suite.
- **Negative.** Some quality gates from the Orchestrator brief (perf-delta,
  a11y-delta, e2e-smoke) are deferred to follow-up ADRs; called out explicitly
  above so the next Completer can pick them up.
