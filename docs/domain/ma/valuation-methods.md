# M&A Valuation Methods

## Overview

Detailed explanations of valuation methods used in the Largo M&A domain, tailored for the French market. These methods are implemented in `src/common/ma/valuation/`.

## Valuation Method Categories

### 1. Multiples Method (Méthode des Multiples)

#### Description

Values a company by comparing it to similar publicly traded companies (comparables) using valuation multiples such as EV/EBITDA, P/E, and EV/Sales.

#### Key Multiples

##### EV/EBITDA (Enterprise Value / EBE)

- **Formula**: `EV / EBE` (EBE = Excédent Brut d'Exploitation)
- **Typical Range**: 4x - 12x depending on sector
- **Usage**: Most common for profitable companies
- **Advantages**:
  - Accounts for debt and cash
  - Removes effect of depreciation/amortization
  - Widely used in French market
- **Limitations**:
  - Requires comparable companies
  - Sensitive to EBE quality
  - Doesn't account for growth differences

##### P/E (Price / Earnings)

- **Formula**: `Market Cap / Net Income` (Résultat Net)
- **Typical Range**: 8x - 25x depending on sector
- **Usage**: Common for mature, profitable companies
- **Advantages**:
  - Simple and widely understood
  - Directly reflects investor expectations
- **Limitations**:
  - Doesn't account for capital structure
  - Distorted by non-recurring items
  - Negative earnings make it unusable

##### EV/Sales

- **Formula**: `EV / CA` (CA = Chiffre d'Affaires)
- **Typical Range**: 0.5x - 5x depending on sector
- **Usage**: Common for unprofitable or high-growth companies
- **Advantages**:
  - Works even with negative earnings
  - Reflects market position
- **Limitations**:
  - Ignores profitability
  - Varies widely by margin structure

#### Implementation

```typescript
// src/common/ma/valuation/multiples.ts
interface MultiplesValuationInput {
  ebe: number; // Excédent Brut d'Exploitation
  netIncome: number; // Résultat Net
  revenue: number; // Chiffre d'Affaires
  debt: number; // Dettes financières
  cash: number; // Trésorerie
  sectorMultiples: SectorMultiples;
}

interface SectorMultiples {
  evEbitda: { min: number; max: number; average: number };
  pe: { min: number; max: number; average: number };
  evSales: { min: number; max: number; average: number };
}

function calculateMultiplesValuation(input: MultiplesValuationInput): ValuationResult {
  const ev = input.debt - input.cash;

  // EV/EBITDA valuation
  const evEbitda = ev / input.ebe;
  const evEbitdaValue = evEbitda * input.sectorMultiples.evEbitda.average;

  // P/E valuation
  const pe = (ev + input.cash - input.debt) / input.netIncome;
  const peValue = pe * input.sectorMultiples.pe.average;

  // EV/Sales valuation
  const evSales = ev / input.revenue;
  const evSalesValue = evSales * input.sectorMultiples.evSales.average;

  return {
    enterpriseValue: evEbitdaValue,
    equityValue: evEbitdaValue - input.debt + input.cash,
    methods: {
      evEbitda: evEbitdaValue,
      pe: peValue,
      evSales: evSalesValue,
    },
  };
}
```

#### Sector-Specific Considerations

- **Technology**: Higher multiples due to growth potential
- **Industrial**: Lower multiples, more stable
- **Services**: Variable based on recurring revenue
- **Retail**: Lower margins, lower multiples

---

### 2. DCF (Discounted Cash Flow)

#### Description

Values a company based on its projected future cash flows, discounted to present value using a discount rate (WACC). Considered the most theoretically sound method.

#### Key Components

##### Free Cash Flow (FCF) Projection

- **Formula**: `EBE - Impôt sur le résultat d'exploitation - Variation du BFR - Investissements`
- **Projection Period**: Typically 5-10 years
- **Terminal Value**: Value beyond projection period

```typescript
// FCF Calculation
function calculateFCF(ebe: number, taxRate: number, bfrVariation: number, capex: number): number {
  const operatingProfit = ebe;
  const operatingTax = operatingProfit * taxRate;
  return operatingProfit - operatingTax - bfrVariation - capex;
}
```

##### Discount Rate (WACC)

- **Formula**: `Ke * (E / V) + Kd * (1 - T) * (D / V)`
- **Components**:
  - `Ke`: Cost of equity (CAPM model)
  - `Kd`: Cost of debt
  - `E`: Market value of equity
  - `D`: Market value of debt
  - `V`: Total value (E + D)
  - `T`: Corporate tax rate

```typescript
// CAPM for Cost of Equity
function calculateKe(riskFreeRate: number, beta: number, marketRiskPremium: number): number {
  return riskFreeRate + beta * marketRiskPremium;
}

// WACC Calculation
function calculateWACC(ke: number, kd: number, equityRatio: number, debtRatio: number, taxRate: number): number {
  return ke * equityRatio + kd * (1 - taxRate) * debtRatio;
}
```

##### Terminal Value

- **Gordon Growth Model**: `FCF_n * (1 + g) / (WACC - g)`
- **Exit Multiple Method**: `EBITDA_n * Exit Multiple`
- **Typical Growth Rate (g)**: 2-3% (long-term GDP growth)

#### Implementation

```typescript
// src/common/ma/valuation/dcf.ts
interface DCFValuationInput {
  projectedFCF: number[]; // 5-10 years of FCF
  wacc: number; // Discount rate
  terminalGrowthRate: number; // Long-term growth rate
  terminalMultiple?: number; // Optional exit multiple
}

function calculateDCF(input: DCFValuationInput): ValuationResult {
  // Present value of projected FCFs
  let pvFCF = 0;
  for (let i = 0; i < input.projectedFCF.length; i++) {
    pvFCF += input.projectedFCF[i] / Math.pow(1 + input.wacc, i + 1);
  }

  // Terminal value (Gordon Growth)
  const lastFCF = input.projectedFCF[input.projectedFCF.length - 1];
  const terminalValue = (lastFCF * (1 + input.terminalGrowthRate)) / (input.wacc - input.terminalGrowthRate);
  const pvTerminalValue = terminalValue / Math.pow(1 + input.wacc, input.projectedFCF.length);

  const enterpriseValue = pvFCF + pvTerminalValue;

  return {
    enterpriseValue,
    equityValue: enterpriseValue, // Assuming net debt = 0
    breakdown: {
      pvFCF,
      pvTerminalValue,
      terminalValue,
    },
  };
}
```

#### Advantages

- Theoretically sound
- Accounts for future growth
- Incorporates risk through discount rate
- Works for any company with cash flows

#### Limitations

- Highly sensitive to assumptions
- Difficult to forecast accurately
- WACC estimation is complex
- Terminal value dominates valuation

---

### 3. ANR (Actif Net Réévalué / Adjusted Net Assets)

#### Description

Values a company based on its net assets, adjusted to fair market value. Used for asset-heavy companies or when comparables are unavailable.

#### Key Components

##### Asset Revaluation

- **Real Estate**: Market value appraisal
- **Equipment**: Fair market value
- **Inventory**: Net realizable value
- **Intangible Assets**: Fair value if separable

##### Liability Adjustment

- **Debt**: Book value (usually close to market)
- **Provisions**: Assess likelihood and amount
- **Contingent Liabilities**: Estimate if probable

```typescript
// src/common/ma/valuation/anr.ts
interface ANRValuationInput {
  assets: {
    realEstate: { bookValue: number; fairValue: number };
    equipment: { bookValue: number; fairValue: number };
    inventory: { bookValue: number; fairValue: number };
    intangibleAssets: { bookValue: number; fairValue: number };
    otherAssets: { bookValue: number; fairValue: number };
  };
  liabilities: {
    debt: number;
    provisions: number;
    contingentLiabilities: number;
    otherLiabilities: number;
  };
}

function calculateANR(input: ANRValuationInput): ValuationResult {
  // Sum adjusted assets
  const adjustedAssets =
    input.assets.realEstate.fairValue +
    input.assets.equipment.fairValue +
    input.assets.inventory.fairValue +
    input.assets.intangibleAssets.fairValue +
    input.assets.otherAssets.fairValue;

  // Sum adjusted liabilities
  const adjustedLiabilities =
    input.liabilities.debt +
    input.liabilities.provisions +
    input.liabilities.contingentLiabilities +
    input.liabilities.otherLiabilities;

  const equityValue = adjustedAssets - adjustedLiabilities;

  return {
    enterpriseValue: equityValue + input.liabilities.debt,
    equityValue,
    breakdown: {
      adjustedAssets,
      adjustedLiabilities,
    },
  };
}
```

#### Advantages

- Objective and verifiable
- Works for asset-heavy companies
- Good for distressed companies
- Simple to understand

#### Limitations

- Ignores future earnings potential
- Doesn't account for synergies
- Fair value estimation can be subjective
- Not suitable for service/tech companies

#### French Market Specifics

- **Goodwill**: Often significant in French acquisitions
- **Tax Adjustments**: Consider deferred tax assets/liabilities
- **Real Estate**: Often undervalued on balance sheets

---

### 4. Rule of Thumb (Règles de l'Art)

#### Description

Quick valuation heuristics based on industry experience and common practice. Used for preliminary assessments and sanity checks.

#### Common Rules

##### Revenue-Based Rules

- **SaaS**: 3x - 8x ARR (Annual Recurring Revenue)
- **Consulting**: 0.5x - 1.5x Revenue
- **E-commerce**: 0.5x - 2x Revenue

##### EBITDA-Based Rules

- **Manufacturing**: 4x - 8x EBITDA
- **Services**: 5x - 10x EBITDA
- **Technology**: 8x - 15x EBITDA

##### Profit-Based Rules

- **Small businesses**: 2x - 4x Net Profit
- **Professional firms**: 1x - 2x Gross Revenue

#### Implementation

```typescript
// src/common/ma/valuation/ruleOfThumb.ts
interface RuleOfThumbInput {
  revenue: number;
  ebe: number;
  netProfit: number;
  sector: string;
  businessModel: string;
}

function calculateRuleOfThumb(input: RuleOfThumbInput): ValuationResult {
  const rules = getRulesForSector(input.sector, input.businessModel);

  const valuations = [];

  if (rules.revenueMultiple) {
    valuations.push({
      method: 'Revenue Multiple',
      value: input.revenue * rules.revenueMultiple,
      multiple: rules.revenueMultiple,
    });
  }

  if (rules.ebitdaMultiple) {
    valuations.push({
      method: 'EBITDA Multiple',
      value: input.ebe * rules.ebitdaMultiple,
      multiple: rules.ebitdaMultiple,
    });
  }

  if (rules.profitMultiple) {
    valuations.push({
      method: 'Profit Multiple',
      value: input.netProfit * rules.profitMultiple,
      multiple: rules.profitMultiple,
    });
  }

  // Average of applicable rules
  const averageValue = valuations.reduce((sum, v) => sum + v.value, 0) / valuations.length;

  return {
    enterpriseValue: averageValue,
    equityValue: averageValue, // Simplified
    breakdown: valuations,
  };
}
```

#### Advantages

- Quick and easy
- Based on market experience
- Good for preliminary estimates
- Useful for sanity checks

#### Limitations

- Very approximate
- Doesn't account for specifics
- Can be outdated
- Should not be used as final valuation

---

### 5. Football Field (Terrain de Football)

#### Description

Visual comparison of all valuation methods to determine a valuation range and consensus. Helps identify outliers and build confidence in final valuation.

#### Visualization

```
Valuation (€M)
├─────────────────────────────────────────────────────────────┤
ANR:           [████████████████] 8.5
Multiples:      [████████████████████] 11.2
DCF:            [██████████████████████] 13.5
Rule of Thumb:  [██████████████] 9.8
                ───────────────────────────────────────────────
Range:          8.5 - 13.5 M€
Consensus:      11.0 M€ (median)
```

#### Implementation

```typescript
// src/common/ma/valuation/footballField.ts
interface FootballFieldInput {
  anrValue: number;
  multiplesValue: number;
  dcfValue: number;
  ruleOfThumbValue: number;
}

function calculateFootballField(input: FootballFieldInput): FootballFieldResult {
  const valuations = [
    { method: 'ANR', value: input.anrValue },
    { method: 'Multiples', value: input.multiplesValue },
    { method: 'DCF', value: input.dcfValue },
    { method: 'Rule of Thumb', value: input.ruleOfThumbValue },
  ];

  const minValue = Math.min(...valuations.map((v) => v.value));
  const maxValue = Math.max(...valuations.map((v) => v.value));
  const medianValue = valuations.sort((a, b) => a.value - b.value)[1].value;
  const averageValue = valuations.reduce((sum, v) => sum + v.value, 0) / valuations.length;

  // Identify outliers (> 2 standard deviations)
  const stdDev = calculateStdDev(valuations.map((v) => v.value));
  const outliers = valuations.filter((v) => Math.abs(v.value - averageValue) > 2 * stdDev);

  return {
    range: { min: minValue, max: maxValue },
    consensus: medianValue,
    average: averageValue,
    valuations,
    outliers,
  };
}
```

#### Interpretation

- **Tight range** (±10%): High confidence in valuation
- **Wide range** (>50%): Need to investigate differences
- **Outliers**: Check assumptions and inputs
- **Consensus**: Use median or weighted average

#### Weighting

Different methods can be weighted based on reliability:

- DCF: 30-40% (if good projections)
- Multiples: 30-40% (if good comparables)
- ANR: 10-20% (asset-heavy companies)
- Rule of Thumb: 10% (sanity check only)

---

## Method Selection Guidelines

### When to Use Each Method

| Method         | Best For                              | Not Recommended For            |
| -------------- | ------------------------------------- | ------------------------------ |
| Multiples      | Profitable, mature companies          | Unprofitable, unique companies |
| DCF            | Stable cash flows, predictable growth | Highly volatile, early-stage   |
| ANR            | Asset-heavy, distressed companies     | Service, tech companies        |
| Rule of Thumb  | Quick estimates, sanity checks        | Final valuation                |
| Football Field | Final valuation, consensus building   | Initial assessment             |

### French Market Considerations

#### Common Practices

- Multiples method is most common
- EBE (EBITDA) is preferred over net income
- ANR is used for family business transfers
- Goodwill is often significant

#### Regulatory Factors

- French GAAP (IFRS) differences
- Tax implications (IS, CFE, etc.)
- Employee profit-sharing (participation)
- Works council consultation

---

## Sensitivity Analysis

### Purpose

Test how valuation changes with key assumptions to understand risk and uncertainty.

### Key Variables to Test

- Discount rate (WACC): ±1-2%
- Growth rate: ±1%
- EBITDA margin: ±5%
- Terminal multiple: ±1x

### Implementation

```typescript
function sensitivityAnalysis(baseDCF: DCFValuationInput, variables: string[]): SensitivityResult {
  const results = [];

  for (const variable of variables) {
    const variations = [-0.1, -0.05, 0, 0.05, 0.1]; // ±10%, ±5%

    for (const variation of variations) {
      const modifiedInput = { ...baseDCF };
      modifiedInput[variable] *= 1 + variation;

      const valuation = calculateDCF(modifiedInput);
      results.push({
        variable,
        variation,
        value: valuation.enterpriseValue,
      });
    }
  }

  return {
    baseValue: calculateDCF(baseDCF).enterpriseValue,
    variations: results,
    mostSensitive: identifyMostSensitive(results),
  };
}
```

---

## Related Documentation

- [src/common/ma/valuation/](../../../src/common/ma/valuation/) - Valuation implementations
- [docs/domain/ma/sector-multiples.md](./sector-multiples.md) - Sector multiples data
- [docs/domain/ma/french-terminology.md](./french-terminology.md) - French M&A terms
