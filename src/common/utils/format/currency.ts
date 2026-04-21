/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format a number as currency with French locale defaults
 * @param value - The numeric value to format
 * @param locale - The locale to use for formatting (defaults to 'fr-FR')
 * @param currency - The currency code (defaults to 'EUR')
 * @returns Formatted currency string (e.g., "1 234,56 €")
 */
export function currency(value: number, locale: string = 'fr-FR', currency: string = 'EUR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
