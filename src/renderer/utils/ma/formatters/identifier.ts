/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Identifier formatting utilities for M&A surfaces
 * Handles French company identifiers (SIREN/SIRET) and other IDs
 */

import type { CompanyInfo } from '@/common/ma/types';

/**
 * Format a French SIREN number (9 digits) with spacing
 * @param siren - 9-digit SIREN number as string
 * @returns Formatted SIREN string (e.g., "123 456 789")
 */
export function formatSiren(siren: string): string {
  if (!siren) return '';
  if (siren.length !== 9) return siren;
  return `${siren.slice(0, 3)} ${siren.slice(3, 6)} ${siren.slice(6)}`;
}

/**
 * Format a French SIRET number (14 digits) with spacing
 * @param siret - 14-digit SIRET number as string
 * @returns Formatted SIRET string (e.g., "123 456 789 00012")
 */
export function formatSiret(siret: string): string {
  if (!siret) return '';
  if (siret.length !== 14) return siret;
  return `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9)}`;
}

/**
 * Format company identifiers from CompanyInfo
 * @param company - Company info object
 * @returns Object with formatted identifiers
 */
export function formatCompanyIdentifiers(company: CompanyInfo): {
  siren?: string;
  siret?: string;
} {
  return {
    siren: company.siren ? formatSiren(company.siren) : undefined,
    siret: company.siret ? formatSiret(company.siret) : undefined,
  };
}

/**
 * Format a UUID with optional truncation
 * @param uuid - UUID string
 * @param truncate - Whether to truncate to first 8 characters (default: false)
 * @returns Formatted UUID string
 */
export function formatUuid(uuid: string, truncate = false): string {
  if (truncate && uuid.length >= 8) {
    return `${uuid.slice(0, 8)}...`;
  }
  return uuid;
}
