/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format a date with French locale defaults
 * @param value - The date value to format (Date object, timestamp, or string)
 * @param locale - The locale to use for formatting (defaults to 'fr-FR')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string (e.g., "20 avril 2026")
 */
export function date(
  value: Date | number | string,
  locale: string = 'fr-FR',
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
): string {
  const dateValue = typeof value === 'number' || typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, options).format(dateValue);
}
