/**
 * *Règle du pouce* — sector-specific heuristic valuation.
 *
 * These rules come from practitioner convention for very small businesses
 * (commerçants, artisans, TPE) where formal DCF or multiples are not
 * practical. Default multipliers can be overridden by the caller.
 */

import type { RuleOfThumbInputs, RuleOfThumbRule, RuleOfThumbSector, ValuationRange } from './types';

export class RuleOfThumbValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleOfThumbValidationError';
  }
}

/**
 * Default French practitioner multipliers for common small-business sectors.
 * Figures are indicative and should be validated against recent transactions.
 */
export const DEFAULT_RULES: Readonly<Record<RuleOfThumbSector, RuleOfThumbRule>> = Object.freeze({
  pharmacie: {
    sector: 'pharmacie',
    basis: 'revenue',
    lowMultiplier: 0.7,
    centralMultiplier: 0.85,
    highMultiplier: 1.0,
  },
  restaurant: {
    sector: 'restaurant',
    basis: 'revenue',
    lowMultiplier: 0.4,
    centralMultiplier: 0.55,
    highMultiplier: 0.8,
  },
  boulangerie: {
    sector: 'boulangerie',
    basis: 'revenue',
    lowMultiplier: 0.5,
    centralMultiplier: 0.7,
    highMultiplier: 0.9,
  },
  cabinet_expertise_comptable: {
    sector: 'cabinet_expertise_comptable',
    basis: 'revenue',
    lowMultiplier: 0.9,
    centralMultiplier: 1.1,
    highMultiplier: 1.4,
  },
  agence_immobiliere: {
    sector: 'agence_immobiliere',
    basis: 'gross_margin',
    lowMultiplier: 0.6,
    centralMultiplier: 0.8,
    highMultiplier: 1.1,
  },
  salon_coiffure: {
    sector: 'salon_coiffure',
    basis: 'revenue',
    lowMultiplier: 0.4,
    centralMultiplier: 0.55,
    highMultiplier: 0.75,
  },
  ecommerce: {
    sector: 'ecommerce',
    basis: 'ebitda',
    lowMultiplier: 4,
    centralMultiplier: 6,
    highMultiplier: 9,
  },
  saas: {
    sector: 'saas',
    basis: 'revenue',
    lowMultiplier: 2,
    centralMultiplier: 4,
    highMultiplier: 8,
  },
});

function pickBasisValue(rule: RuleOfThumbRule, inputs: RuleOfThumbInputs): number {
  switch (rule.basis) {
    case 'revenue':
      if (inputs.revenue === undefined) {
        throw new RuleOfThumbValidationError(`sector ${rule.sector} requires revenue`);
      }
      return inputs.revenue;
    case 'ebitda':
      if (inputs.ebitda === undefined) {
        throw new RuleOfThumbValidationError(`sector ${rule.sector} requires ebitda`);
      }
      return inputs.ebitda;
    case 'gross_margin':
      if (inputs.grossMargin === undefined) {
        throw new RuleOfThumbValidationError(`sector ${rule.sector} requires grossMargin`);
      }
      return inputs.grossMargin;
  }
}

export type RuleOfThumbOptions = {
  readonly rule?: RuleOfThumbRule;
  readonly currency?: string;
};

/**
 * Compute an indicative valuation range using the rule-of-thumb method.
 */
export function runRuleOfThumb(inputs: RuleOfThumbInputs, options: RuleOfThumbOptions = {}): ValuationRange {
  const rule = options.rule ?? DEFAULT_RULES[inputs.sector];
  if (!rule) {
    throw new RuleOfThumbValidationError(`unknown sector: ${inputs.sector}`);
  }
  if (rule.lowMultiplier < 0 || rule.centralMultiplier < 0 || rule.highMultiplier < 0) {
    throw new RuleOfThumbValidationError('multipliers must be non-negative');
  }
  if (!(rule.lowMultiplier <= rule.centralMultiplier && rule.centralMultiplier <= rule.highMultiplier)) {
    throw new RuleOfThumbValidationError('multipliers must satisfy low <= central <= high');
  }

  const base = pickBasisValue(rule, inputs);
  return {
    method: 'rule-of-thumb',
    low: base * rule.lowMultiplier,
    central: base * rule.centralMultiplier,
    high: base * rule.highMultiplier,
    currency: options.currency ?? 'EUR',
  };
}
