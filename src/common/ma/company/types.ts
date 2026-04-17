/**
 * Unified company profile types (ROADMAP § 1.5).
 *
 * The profile is a process-agnostic shape that merges data points from
 * INSEE SIRENE v3 (authoritative registration data) and Pappers (legal,
 * financial and governance overlay). Every field carries provenance via
 * {@link SourceAttribution} so downstream UI can render a "source" badge.
 *
 * This module lives under `src/common/` and must not import from
 * Electron, Node-only APIs, or the renderer.
 */

/** Known upstream providers. Extend carefully — consumers switch on this. */
export type ProfileSource = 'sirene' | 'pappers';

export type SourceAttribution = {
  readonly source: ProfileSource;
  /** ISO-8601 UTC timestamp of when the upstream record was fetched. */
  readonly fetchedAt: string;
};

export type SourcedValue<T> = {
  readonly value: T;
  readonly attribution: SourceAttribution;
};

/** Legal identifiers. SIREN is 9 digits, SIRET is 14 digits. */
export type CompanyIdentifiers = {
  readonly siren: string;
  /** Principal establishment SIRET when available. */
  readonly siret?: string;
  /** EU VAT number (optional, Pappers-sourced). */
  readonly vatNumber?: string;
};

export type Address = {
  readonly street: string;
  readonly postalCode: string;
  readonly city: string;
  readonly country: string;
};

export type Director = {
  readonly fullName: string;
  /** *Fonction* (e.g. "Président", "Gérant", "DG"). */
  readonly role: string;
  /** Optional, Pappers sometimes exposes the appointment year. */
  readonly appointedYear?: number;
};

export type BeneficialOwner = {
  readonly fullName: string;
  /** Percentage of capital held (0..1). */
  readonly ownershipPct: number;
};

export type FinancialsSnapshot = {
  readonly fiscalYear: number;
  readonly revenue?: number;
  readonly ebitda?: number;
  readonly netIncome?: number;
  readonly totalAssets?: number;
  readonly totalLiabilities?: number;
  readonly currency: string;
};

/**
 * Flat, renderer-friendly shape. Every field is either:
 *   - mandatory (SIREN, legal name, source provenance), or
 *   - optional + carries its own {@link SourceAttribution}.
 */
export type CompanyProfile = {
  readonly identifiers: CompanyIdentifiers;
  /** *Raison sociale*. */
  readonly legalName: SourcedValue<string>;
  readonly tradeName?: SourcedValue<string>;
  /** *Forme juridique* (SAS, SARL, SA, SCI, EURL, etc.). */
  readonly legalForm?: SourcedValue<string>;
  /** NAF rev. 2 code (e.g. "47.73Z"). */
  readonly nafCode?: SourcedValue<string>;
  readonly headOfficeAddress?: SourcedValue<Address>;
  /** *Effectif* — INSEE categorical or numeric. */
  readonly workforce?: SourcedValue<number>;
  /** *Capital social* in the reference currency. */
  readonly shareCapital?: SourcedValue<{ readonly amount: number; readonly currency: string }>;
  readonly incorporationYear?: SourcedValue<number>;
  readonly directors: readonly SourcedValue<Director>[];
  readonly beneficialOwners: readonly SourcedValue<BeneficialOwner>[];
  readonly latestFinancials?: SourcedValue<FinancialsSnapshot>;
  /** True when upstream flagged one of *redressement*, *liquidation*, *sauvegarde*. */
  readonly inCollectiveProceeding?: SourcedValue<boolean>;
  /** List of every upstream we merged to produce this profile. */
  readonly sources: readonly SourceAttribution[];
};

export type SirenePayload = {
  readonly identifiers: CompanyIdentifiers;
  readonly legalName: string;
  readonly tradeName?: string;
  readonly legalForm?: string;
  readonly nafCode?: string;
  readonly headOfficeAddress?: Address;
  readonly workforce?: number;
  readonly incorporationYear?: number;
  readonly fetchedAt: string;
};

export type PappersPayload = {
  readonly identifiers: CompanyIdentifiers;
  readonly legalName?: string;
  readonly tradeName?: string;
  readonly legalForm?: string;
  readonly nafCode?: string;
  readonly headOfficeAddress?: Address;
  readonly shareCapital?: { readonly amount: number; readonly currency: string };
  readonly directors?: readonly Director[];
  readonly beneficialOwners?: readonly BeneficialOwner[];
  readonly latestFinancials?: FinancialsSnapshot;
  readonly inCollectiveProceeding?: boolean;
  readonly fetchedAt: string;
};
