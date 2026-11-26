import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { AuthField, MIN_PASSWORD_LENGTH } from '../auth.constants';
import { useAuthNavigationState } from '../hooks/useReturnPath';

export function NameField() {
  const { t } = useI18n();
  return (
    <Field>
      <FieldLabel htmlFor={AuthField.Name}>{t('Name')}</FieldLabel>
      <Input id={AuthField.Name} name={AuthField.Name} autoComplete="name" required />
    </Field>
  );
}

/** Filled in when the page that sent the user here knows the address. */
export function EmailField() {
  const { t } = useI18n();
  const navigationState = useAuthNavigationState();
  return (
    <Field>
      <FieldLabel htmlFor={AuthField.Email}>{t('Email')}</FieldLabel>
      <Input
        id={AuthField.Email}
        name={AuthField.Email}
        type="email"
        autoComplete="email"
        defaultValue={navigationState?.email}
        required
      />
    </Field>
  );
}

interface PasswordFieldProps {
  /** `new-password` on sign-up lets password managers offer a strong one. */
  autoComplete: 'current-password' | 'new-password';
  showHint?: boolean;
}

export function PasswordField({ autoComplete, showHint = false }: PasswordFieldProps) {
  const { t } = useI18n();
  return (
    <Field>
      <FieldLabel htmlFor={AuthField.Password}>{t('Password')}</FieldLabel>
      <Input
        id={AuthField.Password}
        name={AuthField.Password}
        type="password"
        autoComplete={autoComplete}
        minLength={MIN_PASSWORD_LENGTH}
        required
      />
      {showHint && (
        <FieldDescription>
          {t('At least {count} characters.', { count: MIN_PASSWORD_LENGTH })}
        </FieldDescription>
      )}
    </Field>
  );
}
