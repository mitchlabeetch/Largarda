/**
 * Public entry point for the Largo M&A valuation engine.
 *
 * This module exposes pure, process-agnostic functions covering the four
 * standard methods used on French small & mid-cap transactions:
 *
 *   - DCF (*Flux de trésorerie actualisés*)         — {@link runDcf}
 *   - Multiples / comparables                        — {@link runMultiples}
 *   - *Actif Net Réévalué* (ANR)                     — {@link runAnr}
 *   - *Règle du pouce* (sector heuristic)            — {@link runRuleOfThumb}
 *
 * Plus supporting helpers:
 *   - Sensitivity sweeps                             — {@link runSensitivity}
 *   - Football-field aggregation                     — {@link buildFootballField}
 */

export * from './types';
export { runDcf, DcfValidationError } from './dcf';
export { runMultiples, benchmark, MultiplesValidationError } from './multiples';
export { runAnr, AnrValidationError } from './anr';
export { runRuleOfThumb, DEFAULT_RULES, RuleOfThumbValidationError } from './ruleOfThumb';
export { runSensitivity, SensitivityValidationError } from './sensitivity';
export { buildFootballField, FootballFieldValidationError } from './footballField';
export type { RuleOfThumbOptions } from './ruleOfThumb';
export type { SensitivityOptions } from './sensitivity';
