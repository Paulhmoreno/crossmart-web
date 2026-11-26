import { useFormContext, useWatch } from 'react-hook-form';
import { useI18n } from '@/lib/i18n';
import type { ProductFormValues } from '../product-form.schema';
import { EditorSection } from './EditorSection';
import { CheckboxField, TextField } from './FormFields';

/** Shipping details of a product without options. */
export function ShippingSection() {
  const { t } = useI18n();
  const { control } = useFormContext<ProductFormValues>();
  const requiresShipping = useWatch({ control, name: 'variants.0.requiresShipping' });
  return (
    <EditorSection title={t('Shipping')}>
      <CheckboxField name="variants.0.requiresShipping" label={t('This is a physical product')} />
      {requiresShipping && (
        <div className="sm:w-1/2">
          <TextField name="variants.0.weightGrams" label={t('Weight (g)')} inputMode="numeric" />
        </div>
      )}
    </EditorSection>
  );
}
