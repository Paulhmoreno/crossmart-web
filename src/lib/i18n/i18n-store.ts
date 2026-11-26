import type { Locale } from './i18n.constants';
import { readStoredLocale, storeLocale } from './i18n-storage';

type Listener = () => void;

let activeUserId: string | null = null;
let currentLocale: Locale = readStoredLocale(null);
const listeners = new Set<Listener>();

function applyDocumentLang(locale: Locale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(next: Locale): void {
  storeLocale(next, activeUserId);
  if (next === currentLocale) return;
  currentLocale = next;
  applyDocumentLang(next);
  notify();
}

/** Binds locale persistence to the signed-in user so each user keeps their own language preference. */
export function bindLocaleUser(userId: string | null): void {
  if (userId === activeUserId) return;
  activeUserId = userId;
  const next = readStoredLocale(userId);
  if (next !== currentLocale) {
    currentLocale = next;
    applyDocumentLang(next);
    notify();
  }
}

export function subscribeLocale(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Syncs `<html lang>` and reads stored locale for the current user (or global before sign-in). */
export function syncLocaleFromStorage(): Locale {
  currentLocale = readStoredLocale(activeUserId);
  applyDocumentLang(currentLocale);
  return currentLocale;
}
