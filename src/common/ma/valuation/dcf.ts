/**
 * Discounted Cash Flow (DCF / *Flux de trésorerie actualisés*) valuation.
 *
 * Produces projected cash flows, discounted cash flows, a Gordon-Shapiro
 * terminal value, and the resulting enterprise + equity value.
 *
 * References:
 *   - Damodaran, A. (2012), *Investment Valuation*, 3rd ed., Chapter 12.
 *   - Vernimmen, Corporate Finance: Theory and Practice, 6th ed., Chapter 31.
 */

import type { DcfInputs, DcfResult } from './types';

export class DcfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DcfValidationError';
  }
}

function validate(inputs: DcfInputs): void {
  if (!Number.isFinite(inputs.baseFreeCashFlow)) {
    throw new DcfValidationError('baseFreeCashFlow must be finite');
  }
  if (!Number.isFinite(inputs.wacc) || inputs.wacc <= 0) {
    throw new DcfValidationError('wacc must be a positive finite number');
  }
  if (!Number.isFinite(inputs.growthRate)) {
    throw new DcfValidationError('growthRate must be finite');
  }
  if (!Number.isFinite(inputs.terminalGrowthRate)) {
    throw new DcfValidationError('terminalGrowthRate must be finite');
  }
  if (inputs.terminalGrowthRate >= inputs.wacc) {
    throw new DcfValidationError('terminalGrowthRate must be strictly less than wacc');
  }
  if (!Number.isInteger(inputs.projectionYears) || inputs.projectionYears < 1) {
    throw new DcfValidationError('projectionYears must be a positive integer');
  }
  if (inputs.cashFlowSeriesOverride && inputs.cashFlowSeriesOverride.length !== inputs.projectionYears) {
    throw new DcfValidationError('cashFlowSeriesOverride length must match projectionYears');
  }
}

function buildCashFlowSeries(inputs: DcfInputs): readonly number[] {
  if (inputs.cashFlowSeriesOverride) {
    return inputs.cashFlowSeriesOverride;
  }
  const series: number[] = [];
  let current = inputs.baseFreeCashFlow;
  for (let year = 1; year <= inputs.projectionYears; year += 1) {
    current = current * (1 + inputs.growthRate);
    series.push(current);
  }
  return series;
}

/**
 * Run a standard DCF valuation.
 */
export function runDcf(inputs: DcfInputs): DcfResult {
  validate(inputs);

  const projected = buildCashFlowSeries(inputs);
  const discountFactor = (year: number): number => Math.pow(1 + inputs.wacc, year);

  const discounted: number[] = projected.map((cf, idx) => cf / discountFactor(idx + 1));

  const finalYearCashFlow = projected[projected.length - 1] ?? 0;
  const terminalCashFlow = finalYearCashFlow * (1 + inputs.terminalGrowthRate);
  const terminalValue = terminalCashFlow / (inputs.wacc - inputs.terminalGrowthRate);
  const discountedTerminalValue = terminalValue / discountFactor(inputs.projectionYears);

  const enterpriseValue = discounted.reduce((sum, value) => sum + value, 0) + discountedTerminalValue;
  const equityValue = enterpriseValue - (inputs.netDebt ?? 0);

  return {
    projectedCashFlows: projected,
    discountedCashFlows: discounted,
    terminalValue,
    discountedTerminalValue,
    enterpriseValue,
    equityValue,
  };
}
