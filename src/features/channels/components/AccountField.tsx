import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { useI18n } from '@/lib/i18n';
import { type AccountPrompt, AccountPromptKind } from '../channels.constants';
import { AccountSelect } from './AccountSelect';
import { AccountTextInput } from './AccountTextInput';

const ACCOUNT_FIELD_ID = 'connect-channel-account';

interface AccountFieldProps {
  prompt: AccountPrompt;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

/** The account to connect: a store's myshopify.com domain, or an eBay marketplace. */
export function AccountField({ prompt, value, onChange, disabled }: AccountFieldProps) {
  const { t } = useI18n();
  const control = { id: ACCOUNT_FIELD_ID, value, onChange, disabled };
  return (
    <Field>
      <FieldLabel htmlFor={ACCOUNT_FIELD_ID}>{t(prompt.label)}</FieldLabel>
      {prompt.kind === AccountPromptKind.Select ? (
        <AccountSelect prompt={prompt} {...control} />
      ) : (
        <AccountTextInput prompt={prompt} {...control} />
      )}
      <FieldDescription>{t(prompt.description)}</FieldDescription>
    </Field>
  );
}
