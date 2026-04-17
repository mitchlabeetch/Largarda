/**
 * *Actif Net Réévalué* (ANR) — Adjusted Net Assets valuation.
 *
 * Starts from book equity (assets - liabilities) and applies revaluation
 * adjustments for hidden reserves, real-estate, intangibles, etc.
 */

import type { AnrInputs, AnrResult } from './types';

export class AnrValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnrValidationError';
  }
}

function validate(inputs: AnrInputs): void {
  if (!Number.isFinite(inputs.totalAssets)) {
    throw new AnrValidationError('totalAssets must be finite');
  }
  if (!Number.isFinite(inputs.totalLiabilities)) {
    throw new AnrValidationError('totalLiabilities must be finite');
  }
  if (inputs.adjustments) {
    for (const adj of inputs.adjustments) {
      if (!Number.isFinite(adj)) {
        throw new AnrValidationError('every adjustment must be finite');
      }
    }
  }
}

/**
 * Compute the adjusted net assets (*actif net réévalué*) for a company.
 */
export function runAnr(inputs: AnrInputs): AnrResult {
  validate(inputs);
  const bookEquity = inputs.totalAssets - inputs.totalLiabilities;
  const adjustments = inputs.adjustments ?? [];
  const totalAdjustment = adjustments.reduce((sum, adj) => sum + adj, 0);
  return {
    bookEquity,
    totalAdjustment,
    revaluedEquity: bookEquity + totalAdjustment,
  };
}
