import { DEFAULT_LOCALE, Locale, LOCALE_STORAGE_KEY } from './i18n.constants';

function isLocale(value: string | null): value is Locale {
  return value === Locale.En || value === Locale.EsEc;
}

function keyForUser(userId: string | null): string {
  return userId ? `${LOCALE_STORAGE_KEY}:${userId}` : LOCALE_STORAGE_KEY;
}

/** Reads the persisted interface locale for a specific user (or global fallback before sign-in). */
export function readStoredLocale(userId: string | null = null): Locale {
  try {
    if (userId) {
      const userStored = window.localStorage.getItem(keyForUser(userId));
      if (isLocale(userStored)) return userStored;
      return DEFAULT_LOCALE;
    }
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function storeLocale(locale: Locale, userId: string | null = null): void {
  try {
    window.localStorage.setItem(keyForUser(userId), locale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage quota or private-mode errors.
  }
}
