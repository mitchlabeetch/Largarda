/**
 * Sensitivity analysis for the DCF valuation.
 *
 * Builds a 1D sweep on a chosen axis (WACC, growth rate, or terminal growth
 * rate) and returns the equity value at each point. This is the foundation of
 * the tornado and football-field charts generated downstream.
 */

import { runDcf } from './dcf';
import type { DcfInputs, SensitivityAxis, SensitivityPoint, SensitivityResult } from './types';

export type SensitivityOptions = {
  readonly axis: SensitivityAxis;
  readonly values: readonly number[];
};

export class SensitivityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SensitivityValidationError';
  }
}

function overrideAxis(base: DcfInputs, axis: SensitivityAxis, value: number): DcfInputs {
  switch (axis) {
    case 'wacc':
      return { ...base, wacc: value };
    case 'growthRate':
      return { ...base, growthRate: value };
    case 'terminalGrowthRate':
      return { ...base, terminalGrowthRate: value };
  }
}

/**
 * Run a 1-axis sensitivity on a DCF model.
 */
export function runSensitivity(base: DcfInputs, options: SensitivityOptions): SensitivityResult {
  if (options.values.length === 0) {
    throw new SensitivityValidationError('at least one value is required for sensitivity sweep');
  }

  const points: SensitivityPoint[] = [];
  for (const value of options.values) {
    const variant = overrideAxis(base, options.axis, value);
    const result = runDcf(variant);
    points.push({ axis: options.axis, value, equityValue: result.equityValue });
  }

  const equities = points.map((p) => p.equityValue);
  return {
    axis: options.axis,
    points,
    min: Math.min(...equities),
    max: Math.max(...equities),
  };
}
