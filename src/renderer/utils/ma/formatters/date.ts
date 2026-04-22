/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Date formatting utilities for M&A surfaces
 * Uses locale-aware formatting from Intl API
 */

import { useTranslation } from 'react-i18next';

/**
 * Format a timestamp (epoch ms) as a localized date string
 * @param timestamp - Epoch timestamp in milliseconds
 * @param locale - Optional locale string (defaults to current i18n locale)
 * @returns Formatted date string (e.g., "1/15/2025")
 */
export function formatDate(timestamp: number, locale?: string): string {
  return new Date(timestamp).toLocaleDateString(locale);
}

/**
 * Format a timestamp (epoch ms) as a localized date and time string
 * @param timestamp - Epoch timestamp in milliseconds
 * @param locale - Optional locale string (defaults to current i18n locale)
 * @returns Formatted datetime string (e.g., "1/15/2025, 2:30:45 PM")
 */
export function formatDateTime(timestamp: number, locale?: string): string {
  return new Date(timestamp).toLocaleString(locale);
}

/**
 * Format a timestamp (epoch ms) as a localized time string
 * @param timestamp - Epoch timestamp in milliseconds
 * @param locale - Optional locale string (defaults to current i18n locale)
 * @returns Formatted time string (e.g., "2:30:45 PM")
 */
export function formatTime(timestamp: number, locale?: string): string {
  return new Date(timestamp).toLocaleTimeString(locale);
}

/**
 * Hook that returns formatters using current i18n locale
 */
export function useMaDateFormatters() {
  const { i18n } = useTranslation();

  return {
    formatDate: (timestamp: number) => formatDate(timestamp, i18n.language),
    formatDateTime: (timestamp: number) => formatDateTime(timestamp, i18n.language),
    formatTime: (timestamp: number) => formatTime(timestamp, i18n.language),
  };
}
