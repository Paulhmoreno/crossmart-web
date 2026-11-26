import { type PropsWithChildren, useEffect } from 'react';
import { syncLocaleFromStorage } from './i18n-store';
import { useI18n } from './useI18n';

/** Syncs `<html lang>` with the persisted interface locale and provides reactive locale updates. */
export function I18nProvider({ children }: PropsWithChildren) {
  const { locale } = useI18n();

  useEffect(() => {
    syncLocaleFromStorage();
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return children;
}
