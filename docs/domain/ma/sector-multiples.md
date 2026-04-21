# M&A Sector Multiples

## Overview

Sector-specific valuation multiples used in the French M&A market. These multiples are used in the multiples valuation method and are stored in `src/common/ma/sector/`.

## Multiple Categories

### EV/EBITDA Multiples (Enterprise Value / EBE)

#### Technology & Software

- **SaaS / Cloud**: 8x - 15x (average: 11x)
- **Enterprise Software**: 6x - 12x (average: 9x)
- **Consumer Apps**: 5x - 10x (average: 7x)
- **IT Services**: 4x - 8x (average: 6x)
- **Cybersecurity**: 8x - 14x (average: 11x)

#### Industrial & Manufacturing

- **Aerospace & Defense**: 6x - 10x (average: 8x)
- **Automotive**: 4x - 8x (average: 6x)
- **Chemicals**: 5x - 9x (average: 7x)
- **Industrial Equipment**: 4x - 8x (average: 6x)
- **Metals & Mining**: 4x - 7x (average: 5.5x)

#### Consumer & Retail

- **Luxury Goods**: 8x - 14x (average: 11x)
- **FMCG (Fast-Moving Consumer Goods)**: 6x - 10x (average: 8x)
- **Retail**: 4x - 8x (average: 6x)
- **E-commerce**: 5x - 10x (average: 7x)
- **Food & Beverage**: 5x - 9x (average: 7x)

#### Healthcare & Pharma

- **Pharmaceuticals**: 8x - 14x (average: 11x)
- **Biotechnology**: 6x - 12x (average: 9x)
- **Medical Devices**: 6x - 11x (average: 8.5x)
- **Healthcare Services**: 5x - 9x (average: 7x)

#### Financial Services

- **Banking**: 4x - 8x (average: 6x)
- **Insurance**: 5x - 9x (average: 7x)
- **Asset Management**: 6x - 10x (average: 8x)
- **FinTech**: 7x - 13x (average: 10x)

#### Energy & Utilities

- **Oil & Gas**: 4x - 8x (average: 6x)
- **Renewable Energy**: 6x - 12x (average: 9x)
- **Utilities**: 5x - 9x (average: 7x)
- **Electricity**: 4x - 8x (average: 6x)

#### Real Estate & Construction

- **Real Estate Development**: 4x - 8x (average: 6x)
- **Construction**: 3x - 6x (average: 4.5x)
- **Building Materials**: 4x - 7x (average: 5.5x)
- **Property Management**: 5x - 9x (average: 7x)

#### Telecom & Media

- **Telecom Operators**: 4x - 8x (average: 6x)
- **Media & Entertainment**: 6x - 12x (average: 9x)
- **Advertising**: 5x - 10x (average: 7.5x)
- **Publishing**: 4x - 8x (average: 6x)

#### Business Services

- **Consulting**: 5x - 10x (average: 7.5x)
- **Professional Services**: 4x - 8x (average: 6x)
- **Logistics & Transportation**: 4x - 8x (average: 6x)
- **Staffing**: 3x - 6x (average: 4.5x)

---

### P/E Multiples (Price / Earnings)

#### Technology & Software

- **SaaS / Cloud**: 25x - 50x (average: 35x)
- **Enterprise Software**: 18x - 35x (average: 25x)
- **Consumer Apps**: 15x - 30x (average: 22x)
- **IT Services**: 10x - 20x (average: 15x)

#### Industrial & Manufacturing

- **Aerospace & Defense**: 12x - 22x (average: 17x)
- **Automotive**: 8x - 16x (average: 12x)
- **Chemicals**: 10x - 18x (average: 14x)
- **Industrial Equipment**: 10x - 18x (average: 14x)

#### Consumer & Retail

- **Luxury Goods**: 20x - 35x (average: 28x)
- **FMCG**: 15x - 25x (average: 20x)
- **Retail**: 10x - 20x (average: 15x)
- **E-commerce**: 20x - 40x (average: 30x)

#### Healthcare & Pharma

- **Pharmaceuticals**: 18x - 30x (average: 24x)
- **Biotechnology**: 15x - 30x (average: 22x)
- **Medical Devices**: 15x - 25x (average: 20x)
- **Healthcare Services**: 12x - 22x (average: 17x)

---

### EV/Sales Multiples

#### Technology & Software

- **SaaS / Cloud**: 5x - 12x (average: 8x)
- **Enterprise Software**: 3x - 8x (average: 5x)
- **Consumer Apps**: 2x - 6x (average: 4x)
- **IT Services**: 1x - 3x (average: 2x)

#### Consumer & Retail

- **Luxury Goods**: 2x - 5x (average: 3.5x)
- **FMCG**: 1x - 3x (average: 2x)
- **Retail**: 0.5x - 2x (average: 1.2x)
- **E-commerce**: 1x - 4x (average: 2.5x)

#### Healthcare & Pharma

- **Pharmaceuticals**: 3x - 6x (average: 4.5x)
- **Biotechnology**: 2x - 8x (average: 5x)
- **Medical Devices**: 2x - 5x (average: 3.5x)

---

## Size Adjustments

### Small Cap (< €50M revenue)

- **Adjustment**: -20% to -40% vs. large cap
- **Reasoning**: Higher risk, lower liquidity, less diversified

### Mid Cap (€50M - €500M revenue)

- **Adjustment**: -10% to -20% vs. large cap
- **Reasoning**: Moderate risk, some liquidity

### Large Cap (> €500M revenue)

- **Adjustment**: Baseline (no adjustment)
- **Reasoning**: Lower risk, high liquidity, diversified

---

## Growth Adjustments

### High Growth (> 20% CAGR)

- **Adjustment**: +20% to +40% premium
- **Reasoning**: Growth premium valued by market

### Moderate Growth (5% - 20% CAGR)

- **Adjustment**: Baseline (no adjustment)
- **Reasoning**: Normal growth expectations

### Low Growth (< 5% CAGR)

- **Adjustment**: -10% to -30% discount
- **Reasoning**: Stagnant or declining business

---

## Profitability Adjustments

### High Margin (> 20% EBITDA margin)

- **Adjustment**: +10% to +20% premium
- **Reasoning**: Superior profitability

### Average Margin (10% - 20% EBITDA margin)

- **Adjustment**: Baseline (no adjustment)
- **Reasoning**: Normal profitability

### Low Margin (< 10% EBITDA margin)

- **Adjustment**: -10% to -25% discount
- **Reasoning**: Poor profitability or competitive pressure

---

## Geographic Adjustments (France-Specific)

### Paris / Île-de-France

- **Adjustment**: +5% to +10% premium
- **Reasoning**: Access to talent, capital, markets

### Major Regional Cities (Lyon, Marseille, Toulouse)

- **Adjustment**: Baseline (no adjustment)
- **Reasoning**: Good access but lower than Paris

### Rural / Smaller Cities

- **Adjustment**: -5% to -15% discount
- **Reasoning**: Limited talent pool, market access

---

## Implementation

### Data Structure

```typescript
// src/common/ma/sector/types.ts
interface SectorMultiples {
  sector: string;
  subSector?: string;
  evEbitda: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
  pe?: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
  evSales?: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
  lastUpdated: Date;
  dataSource: string;
}

interface AdjustedMultiples extends SectorMultiples {
  adjustments: {
    size?: number;
    growth?: number;
    profitability?: number;
    geography?: number;
  };
  adjustedAverage: number;
}
```

### Calculation

```typescript
// src/common/ma/sector/adjustMultiples.ts
function adjustMultiples(baseMultiples: SectorMultiples, company: Company): AdjustedMultiples {
  let adjustmentFactor = 1.0;

  // Size adjustment
  if (company.revenue < 50_000_000) {
    adjustmentFactor *= 0.8; // -20% for small cap
  } else if (company.revenue > 500_000_000) {
    adjustmentFactor *= 1.0; // No adjustment for large cap
  } else {
    adjustmentFactor *= 0.9; // -10% for mid cap
  }

  // Growth adjustment
  if (company.growthRate > 0.2) {
    adjustmentFactor *= 1.3; // +30% for high growth
  } else if (company.growthRate < 0.05) {
    adjustmentFactor *= 0.85; // -15% for low growth
  }

  // Profitability adjustment
  if (company.ebitdaMargin > 0.2) {
    adjustmentFactor *= 1.15; // +15% for high margin
  } else if (company.ebitdaMargin < 0.1) {
    adjustmentFactor *= 0.85; // -15% for low margin
  }

  // Geography adjustment
  if (company.location === 'Paris') {
    adjustmentFactor *= 1.08; // +8% for Paris
  } else if (company.location === 'Rural') {
    adjustmentFactor *= 0.9; // -10% for rural
  }

  return {
    ...baseMultiples,
    adjustments: {
      size: company.revenue < 50_000_000 ? -0.2 : company.revenue > 500_000_000 ? 0 : -0.1,
      growth: company.growthRate > 0.2 ? 0.3 : company.growthRate < 0.05 ? -0.15 : 0,
      profitability: company.ebitdaMargin > 0.2 ? 0.15 : company.ebitdaMargin < 0.1 ? -0.15 : 0,
      geography: company.location === 'Paris' ? 0.08 : company.location === 'Rural' ? -0.1 : 0,
    },
    adjustedAverage: baseMultiples.evEbitda.average * adjustmentFactor,
  };
}
```

---

## Data Sources

### Primary Sources

- **French M&A market reports** (CIC, BNP Paribas, Société Générale)
- **Industry association publications**
- **Public company filings** (AMF)
- **Private equity transaction databases**

### Secondary Sources

- **International multiples** (adjusted for French market)
- **Industry analyst reports**
- **Academic research on French M&A**

### Update Frequency

- **Quarterly** for major sectors
- **Annually** for niche sectors
- **Event-driven** for major market changes

---

## Usage Guidelines

### Selecting Comparable Companies

1. **Same sector**: Primary consideration
2. **Similar size**: Within 2-3x revenue range
3. **Similar geography**: French market focus
4. **Similar business model**: Comparable operations
5. **Recent transactions**: Last 12-24 months

### Quality Checks

- **Transaction count**: Minimum 3-5 comparable transactions
- **Date range**: Prefer recent transactions
- **Outlier removal**: Exclude extreme multiples
- **Median vs. average**: Use median for skewed distributions

### Limitations

- **Market conditions**: Multiples vary with market cycle
- **Unique businesses**: May not have good comparables
- **Private vs. public**: Private company discounts apply
- **French specifics**: Some sectors have unique characteristics

---

## French Market Specifics

### Common Practice

- **EBE (EBITDA) preferred** over net income for multiples
- **Enterprise value** commonly used (not just market cap)
- **Goodwill adjustments** common in French transactions
- **Tax considerations** affect multiples (IS, CFE)

### Sector Nuances

- **Family businesses**: Often trade at discounts
- **SME market**: Less transparent, wider multiple ranges
- **Tech sector**: Growing rapidly, multiples increasing
- **Traditional industries**: Stable, lower multiples

### Regulatory Impact

- **AMF regulations**: Affect public company multiples
- **Labor laws**: Impact valuation of certain sectors
- **Tax regime**: Affects after-tax multiples

---

## Related Documentation

- [src/common/ma/sector/](../../../src/common/ma/sector/) - Sector data implementation
- [docs/domain/ma/valuation-methods.md](./valuation-methods.md) - Valuation methods
- [docs/domain/ma/french-terminology.md](./french-terminology.md) - French M&A terms
