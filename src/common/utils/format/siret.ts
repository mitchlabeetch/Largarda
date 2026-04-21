/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format a SIRET (French establishment identification number) with proper spacing
 * SIRET is 14 digits, formatted as "NNNNN NNNNN NNNN"
 * @param value - The SIRET number as string or number
 * @returns Formatted SIRET string (e.g., "12345 67890 1234")
 */
export function siret(value: string | number): string {
  const siretStr = String(value).replace(/\D/g, '');
  if (siretStr.length !== 14) {
    return siretStr; // Return as-is if not a valid SIRET length
  }
  return `${siretStr.slice(0, 5)} ${siretStr.slice(5, 10)} ${siretStr.slice(10)}`;
}
