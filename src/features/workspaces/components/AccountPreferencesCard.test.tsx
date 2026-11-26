import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { bindLocaleUser, I18nProvider, Locale, setLocale } from '@/lib/i18n';
import { AccountPreferencesCard } from './AccountPreferencesCard';

describe('AccountPreferencesCard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    bindLocaleUser('user-1');
    setLocale(Locale.En);
  });

  it('defaults to English and persists per-user Español (Ecuador) selection', () => {
    render(
      <I18nProvider>
        <AccountPreferencesCard />
      </I18nProvider>,
    );

    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveTextContent('English');

    act(() => {
      setLocale(Locale.EsEc);
    });

    expect(screen.getByText('Preferencias')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Idioma' })).toHaveTextContent('Español (Ecuador)');
    expect(window.localStorage.getItem('crossmart-locale:user-1')).toBe('es-EC');

    act(() => {
      bindLocaleUser('user-2');
    });
    expect(screen.getByText('Preferences')).toBeInTheDocument();

    act(() => {
      bindLocaleUser('user-1');
    });
    expect(screen.getByText('Preferencias')).toBeInTheDocument();
  });
});
