import { Controller, useFormContext } from 'react-hook-form';
import { FieldHint } from '@/components/forms/FieldHint';
import { TagInput } from '@/components/forms/TagInput';
import { Field, FieldLabel } from '@/components/ui/field';
import { TAGS_HELP } from '../../catalog.constants';
import { useI18n } from '@/lib/i18n';
import type { ProductFormValues } from '../product-form.schema';
import { EditorSection } from './EditorSection';
import { TextField } from './FormFields';

const TAGS_FIELD_ID = 'tags';

function TagsField() {
  const { t } = useI18n();
  const { control } = useFormContext<ProductFormValues>();
  return (
    <Controller
      control={control}
      name="tags"
      render={({ field }) => (
        <Field>
          <span className="flex items-center gap-1">
            <FieldLabel htmlFor={TAGS_FIELD_ID}>{t('Tags')}</FieldLabel>
            <FieldHint text={t(TAGS_HELP)} />
          </span>
          <TagInput
            id={TAGS_FIELD_ID}
            value={field.value}
            onChange={field.onChange}
            placeholder={t('Type a tag and press Enter')}
          />
        </Field>
      )}
    />
  );
}

/** Type, brand and tags: for finding products and for store rules. */
export function OrganizationSection() {
  const { t } = useI18n();
  return (
    <EditorSection title={t('Organization')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="productType" label={t('Type')} />
        <TextField name="vendor" label={t('Brand or vendor')} />
      </div>
      <TagsField />
    </EditorSection>
  );
}
