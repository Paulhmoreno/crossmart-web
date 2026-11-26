import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { OutOfStockPolicy } from '@/api/schema';
import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/lib/i18n';
import { BARCODE_HELP } from '../../catalog.constants';
import type { ProductFormValues } from '../product-form.schema';
import { EditorSection } from './EditorSection';
import { CheckboxField, TextField } from './FormFields';

const TRACKED_FIELD_ID = 'variants.0.tracked';
const CONTINUE_SELLING_FIELD_ID = 'variants.0.continueSelling';

function TrackStockSwitch({ disabled }: { disabled: boolean }) {
  const { control } = useFormContext<ProductFormValues>();
  const { t } = useI18n();
  return (
    <Controller
      control={control}
      name="variants.0.tracked"
      render={({ field }) => (
        <Field orientation="horizontal">
          <Switch
            id={TRACKED_FIELD_ID}
            checked={field.value}
            onCheckedChange={field.onChange}
            disabled={disabled}
          />
          <FieldLabel htmlFor={TRACKED_FIELD_ID} className="font-normal">
            {t('Track stock')}
          </FieldLabel>
        </Field>
      )}
    />
  );
}

function ContinueSellingSwitch() {
  const { control } = useFormContext<ProductFormValues>();
  const { t } = useI18n();
  return (
    <Controller
      control={control}
      name="variants.0.outOfStockPolicy"
      render={({ field }) => (
        <Field orientation="horizontal">
          <Switch
            id={CONTINUE_SELLING_FIELD_ID}
            checked={field.value === OutOfStockPolicy.CONTINUE_SELLING}
            onCheckedChange={(checked) =>
              field.onChange(
                checked ? OutOfStockPolicy.CONTINUE_SELLING : OutOfStockPolicy.STOP_SELLING,
              )
            }
          />
          <FieldLabel htmlFor={CONTINUE_SELLING_FIELD_ID} className="font-normal">
            {t('Keep selling when out of stock')}
          </FieldLabel>
        </Field>
      )}
    />
  );
}

/** SKU, barcode, stock tracking and tax of a product without options. */
export function InventorySection({ isOdooManaged = false }: { isOdooManaged?: boolean }) {
  const { control } = useFormContext<ProductFormValues>();
  const { t } = useI18n();
  const tracked = useWatch({ control, name: 'variants.0.tracked' });
  return (
    <EditorSection title={t('Inventory')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="variants.0.sku" label={t('SKU')} isCode disabled={isOdooManaged} />
        <TextField
          name="variants.0.barcode"
          label={t('Barcode')}
          hint={t(BARCODE_HELP)}
          isCode
          disabled={isOdooManaged}
        />
      </div>
      <TrackStockSwitch disabled={isOdooManaged} />
      {tracked && <ContinueSellingSwitch />}
      <CheckboxField name="variants.0.taxable" label={t('Charge tax on this product')} />
    </EditorSection>
  );
}
