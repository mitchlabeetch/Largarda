/**
 * Football-field aggregation: combines the ranges produced by each valuation
 * method into a single chart-ready structure, plus an overall envelope.
 */

import type { FootballFieldInputs, FootballFieldResult, ValuationRange } from './types';

export class FootballFieldValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FootballFieldValidationError';
  }
}

function validateRange(range: ValuationRange): void {
  if (!(range.low <= range.central && range.central <= range.high)) {
    throw new FootballFieldValidationError(`range for method ${range.method} must satisfy low <= central <= high`);
  }
}

/**
 * Build a football-field summary from several valuation ranges.
 */
export function buildFootballField(inputs: FootballFieldInputs): FootballFieldResult {
  if (inputs.ranges.length === 0) {
    throw new FootballFieldValidationError('at least one range is required');
  }

  const currencies = new Set(inputs.ranges.map((r) => r.currency));
  if (currencies.size > 1) {
    throw new FootballFieldValidationError('all ranges must share the same currency');
  }

  for (const range of inputs.ranges) {
    validateRange(range);
  }

  const lows = inputs.ranges.map((r) => r.low);
  const highs = inputs.ranges.map((r) => r.high);
  const centrals = inputs.ranges.map((r) => r.central);
  const centralMean = centrals.reduce((sum, v) => sum + v, 0) / centrals.length;

  return {
    ranges: inputs.ranges,
    overall: {
      low: Math.min(...lows),
      central: centralMean,
      high: Math.max(...highs),
    },
  };
}
