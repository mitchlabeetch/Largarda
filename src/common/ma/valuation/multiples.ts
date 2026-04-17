/**
 * Multiples-based valuation (*Valorisation par les comparables*).
 *
 * Supported metrics:
 *   - EV/EBITDA — enterprise value driven
 *   - EV/Revenue — enterprise value driven
 *   - P/E — equity value driven (uses net income)
 *
 * The caller supplies sector benchmarks (low / median / high). A simple
 * aggregate range is computed as the union envelope across usable metrics.
 */

import type {
  MultipleBenchmark,
  MultiplesInputs,
  MultiplesMetric,
  MultiplesOutput,
  MultiplesResult,
  ValuationRange,
} from './types';

export class MultiplesValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MultiplesValidationError';
  }
}

function validateBenchmark(b: MultipleBenchmark): void {
  if (!(b.low <= b.median && b.median <= b.high)) {
    throw new MultiplesValidationError(
      `benchmark low/median/high must satisfy low <= median <= high for metric ${b.metric}`
    );
  }
  if (b.low < 0) {
    throw new MultiplesValidationError(`benchmark multipliers must be non-negative for ${b.metric}`);
  }
}

function metricInputValue(metric: MultiplesMetric, inputs: MultiplesInputs): number | undefined {
  switch (metric) {
    case 'ev_ebitda':
      return inputs.ebitda;
    case 'ev_revenue':
      return inputs.revenue;
    case 'p_e':
      return inputs.netIncome;
  }
}

function isEquityMetric(metric: MultiplesMetric): boolean {
  return metric === 'p_e';
}

function computeOne(b: MultipleBenchmark, inputs: MultiplesInputs): MultiplesOutput | null {
  validateBenchmark(b);
  const base = metricInputValue(b.metric, inputs);
  if (base === undefined) {
    return null;
  }
  const netDebt = inputs.netDebt ?? 0;
  const toEquity = (ev: number): number => (isEquityMetric(b.metric) ? ev : ev - netDebt);
  return {
    metric: b.metric,
    low: toEquity(base * b.low),
    central: toEquity(base * b.median),
    high: toEquity(base * b.high),
  };
}

/**
 * Run a multiples valuation across a set of benchmarks.
 */
export function runMultiples(inputs: MultiplesInputs, currency = 'EUR'): MultiplesResult {
  const perMetric: MultiplesOutput[] = [];
  for (const b of inputs.benchmarks) {
    const out = computeOne(b, inputs);
    if (out) {
      perMetric.push(out);
    }
  }

  if (perMetric.length === 0) {
    throw new MultiplesValidationError(
      'No multiples metric could be computed — provide at least one of revenue / ebitda / netIncome matching a benchmark'
    );
  }

  const lows = perMetric.map((m) => m.low);
  const centrals = perMetric.map((m) => m.central);
  const highs = perMetric.map((m) => m.high);
  const centralMean = centrals.reduce((sum, v) => sum + v, 0) / centrals.length;

  const aggregate: ValuationRange = {
    method: 'multiples',
    low: Math.min(...lows),
    central: centralMean,
    high: Math.max(...highs),
    currency,
  };

  return { perMetric, aggregate };
}

/**
 * Convenience helper: build a benchmark for a single metric.
 */
export function benchmark(metric: MultiplesMetric, low: number, median: number, high: number): MultipleBenchmark {
  return { metric, low, median, high };
}
