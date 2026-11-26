import { PageSection } from '@/config/routes';
import { useFormContext, useWatch } from 'react-hook-form';
import { useI18n } from '@/lib/i18n';
import type { ProductFormValues } from '../product-form.schema';
import { EditorSection } from './EditorSection';
import { OptionsEditor } from './OptionsEditor';
import { VariantsGrid } from './VariantsGrid';

/** Options such as size or color, and a row of price and stock per variant. */
export function VariantsSection({
  currency,
  isOdooManaged = false,
}: {
  currency: string;
  isOdooManaged?: boolean;
}) {
  const { control } = useFormContext<ProductFormValues>();
  const { t, formatNumber } = useI18n();
  const options = useWatch({ control, name: 'options' });
  const variantCount = useWatch({ control, name: 'variants' }).length;
  const hasOptions = options.some((option) => option.values.length > 0);
  const title = hasOptions ? `${t('Variants')} (${formatNumber(variantCount)})` : t('Variants');
  return (
    <EditorSection title={title} id={PageSection.ProductVariants}>
      <fieldset disabled={isOdooManaged} className="flex flex-col gap-4">
        <OptionsEditor />
        {hasOptions && <VariantsGrid currency={currency} />}
      </fieldset>
    </EditorSection>
  );
}
