/**
 * Public surface for the sector taxonomy module.
 *
 * See ADR 0005 for the NAF rev. 2 → M&A sector mapping rationale.
 */

export * from './types';
export { SECTORS, resolveSectorFromNaf, getSectorById, resolveRuleOfThumbSector } from './catalogue';
