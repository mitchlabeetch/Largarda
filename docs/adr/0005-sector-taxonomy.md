# ADR 0005 — M&A Sector Taxonomy & NAF rev. 2 Mapping

- **Status:** Accepted
- **Date:** 2026-04-17
- **Deciders:** Largo Engineering (Completer pass 2)

## Context

Several downstream features need to classify a company by **sector**:

- The valuation engine picks a rule-of-thumb multiplier (e.g. pharmacies are
  valued as a multiple of _chiffre d'affaires_).
- The assistant presets emit sector-aware prompts (a teaser for a SaaS
  company reads differently from one for a bakery).
- The Phase 4 analytics dashboard aggregates pipeline value by sector.

INSEE NAF rev. 2 (effective 2008, updated 2020) is the authoritative French
activity code nomenclature, but:

- It has 732 classes — far too many as UI choices or prompt axes.
- Its organisation is industrial-heritage-first (Section A–U), which does
  not match an M&A advisor's mental model.

We need a **curated intermediate taxonomy** mapped onto NAF prefixes.

## Decision

1. Introduce `MaSector` — a finite, enumerated taxonomy of **31** sectors
   tailored to mid-market French M&A (the set ROADMAP § 1.6 calls out).
   The enumeration is a TypeScript union so the compiler catches new
   sector additions at every call site.

2. Each `MaSector` carries:
   - `id` — stable slug, never renamed (used as a translation key).
   - `labelFr` / `labelEn` — human labels (bundled strings; the full i18n
     module continues to live in `ma.sectors.*`).
   - `nafPrefixes` — one or more NAF prefixes, matched left-anchored.
     Prefixes may be divisions (`"46"`), classes (`"47.73"`) or class
     letters (`"10.71D"`).
   - `ruleOfThumb` — optional link to one of the
     `RuleOfThumbSector` keys used by `valuation/ruleOfThumb.ts`.

3. **Resolution rule.** `resolveSectorFromNaf(nafCode)` returns the
   sector whose **longest** matching prefix wins. Ties do not occur in
   practice because the catalogue is curated for left-anchored uniqueness.
   Unknown codes fall back to the reserved `'other'` sector.

4. **Fallback contract.** The function _always_ returns a `SectorResolution`
   — callers never have to handle `undefined`. `matchedPrefix` is `null`
   only for the `'other'` fallback.

5. The catalogue lives in `src/common/ma/sector/catalogue.ts` — a single
   file to keep directory fan-out low and to make diffs reviewable.

## Rejected alternatives

- **Expose raw NAF codes.** Rejected: 732 classes is too many to render in
  a dropdown and many codes carry no valuation meaning.
- **Use a third-party taxonomy (ICB/GICS).** Rejected: those are public-
  markets-flavoured and weakly fit French small-and-mid-cap reality (no
  _pharmacie_, no _cabinet d'expertise comptable_).
- **Store the catalogue in SQLite.** Rejected for now: the data is static,
  small and needs to run in the renderer. It belongs in the bundle.

## Consequences

- **Positive.** A single `resolveSectorFromNaf` call is all the valuation
  engine and the assistant prompts need.
- **Positive.** Because the catalogue is data-driven, adding a sector is
  a one-line change plus localisation keys.
- **Positive.** The `ruleOfThumb` link lets the valuation engine derive
  defaults from sector-resolution output without duplicating the sector
  list.
- **Negative.** Two sectors (`software_saas` at `58.29` + `62.01`, and
  `ecommerce` at `47.91`) use the _longest prefix_ tiebreaker to override
  broader sectors (`media_publishing` division 58, `wholesale_retail`
  division 47). Any future sector addition inside those divisions must
  either extend the specific prefix list or accept the generic bucket.
- **Neutral.** The catalogue will need to be re-verified when INSEE
  publishes NAF rev. 3 (currently slated for 2026–2027). A follow-up ADR
  will address that migration.
