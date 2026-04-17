# ADR 0001 — Adopt Architecture Decision Records

- **Status:** Accepted
- **Date:** 2026-04-17
- **Deciders:** Largo Engineering (Completer pass 1)

## Context

The v2.0 roadmap calls for numerous cross-cutting decisions (monorepo, Drizzle
ORM, Zod-typed IPC, Zustand stores, SQLCipher, SSO, VDR, etc.). Without a
durable decision log, rationale is scattered between PR bodies, chat messages,
and code comments.

`AGENTS.md` and `ROADMAP.md` already require an ADR "for every non-trivial
feature". This ADR formalises the practice and creates the target directory.

## Decision

1. All non-trivial architectural decisions **must** be captured in
   `docs/adr/NNNN-<slug>.md`, numbered monotonically.
2. Each ADR follows the structure:
   - **Status** — Proposed / Accepted / Superseded / Deprecated
   - **Date** — ISO-8601
   - **Context** — the forces at play
   - **Decision** — the choice and its constraints
   - **Consequences** — positive, negative, neutral
3. ADRs are immutable once accepted: changes arrive as a new ADR that links back
   to the superseded record.
4. The Critic subagent blocks merges that introduce architectural changes
   without an accompanying ADR.

## Consequences

- **Positive.** Long-term decisions are discoverable; new contributors can
  audit the "why" behind structural choices.
- **Positive.** Forces authors to articulate trade-offs before shipping.
- **Negative.** Small amount of overhead per change; mitigated by keeping ADRs
  short (1 page max for most decisions).

## References

- `ROADMAP.md` § 10 ("Documentation") calls out `docs/adr/` as the home for
  ADRs.
- `AGENTS.md` `DON'Ts` — "Don't ship a feature without fr-FR translations and
  an ADR".
