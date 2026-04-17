# ADR 0004 — Unified Company Profile Merge Rules

- **Status:** Accepted
- **Date:** 2026-04-17
- **Deciders:** Largo Engineering (Completer pass 2)

## Context

ROADMAP § 1.5 requires a single **unified company profile** that stitches
together data returned by the INSEE SIRENE API (authoritative registration
record) and Pappers (legal, financial and governance overlay). Downstream UI
(company profile card, comparison, search page) must be able to display the
**source** of every piece of data so users can reason about provenance.

The two upstream sources overlap on a subset of fields — legal name, legal
form, NAF code, head-office address — and disagree regularly (SIRENE keeps
the terse registered legal name like `"RENAULT"`, Pappers often exposes the
commercial name `"RENAULT SA"`). The profile must resolve those conflicts
predictably so neither the UI nor downstream agents have to rediscover the
rule every time.

Placement follows ADR 0002: the merge logic is pure TypeScript under
`src/common/ma/company/`, process-agnostic, importable from main, renderer
and future workers. It does **not** issue HTTP requests; it accepts already-
fetched payloads from caller-owned MCP servers (SIRENE / Pappers).

## Decision

1. A single `mergeCompanyProfile({ sirene, pappers })` function in
   `src/common/ma/company/merge.ts` returns a `CompanyProfile` object
   whose every optional field carries its own `SourceAttribution`
   (`source` + `fetchedAt`).

2. **Field ownership rules.**
   - Identifier floor: `identifiers.siren` is mandatory and must match
     across payloads when both are supplied; a mismatch throws
     `CompanyProfileMergeError`.
   - SIRENE wins on registration facts: `legalName`, `legalForm`,
     `nafCode`, `headOfficeAddress`, `workforce`, `incorporationYear`,
     `tradeName`. Pappers fills the gap only if SIRENE is silent.
   - Pappers owns governance and financials: `directors`,
     `beneficialOwners`, `shareCapital`, `latestFinancials`,
     `inCollectiveProceeding`, `vatNumber`.

3. **Validation.**
   - SIREN: exactly 9 digits (regex `^\d{9}$`).
   - SIRET (when supplied): exactly 14 digits.
   - At least one payload must be provided; otherwise throw.
   - Pappers-only payload without `legalName` throws.

4. **Source tracking.**
   - Every `SourcedValue<T>` wraps its value with the contributing source.
   - The top-level `sources` array lists every payload that contributed,
     de-duplicated by `source + fetchedAt`, ordered SIRENE → Pappers.

5. **Sector augmentation.**
   - Sector resolution is **not** performed during merge (it would couple
     the company module to the sector catalogue). Consumers attach it via
     `resolveProfileSector(profile)`, which returns the `SectorResolution`
     from `src/common/ma/sector/` based on `profile.nafCode`.

6. **Error surface.**
   - Errors raise `CompanyProfileMergeError` with English messages —
     the renderer maps them to `ma.errors.*` i18n keys before display.

## Consequences

- **Positive.** Deterministic resolution rules mean both agents and UI can
  predict which source will win for any given field without re-reading the
  merge code.
- **Positive.** The module is pure and can be unit tested with fixtures
  — no network, no SQLite, no Electron.
- **Positive.** Source attribution enables the UX requirement of badges
  next to each field (`Source: SIRENE 2026-04-17`).
- **Neutral.** Adding a new upstream (Infogreffe, Bodacc, RCS) requires an
  ADR supplement but is additive: extend `ProfileSource`, extend
  `MergeInputs`, prepend a new ownership rule. The shape of
  `CompanyProfile` does not change.
- **Negative.** We do not attempt to reconcile **conflicting directors**
  between SIRENE and Pappers — SIRENE does not publish directors, so in
  practice this is a non-issue today. A follow-up ADR will address the case
  when Infogreffe (which does publish directors) joins the merge.
