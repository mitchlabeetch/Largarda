/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTranslation } from 'react-i18next';
import { currency, number, date, siren, siret } from '@/common/utils/format';

/**
 * Hook that provides formatting functions using the active i18n locale
 * Returns format helpers that automatically use the current language
 */
export function useLargoFormat() {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return {
    currency: (value: number, currencyCode: string = 'EUR') => currency(value, locale, currencyCode),
    number: (value: number, decimals: number = 2) => number(value, locale, decimals),
    date: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => date(value, locale, options),
    siren,
    siret,
  };
}
