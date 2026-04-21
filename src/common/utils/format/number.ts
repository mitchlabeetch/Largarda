/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format a number with French locale grouping (space as thousands separator)
 * @param value - The numeric value to format
 * @param locale - The locale to use for formatting (defaults to 'fr-FR')
 * @param decimals - Number of decimal places (defaults to 2)
 * @returns Formatted number string (e.g., "1 234,56")
 */
export function number(value: number, locale: string = 'fr-FR', decimals: number = 2): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
