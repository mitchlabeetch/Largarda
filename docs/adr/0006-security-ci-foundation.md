# ADR 0006: Security CI foundation (Gitleaks, Semgrep, Dependabot)

Status: Accepted
Date: 2026-04-17
Deciders: Completer pass 3 (Orchestrator swarm — Platform / Security)

## Context

ROADMAP § 0 / Phase 0 requires Dependabot, Gitleaks, and Semgrep as part
of the automated merge gate. Pass 1 introduced the `ci.yml` and
`docker.yml` workflows but explicitly deferred the security pipeline
(see ADR 0003 "Not yet in scope"). Pass 2 flagged
`.github/workflows/security.yml` as the #7 priority for the next pass.
Shipping the security pipeline now unblocks Phase 1 features that must
ship behind a secret-scan gate (SIRENE / Pappers MCP servers will carry
API credentials whose plaintext commit must be rejected before it
reaches `main`).

## Decision

Introduce a standalone `Security` workflow, independent of the `CI`
workflow, scanning secrets, source (SAST) and dependencies. Run it on
every push and pull request targeting `main`, plus a weekly cron at
Monday 03:00 UTC to re-scan quiet branches.
Tools selected:

- **Gitleaks** (`gitleaks/gitleaks-action@v2`). Full-history secret
  scanning. Failing the job blocks merges; Gitleaks writes a summary
  comment on the PR.
- **Semgrep** (`semgrep/semgrep-action@v1`). Curated rulesets:
  `p/owasp-top-ten`, `p/typescript`, `p/javascript`, `p/secrets`. We
  intentionally stay on community rulesets to avoid introducing a paid
  dependency before the M&A features are public.
- **`bun audit --audit-level=high`**. Runs with `|| true` today because
  `bun audit` is still advisory; we track blocking upgrades via
  Dependabot below. Upgrade plan: once Bun 2.0 lands the new advisory
  format, flip this step to a hard fail.
  Introduce `.github/dependabot.yml` covering three ecosystems:
- `npm` — weekly, grouped minor + patch updates, dedicated
  `chore(deps)` commit prefix, 10-PR cap.
- `github-actions` — weekly, `chore(actions)` prefix.
- `docker` — weekly, `chore(docker)` prefix. Needed because the VPS
  deployment path (ROADMAP: "FOCUS ON VPS DOCKER DEPLOYMENT") pins
  upstream base-image digests in `Dockerfile`.
  All three use the same Monday 04:00 Europe/Paris slot to cluster review
  load on Tuesday mornings.

## Consequences

Positive:

- Any secret committed by mistake (API key, token, certificate) is
  caught before merge. SIRENE / Pappers API keys are now safe to
  design around.
- Semgrep catches a baseline of SSRF, XSS, command-injection, and
  unsafe-deserialisation patterns typical in the webapp and the MCP
  servers about to be added.
- Dependabot produces predictable weekly maintenance windows, and the
  grouped minor+patch rule means one PR per week for routine updates
  rather than one per package.
- The pipeline runs in parallel with the existing `CI` and `Docker`
  workflows — no added latency on the critical path.
  Negative / watch items:
- `semgrep-action` uses community rulesets pinned by tag. If a ruleset
  is deprecated we'll need to update this ADR. Mitigation: the weekly
  cron surfaces breakage within 7 days of it appearing.
- `bun audit` will stay advisory until the Bun team stabilises the
  exit-code contract. Dependabot is the authoritative path for blocking
  vulnerable dependencies in the meantime.
- Grouped Dependabot PRs can balloon when many small packages publish
  on the same day. The `open-pull-requests-limit: 10` cap keeps the
  queue bounded.

## Alternatives considered

- **CodeQL instead of Semgrep.** CodeQL produces higher-quality
  findings for TypeScript but the setup, database, and analysis steps
  roughly triple the CI runtime compared to Semgrep. We may add CodeQL
  as a nightly-only workflow in a future pass once the hot-path runtime
  budget is under control.
- **Snyk / Socket for dependencies.** Both are SaaS with paid tiers;
  we defer them until Phase 5 (Enterprise), when compliance needs
  warrant the cost.
- **Single `security.yml` job versus three parallel jobs.** Splitting
  into parallel jobs minimises wall-clock time and lets the merge gate
  block only on the specific check that failed.

## Links

- Pass 2 handoff — priority #7 "`.github/workflows/security.yml`"
- ADR 0003 (CI foundation) — deferred this pipeline
- ROADMAP § 0 / Phase 0 — Security as a P0 quality gate
