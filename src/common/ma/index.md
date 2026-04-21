# src/common/ma/ - M&A Domain Logic

## Overview

Mergers & Acquisitions domain logic specifically tailored for the French market. Contains company data structures, sector multiples, valuation models, and French M&A terminology.

## Directory Structure

### Root Files

- **constants.ts** (6.4KB) - M&A constants and terminology
  - French M&A terms (EBE, CA, capitaux propres)
  - Common ratios and metrics
  - Industry-specific terminology
  - Phase definitions (Approche, LOI, Due Diligence, Closing)

- **types.ts** (29KB) - Comprehensive M&A type definitions
  - Company data structures
  - Financial statement types
  - Valuation result types
  - Sector classification types
  - Deal structure types
  - Document types

### `company/` (4 items)

French company data structures and utilities.

- Company profile definitions
- SIRENE data integration
- Financial data structures
- Company analysis utilities

### `glossary/` (4 items)

M&A glossary and terminology definitions.

- French M&A terminology
- English translations
- Context and usage examples
- Industry-specific terms

### `sector/` (3 items)

Sector classification and multiples data.

- Sector taxonomy
- Industry multiples (EV/EBITDA, P/E, etc.)
- Sector-specific benchmarks
- Market data references

### `flowise/` (3 items)

Flowise catalogue and `flowKey` registry.

- **flowKey.ts** — stable feature-to-flow identifier type, known-keys array, Zod schema, type guard.
- **catalog.ts** — `FlowSpec` registry mapping every `flowKey` to flow id, prompt version, KB scopes, tool dependencies, lifecycle status.
- **index.ts** — barrel re-export.

See `src/common/ma/flowise/index.md` for the lifecycle and related documents.

### `valuation/` (8 items)

Valuation models and calculations.

#### Valuation Models

- **anr.ts** (1.4KB) - Adjusted Net Resources (ANR) valuation
- **dcf.ts** (3KB) - Discounted Cash Flow (DCF) model
- **footballField.ts** (1.6KB) - Football field analysis (comparison of methods)
- **multiples.ts** (3.1KB) - Multiples-based valuation
- **ruleOfThumb.ts** (3.8KB) - Rule of thumb valuation methods
- **sensitivity.ts** (1.7KB) - Sensitivity analysis for valuations

#### Supporting Files

- **index.ts** (1.3KB) - Valuation module exports
- **types.ts** (4.1KB) - Valuation-specific type definitions

## Key Features

### French Market Expertise

Native French M&A terminology and concepts:

- **EBE** (Excédent Brut d'Exploitation) - Operating profit
- **CA** (Chiffre d'Affaires) - Revenue
- **Capitaux propres** - Shareholders' equity
- 4-phase framework: Approche → LOI → Due Diligence → Closing

### Valuation Methods

Multiple valuation approaches:

1. **Multiples Method** - Comparable company analysis
   - EV/EBITDA multiples
   - P/E ratios
   - Sector-specific benchmarks

2. **DCF (Discounted Cash Flow)** - Intrinsic value
   - Free cash flow projection
   - Discount rate (WACC)
   - Terminal value calculation

3. **ANR (Adjusted Net Resources)** - Asset-based
   - Adjusted book value
   - Fair value adjustments
   - Net asset valuation

4. **Rule of Thumb** - Quick estimates
   - Industry heuristics
   - Quick valuation rules
   - Preliminary assessments

5. **Football Field** - Method comparison
   - Visual comparison of all methods
   - Range determination
   - Consensus building

### Sector Data

Sector-specific multiples and benchmarks:

- Industry classification taxonomy
- Historical multiples data
- Market benchmarks
- Size-adjusted multiples

### Sensitivity Analysis

Valuation sensitivity testing:

- Key variable impact analysis
- Scenario modeling
- Range estimation
- Risk assessment

## Data Structures

### Company Profile

Comprehensive company data structure:

- Basic information (name, SIREN, address)
- Financial statements (balance sheet, P&L, cash flow)
- Sector classification
- Historical performance
- Peer group data

### Valuation Result

Standardized valuation output:

- Enterprise value
- Equity value
- Valuation range
- Method breakdown
- Key assumptions
- Sensitivity analysis

## Related Documentation

- [docs/adr/0002-valuation-engine-placement.md](../../../docs/adr/0002-valuation-engine-placement.md) - Valuation engine architecture
- [docs/adr/0005-sector-taxonomy.md](../../../docs/adr/0005-sector-taxonomy.md) - Sector classification decision
- [docs/feature/](../../../docs/feature/) - M&A feature documentation
