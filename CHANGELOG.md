# Changelog

All notable changes to Largo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased] — towards v1.10.0 (Phase 0 / early Phase 1)

### Added

- **M&A valuation engine** (`src/common/ma/valuation/`): pure, process-agnostic
  modules for DCF (_Flux de trésorerie actualisés_), comparable multiples
  (EV/EBITDA, EV/Revenue, P/E), _Actif Net Réévalué_ (ANR), and sector
  rule-of-thumb, plus a sensitivity analysis helper and football-field
  aggregation. Covered by 40 unit tests under `tests/unit/ma/`.
- **`ma` i18n module** with full `fr-FR` and `en-US` translations for valuation
  fields, method labels, result labels, sector names, company profile labels,
  and the 8-stage M&A deal pipeline. Stub copies placed in the other 7
  locales, awaiting machine translation.
- **CI pipeline** (`.github/workflows/ci.yml`) running lint, format check,
  typecheck, i18n validation, Vitest (with coverage artifact), and a webapp
  build on every PR.
- **Docker CI** (`.github/workflows/docker.yml`) that builds the VPS-targeted
  webapp image and performs a container boot smoke test.
- **Architecture Decision Records** under `docs/adr/` — ADR 0001 introduces the
  ADR process itself, ADR 0002 documents the valuation-engine placement, ADR
  0003 documents the CI foundation.

### Changed

- `src/common/config/i18n-config.json` now lists the `ma` module.
- All 9 locale `index.ts` files register the `ma` module.
- `src/renderer/services/i18n/i18n-keys.d.ts` regenerated to include `ma.*`
  keys.

### Added (Completer pass 2)

- **Unified company profile** (`src/common/ma/company/`): pure `CompanyProfile`
  shape merging SIRENE and Pappers payloads with per-field source attribution,
  SIREN/SIRET validation, deterministic field ownership rules, and a
  `resolveProfileSector` bridge helper that connects a profile to the sector
  taxonomy without coupling the modules.
- **Sector taxonomy** (`src/common/ma/sector/`): 31-entry curated M&A taxonomy
  with NAF rev. 2 prefix mapping (`resolveSectorFromNaf`), longest-prefix
  resolution, always-returns-a-value contract, and links to the valuation
  engine's rule-of-thumb defaults.
- **M&A glossary** (`src/common/ma/glossary/`): bilingual (FR/EN) term
  dictionary, now 80 entries covering process, documents, valuation, legal,
  finance, governance, deal structure, and due diligence categories; pure
  search helper (`searchGlossary`) with accent-insensitive scoring and
  category filtering.
- **`ma.glossary.*` i18n scaffolding** across the 9 locales so the upcoming
  glossary UI can display localised category labels and placeholders.
- **ADR 0004** documenting the company profile merge semantics and field
  ownership.
- **ADR 0005** documenting the sector taxonomy and NAF prefix resolution
  rules.
- Additional unit tests under `tests/unit/ma/` covering the company↔sector
  bridge (`companyProfileSector.test.ts`, 5 tests), bringing the `ma` Vitest
  count to 354+ assertions across 8 files.
