import { describe, expect, it } from 'vitest';

import { benchmark, MultiplesValidationError, runMultiples } from '@/common/ma/valuation';

describe('runMultiples', () => {
  it('applies EV/EBITDA benchmarks and converts to equity value via net debt', () => {
    const result = runMultiples({
      ebitda: 10,
      netDebt: 5,
      benchmarks: [benchmark('ev_ebitda', 5, 7, 9)],
    });
    expect(result.perMetric).toHaveLength(1);
    const row = result.perMetric[0];
    expect(row.metric).toBe('ev_ebitda');
    expect(row.low).toBeCloseTo(10 * 5 - 5, 6);
    expect(row.central).toBeCloseTo(10 * 7 - 5, 6);
    expect(row.high).toBeCloseTo(10 * 9 - 5, 6);
  });

  it('applies EV/Revenue benchmarks', () => {
    const result = runMultiples({
      revenue: 100,
      netDebt: 20,
      benchmarks: [benchmark('ev_revenue', 1, 1.5, 2)],
    });
    const row = result.perMetric[0];
    expect(row.low).toBeCloseTo(100 - 20, 6);
    expect(row.central).toBeCloseTo(150 - 20, 6);
    expect(row.high).toBeCloseTo(200 - 20, 6);
  });

  it('applies P/E benchmarks without subtracting net debt (equity-side)', () => {
    const result = runMultiples({
      netIncome: 10,
      netDebt: 50,
      benchmarks: [benchmark('p_e', 8, 12, 18)],
    });
    const row = result.perMetric[0];
    expect(row.low).toBeCloseTo(80, 6);
    expect(row.central).toBeCloseTo(120, 6);
    expect(row.high).toBeCloseTo(180, 6);
  });

  it('skips benchmarks whose corresponding metric is not provided', () => {
    const result = runMultiples({
      revenue: 100,
      benchmarks: [benchmark('ev_ebitda', 5, 7, 9), benchmark('ev_revenue', 1, 2, 3)],
    });
    expect(result.perMetric).toHaveLength(1);
    expect(result.perMetric[0].metric).toBe('ev_revenue');
  });

  it('throws if no benchmark can be computed', () => {
    expect(() =>
      runMultiples({
        ebitda: 10,
        benchmarks: [benchmark('ev_revenue', 1, 2, 3)],
      })
    ).toThrow(MultiplesValidationError);
  });

  it('rejects malformed benchmarks (high < median)', () => {
    expect(() =>
      runMultiples({
        ebitda: 10,
        benchmarks: [benchmark('ev_ebitda', 5, 9, 7)],
      })
    ).toThrow(MultiplesValidationError);
  });

  it('rejects negative benchmark multipliers', () => {
    expect(() =>
      runMultiples({
        ebitda: 10,
        benchmarks: [benchmark('ev_ebitda', -1, 1, 2)],
      })
    ).toThrow(MultiplesValidationError);
  });

  it('aggregate envelope spans the lowest low and highest high across metrics', () => {
    const result = runMultiples({
      ebitda: 10,
      revenue: 100,
      netIncome: 5,
      benchmarks: [benchmark('ev_ebitda', 5, 7, 9), benchmark('ev_revenue', 1, 1.5, 2), benchmark('p_e', 8, 12, 18)],
    });
    const lows = result.perMetric.map((m) => m.low);
    const highs = result.perMetric.map((m) => m.high);
    expect(result.aggregate.low).toBe(Math.min(...lows));
    expect(result.aggregate.high).toBe(Math.max(...highs));
    expect(result.aggregate.method).toBe('multiples');
  });

  it('honors a custom currency code', () => {
    const result = runMultiples(
      {
        ebitda: 10,
        benchmarks: [benchmark('ev_ebitda', 5, 7, 9)],
      },
      'USD'
    );
    expect(result.aggregate.currency).toBe('USD');
  });
});
