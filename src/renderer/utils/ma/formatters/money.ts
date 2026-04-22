/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Money/currency formatting utilities for M&A surfaces
 * Uses locale-aware formatting from Intl API
 */

import { useTranslation } from 'react-i18next';

/**
 * Format a monetary value with currency symbol
 * @param value - Monetary value
 * @param currency - ISO 4217 currency code (default: "USD")
 * @param decimals - Number of decimal places (default: 0 for whole amounts)
 * @param locale - Optional locale string (defaults to current i18n locale)
 * @returns Formatted currency string (e.g., "$1,500,000")
 */
export function formatCurrency(
  value: number,
  currency = 'USD',
  decimals = 0,
  locale?: string
): string {
  return value.toLocaleString(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a large monetary value with abbreviated scale (K, M, B)
 * @param value - Monetary value
 * @param currency - ISO 4217 currency code (default: "USD")
 * @param decimals - Number of decimal places (default: 1)
 * @param locale - Optional locale string (defaults to current i18n locale)
 * @returns Formatted abbreviated currency string (e.g., "$1.5M")
 */
export function formatCurrencyAbbreviated(
  value: number,
  currency = 'USD',
  decimals = 1,
  locale?: string
): string {
  const absValue = Math.abs(value);
  let scale = '';
  let scaledValue = value;

  if (absValue >= 1_000_000_000) {
    scale = 'B';
    scaledValue = value / 1_000_000_000;
  } else if (absValue >= 1_000_000) {
    scale = 'M';
    scaledValue = value / 1_000_000;
  } else if (absValue >= 1_000) {
    scale = 'K';
    scaledValue = value / 1_000;
  }

  const symbol = new Intl.NumberFormat(locale, { style: 'currency', currency })
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value ?? currency;

  return `${symbol}${formatNumber(scaledValue, decimals, locale)}${scale}`;
}

/**
 * Format a number (helper for abbreviated formatting)
 */
function formatNumber(value: number, decimals: number, locale?: string): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Hook that returns formatters using current i18n locale
 */
export function useMaMoneyFormatters() {
  const { i18n } = useTranslation();

  return {
    formatCurrency: (value: number, currency = 'USD', decimals = 0) =>
      formatCurrency(value, currency, decimals, i18n.language),
    formatCurrencyAbbreviated: (value: number, currency = 'USD', decimals = 1) =>
      formatCurrencyAbbreviated(value, currency, decimals, i18n.language),
  };
}
