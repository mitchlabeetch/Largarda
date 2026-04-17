/**
 * Merge SIRENE + Pappers payloads into a single {@link CompanyProfile}.
 *
 * Conflict resolution rule set (documented in ADR 0004):
 *   - `identifiers.siren` must match across payloads or we throw.
 *   - For fields present in both, **SIRENE wins** for registration-centric
 *     facts (legal name, NAF, incorporation year, head office address,
 *     workforce).
 *   - Pappers provides the sole source for governance (directors,
 *     beneficial owners), financials, share capital, and the collective
 *     proceeding flag.
 *   - `tradeName` and `legalForm` fall back to Pappers only when SIRENE is
 *     silent.
 *   - Every merged field tracks the winning source via {@link SourcedValue}.
 *   - The returned `sources` array lists every payload that contributed,
 *     in insertion order (SIRENE first, Pappers second), de-duplicated by
 *     `source + fetchedAt`.
 */

import type {
  CompanyProfile,
  PappersPayload,
  SirenePayload,
  SourceAttribution,
  SourcedValue,
} from './types';

export class CompanyProfileMergeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompanyProfileMergeError';
  }
}

const SIREN_REGEX = /^\d{9}$/;
const SIRET_REGEX = /^\d{14}$/;

function validateSiren(siren: string, where: string): void {
  if (!SIREN_REGEX.test(siren)) {
    throw new CompanyProfileMergeError(`${where}: SIREN must be 9 digits, got "${siren}"`);
  }
}

function validateSiret(siret: string | undefined, where: string): void {
  if (siret !== undefined && !SIRET_REGEX.test(siret)) {
    throw new CompanyProfileMergeError(`${where}: SIRET must be 14 digits, got "${siret}"`);
  }
}

function sourced<T>(value: T, attribution: SourceAttribution): SourcedValue<T> {
  return { value, attribution };
}

function deduplicateSources(list: readonly SourceAttribution[]): readonly SourceAttribution[] {
  const seen = new Set<string>();
  const out: SourceAttribution[] = [];
  for (const attribution of list) {
    const key = `${attribution.source}@${attribution.fetchedAt}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(attribution);
    }
  }
  return out;
}

export type MergeInputs = {
  readonly sirene?: SirenePayload;
  readonly pappers?: PappersPayload;
};

/** Build a {@link CompanyProfile} from one or both upstream payloads. */
export function mergeCompanyProfile({ sirene, pappers }: MergeInputs): CompanyProfile {
  if (!sirene && !pappers) {
    throw new CompanyProfileMergeError('At least one of SIRENE or Pappers payloads must be provided');
  }

  if (sirene) {
    validateSiren(sirene.identifiers.siren, 'sirene');
    validateSiret(sirene.identifiers.siret, 'sirene');
  }
  if (pappers) {
    validateSiren(pappers.identifiers.siren, 'pappers');
    validateSiret(pappers.identifiers.siret, 'pappers');
  }

  if (sirene && pappers && sirene.identifiers.siren !== pappers.identifiers.siren) {
    throw new CompanyProfileMergeError(
      `SIREN mismatch between payloads: sirene=${sirene.identifiers.siren} vs pappers=${pappers.identifiers.siren}`
    );
  }

  const sireneAttr: SourceAttribution | undefined = sirene
    ? { source: 'sirene', fetchedAt: sirene.fetchedAt }
    : undefined;
  const pappersAttr: SourceAttribution | undefined = pappers
    ? { source: 'pappers', fetchedAt: pappers.fetchedAt }
    : undefined;

  const identifiers = {
    siren: (sirene?.identifiers.siren ?? pappers?.identifiers.siren) as string,
    siret: sirene?.identifiers.siret ?? pappers?.identifiers.siret,
    vatNumber: pappers?.identifiers.vatNumber ?? sirene?.identifiers.vatNumber,
  };

  const legalNameFromSirene = sirene?.legalName;
  const legalNameFromPappers = pappers?.legalName;
  let legalName: SourcedValue<string>;
  if (legalNameFromSirene && sireneAttr) {
    legalName = sourced(legalNameFromSirene, sireneAttr);
  } else if (legalNameFromPappers && pappersAttr) {
    legalName = sourced(legalNameFromPappers, pappersAttr);
  } else {
    throw new CompanyProfileMergeError('legalName is missing from every payload');
  }

  const pick = <T>(
    fromSirene: T | undefined,
    fromPappers: T | undefined,
    sireneWins: boolean
  ): SourcedValue<T> | undefined => {
    if (sireneWins) {
      if (fromSirene !== undefined && sireneAttr) return sourced(fromSirene, sireneAttr);
      if (fromPappers !== undefined && pappersAttr) return sourced(fromPappers, pappersAttr);
    } else {
      if (fromPappers !== undefined && pappersAttr) return sourced(fromPappers, pappersAttr);
      if (fromSirene !== undefined && sireneAttr) return sourced(fromSirene, sireneAttr);
    }
    return undefined;
  };

  const profile: CompanyProfile = {
    identifiers,
    legalName,
    tradeName: pick(sirene?.tradeName, pappers?.tradeName, true),
    legalForm: pick(sirene?.legalForm, pappers?.legalForm, true),
    nafCode: pick(sirene?.nafCode, pappers?.nafCode, true),
    headOfficeAddress: pick(sirene?.headOfficeAddress, pappers?.headOfficeAddress, true),
    workforce: pick(sirene?.workforce, undefined, true),
    incorporationYear: pick(sirene?.incorporationYear, undefined, true),
    shareCapital: pappers?.shareCapital && pappersAttr ? sourced(pappers.shareCapital, pappersAttr) : undefined,
    directors: (pappers?.directors ?? []).map((d) =>
      sourced(d, pappersAttr as SourceAttribution)
    ),
    beneficialOwners: (pappers?.beneficialOwners ?? []).map((o) =>
      sourced(o, pappersAttr as SourceAttribution)
    ),
    latestFinancials: pappers?.latestFinancials && pappersAttr
      ? sourced(pappers.latestFinancials, pappersAttr)
      : undefined,
    inCollectiveProceeding:
      pappers?.inCollectiveProceeding !== undefined && pappersAttr
        ? sourced(pappers.inCollectiveProceeding, pappersAttr)
        : undefined,
    sources: deduplicateSources(
      [sireneAttr, pappersAttr].filter((attr): attr is SourceAttribution => attr !== undefined)
    ),
  };

  return profile;
}
