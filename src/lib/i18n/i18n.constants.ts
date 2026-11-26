/** Supported interface locales. English is canonical and always the fallback. */
export enum Locale {
  En = 'en',
  EsEc = 'es-EC',
}

export const DEFAULT_LOCALE = Locale.En;
export const LOCALE_STORAGE_KEY = 'crossmart-locale';

/** Native language labels (never translated, so users can always find their language). */
export const LOCALE_LABELS: Record<Locale, string> = {
  [Locale.En]: 'English',
  [Locale.EsEc]: 'Español (Ecuador)',
};

export const SUPPORTED_LOCALES: readonly Locale[] = [Locale.En, Locale.EsEc];
