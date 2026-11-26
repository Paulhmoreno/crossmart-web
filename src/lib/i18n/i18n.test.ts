import { afterEach, describe, expect, it } from 'vitest';
import {
  getLocale,
  Locale,
  LOCALE_STORAGE_KEY,
  setLocale,
  syncLocaleFromStorage,
  t,
  tp,
  translateForLocale,
} from './index';

describe('i18n', () => {
  afterEach(() => {
    window.localStorage.removeItem(LOCALE_STORAGE_KEY);
    setLocale(Locale.En);
  });

  it('uses English as canonical fallback and translates known strings to es-EC', () => {
    expect(translateForLocale(Locale.En, 'Products')).toBe('Products');
    expect(translateForLocale(Locale.EsEc, 'Products')).toBe('Productos');
    expect(translateForLocale(Locale.EsEc, 'Untranslated technical key')).toBe(
      'Untranslated technical key',
    );
  });

  it('supports interpolation and pluralization per locale', () => {
    expect(
      translateForLocale(Locale.EsEc, 'Catalog currency: {currency}. It cannot change.', {
        currency: 'USD',
      }),
    ).toBe('Moneda del catálogo: USD. No se puede cambiar.');

    setLocale(Locale.EsEc);
    expect(tp(1, '1 model available.', '{count} models available.')).toBe('1 modelo disponible.');
    expect(tp(12, '1 model available.', '{count} models available.')).toBe(
      '12 modelos disponibles.',
    );
  });

  it('persists locale in localStorage and updates documentElement.lang', () => {
    setLocale(Locale.EsEc);
    expect(getLocale()).toBe(Locale.EsEc);
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(Locale.EsEc);
    expect(document.documentElement.lang).toBe(Locale.EsEc);
    expect(t('Settings')).toBe('Configuración');

    expect(syncLocaleFromStorage()).toBe(Locale.EsEc);
  });
});
