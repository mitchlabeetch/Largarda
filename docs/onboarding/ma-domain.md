# M&A Domain Introduction

## Overview

Largo is an AI-powered M&A (Mergers & Acquisitions) assistant specifically designed for the French market. This guide introduces the domain concepts and terminology.

## French M&A Terminology

### Key Terms

| French Term           | English Equivalent   | Description                                     |
| --------------------- | -------------------- | ----------------------------------------------- |
| **EBE**               | EBITDA               | Excédent Brut d'Exploitation - Operating profit |
| **CA**                | Revenue              | Chiffre d'Affaires - Total revenue/sales        |
| **Capitaux propres**  | Shareholders' equity | Owner's equity                                  |
| **Fonds de commerce** | Goodwill             | Business goodwill                               |
| **BFR**               | Working capital      | Besoin en Fonds de Roulement                    |
| **CAF**               | Cash flow            | Capacité d'Autofinancement                      |

### 4-Phase Framework

Largo follows the French M&A framework:

1. **Approche** (Approach)
   - Initial contact
   - Expression of interest
   - Preliminary discussions

2. **LOI** (Letter of Intent)
   - Formal offer
   - Price indication
   - Due diligence scope

3. **Due Diligence**
   - Financial analysis
   - Legal review
   - Operational assessment

4. **Closing** (Clôture)
   - Final agreement
   - Payment
   - Integration

## Valuation Methods

### 1. Multiples Method

Compare company to similar companies using market multiples.

**Common Multiples:**

- EV/EBITDA (Enterprise Value to EBITDA)
- P/E (Price to Earnings)
- P/B (Price to Book)
- Sales multiples

**Usage:**

```typescript
const valuation = await maService.performValuation({
  companyId: '...',
  methods: ['multiples'],
  multiples: {
    evEbitda: 8.5,
    pE: 15,
  },
});
```

### 2. DCF (Discounted Cash Flow)

Calculate intrinsic value based on future cash flows.

**Steps:**

1. Project free cash flows (5-10 years)
2. Calculate terminal value
3. Discount at WACC (Weighted Average Cost of Capital)
4. Sum present values

**Usage:**

```typescript
const valuation = await maService.performValuation({
  companyId: '...',
  methods: ['dcf'],
  dcf: {
    projectionYears: 5,
    wacc: 0.1,
    terminalGrowthRate: 0.02,
  },
});
```

### 3. ANR (Adjusted Net Resources)

Asset-based valuation adjusted for fair market values.

**Components:**

- Tangible assets (real estate, equipment)
- Intangible assets (patents, goodwill)
- Liabilities
- Adjustments

**Usage:**

```typescript
const valuation = await maService.performValuation({
  companyId: '...',
  methods: ['anr'],
});
```

### 4. Rule of Thumb

Quick valuation using industry heuristics.

**Examples:**

- SaaS: 5-8x ARR
- Retail: 0.5-1x revenue
- Manufacturing: 1-2x EBITDA

### 5. Football Field

Comparison of all methods to determine value range.

**Output:**

- Visual comparison
- Value range
- Method consensus

## Sector Multiples

Largo provides sector-specific multiples for French companies:

### Available Sectors

- Technology
- Healthcare
- Retail
- Manufacturing
- Services
- Construction
- Energy
- Finance

### Usage

```typescript
const multiples = await maService.getSectorMultiples('technology');
// Returns: { evEbitda: 12, pE: 20, ... }
```

## Company Data

### SIRENE Database

Largo integrates with French SIRENE database for company information:

- SIREN number (company ID)
- Legal form
- Capital
- Registration date
- Activity codes (NAF/APE)

### Financial Statements

- Balance sheet (Bilan)
- Income statement (Compte de résultat)
- Cash flow statement (Tableau de financement)

## Implementation

### Location

`src/common/ma/`

### Key Modules

- `company/` - Company data structures
- `sector/` - Sector multiples
- `valuation/` - Valuation methods
- `glossary/` - Terminology

### Usage in Code

```typescript
import { ValuationEngine } from '@common/ma/valuation';

const engine = new ValuationEngine();
const result = await engine.calculateDCF({
  freeCashFlows: [100, 110, 120, 130, 140],
  wacc: 0.1,
  terminalGrowthRate: 0.02,
});
```

## Related Documentation

- [src/common/ma/](../../src/common/ma/) - M&A domain implementation
- [docs/adr/0002-valuation-engine-placement.md](../adr/0002-valuation-engine-placement.md) - Valuation architecture
- [docs/domain/ma/](../domain/ma/) - Domain deep dives (planned)
