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
