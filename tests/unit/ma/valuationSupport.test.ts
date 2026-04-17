import { describe, expect, it } from 'vitest';

import {
  AnrValidationError,
  buildFootballField,
  DEFAULT_RULES,
  FootballFieldValidationError,
  runAnr,
  runRuleOfThumb,
  runSensitivity,
  RuleOfThumbValidationError,
  SensitivityValidationError,
  type ValuationRange,
} from '@/common/ma/valuation';

describe('runAnr', () => {
  it('returns book equity with no adjustments', () => {
    const result = runAnr({ totalAssets: 1000, totalLiabilities: 400 });
    expect(result.bookEquity).toBe(600);
    expect(result.totalAdjustment).toBe(0);
    expect(result.revaluedEquity).toBe(600);
  });

  it('sums all adjustments', () => {
    const result = runAnr({
      totalAssets: 1000,
      totalLiabilities: 400,
      adjustments: [50, -20, 10],
    });
    expect(result.totalAdjustment).toBe(40);
    expect(result.revaluedEquity).toBe(640);
  });

  it('rejects non-finite inputs', () => {
    expect(() => runAnr({ totalAssets: Number.POSITIVE_INFINITY, totalLiabilities: 0 })).toThrow(AnrValidationError);
    expect(() =>
      runAnr({
        totalAssets: 100,
        totalLiabilities: 0,
        adjustments: [Number.NaN],
      })
    ).toThrow(AnrValidationError);
  });
});

describe('runRuleOfThumb', () => {
  it('uses the revenue multiplier for a pharmacy', () => {
    const range = runRuleOfThumb({ sector: 'pharmacie', revenue: 1_000_000 });
    expect(range.method).toBe('rule-of-thumb');
    expect(range.low).toBeCloseTo(700_000, 6);
    expect(range.central).toBeCloseTo(850_000, 6);
    expect(range.high).toBeCloseTo(1_000_000, 6);
  });

  it('uses the EBITDA multiplier for an ecommerce business', () => {
    const range = runRuleOfThumb({ sector: 'ecommerce', ebitda: 200_000 });
    expect(range.low).toBeCloseTo(800_000, 6);
    expect(range.central).toBeCloseTo(1_200_000, 6);
    expect(range.high).toBeCloseTo(1_800_000, 6);
  });

  it('uses the gross margin multiplier for a real estate agency', () => {
    const range = runRuleOfThumb({ sector: 'agence_immobiliere', grossMargin: 500_000 });
    expect(range.low).toBeCloseTo(300_000, 6);
    expect(range.central).toBeCloseTo(400_000, 6);
    expect(range.high).toBeCloseTo(550_000, 6);
  });

  it('throws when the required basis metric is missing', () => {
    expect(() => runRuleOfThumb({ sector: 'ecommerce' })).toThrow(RuleOfThumbValidationError);
    expect(() => runRuleOfThumb({ sector: 'pharmacie' })).toThrow(RuleOfThumbValidationError);
  });

  it('honors a custom rule override', () => {
    const range = runRuleOfThumb(
      { sector: 'saas', revenue: 1_000_000 },
      {
        rule: {
          sector: 'saas',
          basis: 'revenue',
          lowMultiplier: 3,
          centralMultiplier: 5,
          highMultiplier: 7,
        },
      }
    );
    expect(range.low).toBeCloseTo(3_000_000, 6);
    expect(range.central).toBeCloseTo(5_000_000, 6);
    expect(range.high).toBeCloseTo(7_000_000, 6);
  });

  it('rejects inverted multipliers', () => {
    expect(() =>
      runRuleOfThumb(
        { sector: 'saas', revenue: 1 },
        {
          rule: { sector: 'saas', basis: 'revenue', lowMultiplier: 5, centralMultiplier: 3, highMultiplier: 7 },
        }
      )
    ).toThrow(RuleOfThumbValidationError);
  });

  it('ships defaults for all documented sectors', () => {
    const sectors = Object.keys(DEFAULT_RULES);
    expect(sectors.length).toBeGreaterThanOrEqual(8);
    for (const sector of sectors) {
      const rule = DEFAULT_RULES[sector as keyof typeof DEFAULT_RULES];
      expect(rule.lowMultiplier).toBeLessThanOrEqual(rule.centralMultiplier);
      expect(rule.centralMultiplier).toBeLessThanOrEqual(rule.highMultiplier);
    }
  });
});

describe('runSensitivity', () => {
  const base = {
    baseFreeCashFlow: 100,
    growthRate: 0.05,
    projectionYears: 5,
    wacc: 0.1,
    terminalGrowthRate: 0.02,
  };

  it('produces one point per value on the WACC axis', () => {
    const result = runSensitivity(base, { axis: 'wacc', values: [0.08, 0.1, 0.12] });
    expect(result.points).toHaveLength(3);
    expect(result.points.map((p) => p.value)).toEqual([0.08, 0.1, 0.12]);
  });

  it('WACC increase lowers equity value', () => {
    const result = runSensitivity(base, { axis: 'wacc', values: [0.08, 0.12] });
    expect(result.points[0].equityValue).toBeGreaterThan(result.points[1].equityValue);
    expect(result.min).toBeLessThan(result.max);
  });

  it('growth rate increase raises equity value', () => {
    const result = runSensitivity(base, { axis: 'growthRate', values: [0.02, 0.08] });
    expect(result.points[0].equityValue).toBeLessThan(result.points[1].equityValue);
  });

  it('terminalGrowthRate sweep preserves monotonicity within valid range', () => {
    const result = runSensitivity(base, {
      axis: 'terminalGrowthRate',
      values: [0.01, 0.03, 0.05],
    });
    const equities = result.points.map((p) => p.equityValue);
    expect(equities[0]).toBeLessThan(equities[1]);
    expect(equities[1]).toBeLessThan(equities[2]);
  });

  it('rejects empty value arrays', () => {
    expect(() => runSensitivity(base, { axis: 'wacc', values: [] })).toThrow(SensitivityValidationError);
  });
});

const makeRange = (overrides: Partial<ValuationRange>): ValuationRange => ({
  method: 'dcf',
  low: 100,
  central: 150,
  high: 200,
  currency: 'EUR',
  ...overrides,
});

describe('buildFootballField', () => {
  it('computes the overall envelope across ranges', () => {
    const result = buildFootballField({
      ranges: [
        makeRange({ method: 'dcf', low: 80, central: 120, high: 200 }),
        makeRange({ method: 'multiples', low: 100, central: 140, high: 180 }),
        makeRange({ method: 'anr', low: 90, central: 100, high: 110 }),
      ],
    });
    expect(result.overall.low).toBe(80);
    expect(result.overall.high).toBe(200);
    expect(result.overall.central).toBeCloseTo((120 + 140 + 100) / 3, 6);
  });

  it('rejects empty input', () => {
    expect(() => buildFootballField({ ranges: [] })).toThrow(FootballFieldValidationError);
  });

  it('rejects mixed currencies', () => {
    expect(() =>
      buildFootballField({
        ranges: [makeRange({ currency: 'EUR' }), makeRange({ method: 'multiples', currency: 'USD' })],
      })
    ).toThrow(FootballFieldValidationError);
  });

  it('rejects ranges where central is outside [low, high]', () => {
    expect(() =>
      buildFootballField({
        ranges: [makeRange({ low: 100, central: 50, high: 200 })],
      })
    ).toThrow(FootballFieldValidationError);
  });
});
