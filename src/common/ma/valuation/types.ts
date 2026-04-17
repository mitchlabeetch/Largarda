/**
 * Shared types for the M&A valuation engine.
 *
 * All monetary amounts are expressed in the same currency (euros by default);
 * the caller is responsible for consistency. Percentages use decimal form
 * (e.g. 0.12 for 12%) unless otherwise specified.
 *
 * Process-agnostic: this module lives under `src/common/` and must not import
 * from Electron, Node-only APIs, or the renderer.
 */

export type ValuationMethod = 'dcf' | 'multiples' | 'anr' | 'rule-of-thumb';

export type ValuationRange = {
  readonly method: ValuationMethod;
  readonly low: number;
  readonly central: number;
  readonly high: number;
  readonly currency: string;
};

export type DcfInputs = {
  /** Latest known free cash flow for year 0 (in currency units). */
  readonly baseFreeCashFlow: number;
  /** Annual growth rate applied during the projection window (decimal, e.g. 0.05). */
  readonly growthRate: number;
  /** Number of projected years (typically 5). Must be >= 1. */
  readonly projectionYears: number;
  /** Weighted Average Cost of Capital (decimal). Must be > terminalGrowthRate. */
  readonly wacc: number;
  /** Perpetual growth rate used in the Gordon-Shapiro terminal value (decimal). */
  readonly terminalGrowthRate: number;
  /** Net debt to subtract from enterprise value to reach equity value. */
  readonly netDebt?: number;
  /** Override the explicit cash-flow series when cash flows are not a flat growth. */
  readonly cashFlowSeriesOverride?: readonly number[];
};

export type DcfResult = {
  readonly projectedCashFlows: readonly number[];
  readonly discountedCashFlows: readonly number[];
  readonly terminalValue: number;
  readonly discountedTerminalValue: number;
  readonly enterpriseValue: number;
  readonly equityValue: number;
};

export type MultiplesMetric = 'ev_ebitda' | 'ev_revenue' | 'p_e';

export type MultipleBenchmark = {
  readonly metric: MultiplesMetric;
  readonly low: number;
  readonly median: number;
  readonly high: number;
};

export type MultiplesInputs = {
  readonly revenue?: number;
  readonly ebitda?: number;
  readonly netIncome?: number;
  readonly netDebt?: number;
  readonly benchmarks: readonly MultipleBenchmark[];
};

export type MultiplesOutput = {
  readonly metric: MultiplesMetric;
  readonly low: number;
  readonly central: number;
  readonly high: number;
};

export type MultiplesResult = {
  readonly perMetric: readonly MultiplesOutput[];
  readonly aggregate: ValuationRange;
};

export type AnrInputs = {
  readonly totalAssets: number;
  readonly totalLiabilities: number;
  /** Revaluation adjustments (can be negative). */
  readonly adjustments?: readonly number[];
};

export type AnrResult = {
  readonly bookEquity: number;
  readonly totalAdjustment: number;
  readonly revaluedEquity: number;
};

export type RuleOfThumbSector =
  | 'pharmacie'
  | 'restaurant'
  | 'boulangerie'
  | 'cabinet_expertise_comptable'
  | 'agence_immobiliere'
  | 'salon_coiffure'
  | 'ecommerce'
  | 'saas';

export type RuleOfThumbRule = {
  readonly sector: RuleOfThumbSector;
  /** Base metric used for the multiplier (revenue / ebe / custom). */
  readonly basis: 'revenue' | 'ebitda' | 'gross_margin';
  readonly lowMultiplier: number;
  readonly centralMultiplier: number;
  readonly highMultiplier: number;
};

export type RuleOfThumbInputs = {
  readonly sector: RuleOfThumbSector;
  readonly revenue?: number;
  readonly ebitda?: number;
  readonly grossMargin?: number;
  readonly netDebt?: number;
};

export type SensitivityAxis = 'wacc' | 'growthRate' | 'terminalGrowthRate';

export type SensitivityPoint = {
  readonly axis: SensitivityAxis;
  readonly value: number;
  readonly equityValue: number;
};

export type SensitivityResult = {
  readonly axis: SensitivityAxis;
  readonly points: readonly SensitivityPoint[];
  readonly min: number;
  readonly max: number;
};

export type FootballFieldInputs = {
  readonly ranges: readonly ValuationRange[];
};

export type FootballFieldResult = {
  readonly ranges: readonly ValuationRange[];
  readonly overall: { readonly low: number; readonly central: number; readonly high: number };
};
