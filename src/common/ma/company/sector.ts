/**
 * Attach sector resolution to a merged {@link CompanyProfile} without
 * coupling the company merge logic to the sector catalogue (see ADR 0004).
 *
 * Consumers call {@link resolveProfileSector} whenever they need a sector
 * badge on a profile card or want to feed the valuation engine with a
 * sensible rule-of-thumb default.
 */

import { resolveSectorFromNaf } from '../sector/catalogue';
import type { SectorResolution } from '../sector/types';
import type { CompanyProfile } from './types';

/**
 * Resolve the M&A sector for a company profile.
 *
 * Returns `undefined` when the profile does not expose a NAF code (both
 * upstream payloads omitted it). Otherwise, the returned {@link SectorResolution}
 * always carries a sector — unknown NAF codes fall back to the reserved
 * `'other'` sector (see ADR 0005).
 */
export function resolveProfileSector(profile: CompanyProfile): SectorResolution | undefined {
  const nafCode = profile.nafCode?.value;
  if (!nafCode) return undefined;
  return resolveSectorFromNaf(nafCode);
}
