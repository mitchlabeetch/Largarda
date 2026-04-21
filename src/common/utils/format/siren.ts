/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format a SIREN (French business identification number) with proper spacing
 * SIREN is 9 digits, formatted as "NNN NNN NNN"
 * @param value - The SIREN number as string or number
 * @returns Formatted SIREN string (e.g., "123 456 789")
 */
export function siren(value: string | number): string {
  const sirenStr = String(value).replace(/\D/g, '');
  if (sirenStr.length !== 9) {
    return sirenStr; // Return as-is if not a valid SIREN length
  }
  return `${sirenStr.slice(0, 3)} ${sirenStr.slice(3, 6)} ${sirenStr.slice(6)}`;
}
