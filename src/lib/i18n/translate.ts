import { Locale } from './i18n.constants';
import { getLocale } from './i18n-store';
import { MESSAGES_ES_EC } from './translations/es-EC';

export type TranslateParams = Record<string, string | number>;

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER_PATTERN, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

/** Translates a canonical English UI string into the given locale, with automatic English fallback. */
export function translateForLocale(
  locale: Locale,
  message: string,
  params?: TranslateParams,
): string {
  const template = locale === Locale.EsEc ? (MESSAGES_ES_EC[message] ?? message) : message;
  return interpolate(template, params);
}

/** Pluralizes and translates a canonical English singular/plural pair with locale-formatted count. */
export function translatePluralForLocale(
  locale: Locale,
  count: number,
  singular: string,
  plural: string,
  params?: TranslateParams,
): string {
  const key = count === 1 ? singular : plural;
  return translateForLocale(locale, key, {
    count: count.toLocaleString(locale),
    ...params,
  });
}

/** Module-level translation helper for non-React utilities (toasts, error mappers, validators). */
export function t(message: string, params?: TranslateParams): string {
  return translateForLocale(getLocale(), message, params);
}

export function tp(
  count: number,
  singular: string,
  plural: string,
  params?: TranslateParams,
): string {
  return translatePluralForLocale(getLocale(), count, singular, plural, params);
}

export function formatDateForLocale(
  locale: Locale,
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleDateString(locale, options);
}

export function formatDateTimeForLocale(
  locale: Locale,
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleString(locale, options);
}

export function formatNumberForLocale(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return value.toLocaleString(locale, options);
}
