/**
 * Public surface for the unified company-profile module.
 *
 * See ADR 0004 for the merge semantics and field ownership rules.
 */

export * from './types';
export { mergeCompanyProfile, CompanyProfileMergeError } from './merge';
export type { MergeInputs } from './merge';
