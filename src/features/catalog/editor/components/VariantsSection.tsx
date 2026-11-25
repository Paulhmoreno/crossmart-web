import { PageSection } from '@/config/routes';
import { useFormContext, useWatch } from 'react-hook-form';
import { OdooFieldLockNote } from '@/features/odoo/components/OdooSourceBadge';
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
  const options = useWatch({ control, name: 'options' });
  const variantCount = useWatch({ control, name: 'variants' }).length;
  const hasOptions = options.some((option) => option.values.length > 0);
  const title = hasOptions ? `Variants (${variantCount.toLocaleString()})` : 'Variants';
  return (
    <EditorSection title={title} id={PageSection.ProductVariants}>
      {isOdooManaged && <OdooFieldLockNote />}
      <fieldset disabled={isOdooManaged} className="flex flex-col gap-4">
        <OptionsEditor />
        {hasOptions && <VariantsGrid currency={currency} />}
      </fieldset>
    </EditorSection>
  );
}
