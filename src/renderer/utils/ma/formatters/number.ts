/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Number formatting utilities for M&A surfaces
 * Uses locale-aware formatting from Intl API
 */

import { useTranslation } from 'react-i18next';

/**
 * Format a number with specified decimal places
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @param locale - Optional locale string (defaults to current i18n locale)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals = 0, locale?: string): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a percentage value
 * @param value - Number between 0 and 100
 * @param decimals - Number of decimal places (default: 1)
 * @param locale - Optional locale string (defaults to current i18n locale)
 * @returns Formatted percentage string (e.g., "75.5%")
 */
export function formatPercentage(value: number, decimals = 1, locale?: string): string {
  return `${formatNumber(value, decimals, locale)}%`;
}

/**
 * Format a file size in bytes to human-readable format
 * @param bytes - Size in bytes
 * @param locale - Optional locale string (defaults to current i18n locale)
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number, locale?: string): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, 1, locale)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${formatNumber(bytes / (1024 * 1024), 1, locale)} MB`;
  return `${formatNumber(bytes / (1024 * 1024 * 1024), 1, locale)} GB`;
}

/**
 * Hook that returns formatters using current i18n locale
 */
export function useMaNumberFormatters() {
  const { i18n } = useTranslation();

  return {
    formatNumber: (value: number, decimals = 0) => formatNumber(value, decimals, i18n.language),
    formatPercentage: (value: number, decimals = 1) => formatPercentage(value, decimals, i18n.language),
    formatFileSize: (bytes: number) => formatFileSize(bytes, i18n.language),
  };
}
