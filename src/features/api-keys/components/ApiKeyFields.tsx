import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RoleSelect, type useRolePicker } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';

const NAME_FIELD_ID = 'api-key-name';
const ROLE_FIELD_ID = 'api-key-role';

interface ApiKeyFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  picker: ReturnType<typeof useRolePicker>;
}

export function ApiKeyFields({ name, onNameChange, picker }: ApiKeyFieldsProps) {
  const { t } = useI18n();
  const { role } = picker;
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={NAME_FIELD_ID}>{t('Name')}</FieldLabel>
        <Input
          id={NAME_FIELD_ID}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Claude Desktop"
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={ROLE_FIELD_ID}>{t('Access')}</FieldLabel>
        <RoleSelect
          id={ROLE_FIELD_ID}
          value={role?.value ?? ''}
          options={picker.options}
          onChange={picker.pick}
          className="w-full"
        />
        {role && <FieldDescription>{t(role.description)}</FieldDescription>}
      </Field>
    </FieldGroup>
  );
}
