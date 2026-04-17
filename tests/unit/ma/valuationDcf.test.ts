import { describe, expect, it } from 'vitest';

import { DcfValidationError, runDcf } from '@/common/ma/valuation';

describe('runDcf', () => {
  it('projects cash flows at the stated growth rate', () => {
    const result = runDcf({
      baseFreeCashFlow: 100,
      growthRate: 0.1,
      projectionYears: 3,
      wacc: 0.1,
      terminalGrowthRate: 0.02,
    });
    expect(result.projectedCashFlows).toHaveLength(3);
    expect(result.projectedCashFlows[0]).toBeCloseTo(110, 6);
    expect(result.projectedCashFlows[1]).toBeCloseTo(121, 6);
    expect(result.projectedCashFlows[2]).toBeCloseTo(133.1, 6);
  });

  it('applies the WACC when discounting cash flows', () => {
    const result = runDcf({
      baseFreeCashFlow: 100,
      growthRate: 0,
      projectionYears: 2,
      wacc: 0.1,
      terminalGrowthRate: 0,
    });
    // Flat CF of 100 discounted at 10%: 100/1.1, 100/1.21
    expect(result.discountedCashFlows[0]).toBeCloseTo(100 / 1.1, 6);
    expect(result.discountedCashFlows[1]).toBeCloseTo(100 / 1.21, 6);
  });

  it('computes a Gordon-Shapiro terminal value', () => {
    const result = runDcf({
      baseFreeCashFlow: 100,
      growthRate: 0,
      projectionYears: 2,
      wacc: 0.1,
      terminalGrowthRate: 0.02,
    });
    // Year 2 CF = 100, terminal CF = 102, TV = 102 / (0.10 - 0.02) = 1275
    expect(result.terminalValue).toBeCloseTo(1275, 4);
    expect(result.discountedTerminalValue).toBeCloseTo(1275 / 1.21, 4);
  });

  it('subtracts net debt to yield equity value', () => {
    const withoutDebt = runDcf({
      baseFreeCashFlow: 100,
      growthRate: 0.05,
      projectionYears: 5,
      wacc: 0.1,
      terminalGrowthRate: 0.02,
    });
    const withDebt = runDcf({
      baseFreeCashFlow: 100,
      growthRate: 0.05,
      projectionYears: 5,
      wacc: 0.1,
      terminalGrowthRate: 0.02,
      netDebt: 200,
    });
    expect(withDebt.enterpriseValue).toBeCloseTo(withoutDebt.enterpriseValue, 6);
    expect(withDebt.equityValue).toBeCloseTo(withoutDebt.equityValue - 200, 6);
  });

  it('respects an explicit cash flow series override', () => {
    const result = runDcf({
      baseFreeCashFlow: 100, // ignored because override is present
      growthRate: 0.99, // ignored
      projectionYears: 3,
      wacc: 0.1,
      terminalGrowthRate: 0,
      cashFlowSeriesOverride: [50, 75, 100],
    });
    expect(result.projectedCashFlows).toEqual([50, 75, 100]);
  });

  it('enterprise value is monotonically decreasing in WACC', () => {
    const mk = (wacc: number) =>
      runDcf({
        baseFreeCashFlow: 100,
        growthRate: 0.05,
        projectionYears: 5,
        wacc,
        terminalGrowthRate: 0.02,
      }).enterpriseValue;
    expect(mk(0.08)).toBeGreaterThan(mk(0.1));
    expect(mk(0.1)).toBeGreaterThan(mk(0.12));
  });

  it('enterprise value increases with growth rate, all else equal', () => {
    const mk = (g: number) =>
      runDcf({
        baseFreeCashFlow: 100,
        growthRate: g,
        projectionYears: 5,
        wacc: 0.1,
        terminalGrowthRate: 0.02,
      }).enterpriseValue;
    expect(mk(0.03)).toBeLessThan(mk(0.05));
    expect(mk(0.05)).toBeLessThan(mk(0.07));
  });

  it('rejects wacc <= terminalGrowthRate', () => {
    expect(() =>
      runDcf({
        baseFreeCashFlow: 100,
        growthRate: 0,
        projectionYears: 5,
        wacc: 0.05,
        terminalGrowthRate: 0.05,
      })
    ).toThrow(DcfValidationError);
  });

  it('rejects non-positive wacc', () => {
    expect(() =>
      runDcf({
        baseFreeCashFlow: 100,
        growthRate: 0,
        projectionYears: 5,
        wacc: 0,
        terminalGrowthRate: 0,
      })
    ).toThrow(DcfValidationError);
  });

  it('rejects non-integer or zero projectionYears', () => {
    expect(() =>
      runDcf({
        baseFreeCashFlow: 100,
        growthRate: 0,
        projectionYears: 0,
        wacc: 0.1,
        terminalGrowthRate: 0,
      })
    ).toThrow(DcfValidationError);
    expect(() =>
      runDcf({
        baseFreeCashFlow: 100,
        growthRate: 0,
        projectionYears: 1.5,
        wacc: 0.1,
        terminalGrowthRate: 0,
      })
    ).toThrow(DcfValidationError);
  });

  it('rejects an override whose length does not match projectionYears', () => {
    expect(() =>
      runDcf({
        baseFreeCashFlow: 100,
        growthRate: 0,
        projectionYears: 3,
        wacc: 0.1,
        terminalGrowthRate: 0,
        cashFlowSeriesOverride: [1, 2],
      })
    ).toThrow(DcfValidationError);
  });

  it('rejects non-finite inputs', () => {
    expect(() =>
      runDcf({
        baseFreeCashFlow: Number.NaN,
        growthRate: 0,
        projectionYears: 3,
        wacc: 0.1,
        terminalGrowthRate: 0,
      })
    ).toThrow(DcfValidationError);
  });
});
