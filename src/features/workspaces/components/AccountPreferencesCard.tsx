import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Locale, LOCALE_LABELS, SUPPORTED_LOCALES, useI18n } from '@/lib/i18n';

const LANGUAGE_FIELD_ID = 'profile-language';

/** Individual user preferences inside Profile (/account): interface language. */
export function AccountPreferencesCard() {
  const { locale, setLocale, t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('Preferences')}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Field className="max-w-xs">
          <FieldLabel htmlFor={LANGUAGE_FIELD_ID}>{t('Language')}</FieldLabel>
          <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
            <SelectTrigger id={LANGUAGE_FIELD_ID} aria-label={t('Language')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LOCALES.map((item) => (
                <SelectItem key={item} value={item}>
                  {LOCALE_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </CardContent>
    </Card>
  );
}
