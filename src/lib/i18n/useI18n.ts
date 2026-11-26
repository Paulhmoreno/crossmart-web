import { useCallback, useSyncExternalStore } from 'react';
import type { Locale } from './i18n.constants';
import { getLocale, setLocale, subscribeLocale } from './i18n-store';
import {
  formatDateForLocale,
  formatDateTimeForLocale,
  formatNumberForLocale,
  type TranslateParams,
  translateForLocale,
  translatePluralForLocale,
} from './translate';

export interface I18nApi {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (message: string, params?: TranslateParams) => string;
  tp: (count: number, singular: string, plural: string, params?: TranslateParams) => string;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

/** Reactive localization hook backed by the global locale store. Works with or without a provider. */
export function useI18n(): I18nApi {
  const locale = useSyncExternalStore(subscribeLocale, getLocale);

  const t = useCallback(
    (message: string, params?: TranslateParams) => translateForLocale(locale, message, params),
    [locale],
  );

  const tp = useCallback(
    (count: number, singular: string, plural: string, params?: TranslateParams) =>
      translatePluralForLocale(locale, count, singular, plural, params),
    [locale],
  );

  const formatDate = useCallback(
    (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDateForLocale(locale, value, options),
    [locale],
  );

  const formatDateTime = useCallback(
    (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDateTimeForLocale(locale, value, options),
    [locale],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumberForLocale(locale, value, options),
    [locale],
  );

  return { locale, setLocale, t, tp, formatDate, formatDateTime, formatNumber };
}
