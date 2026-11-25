import { useFormContext, useWatch } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { OdooFieldLockNote } from '@/features/odoo/components/OdooSourceBadge';
import type { ProductFormValues } from '../product-form.schema';
import { ConditionField } from './ConditionField';
import { MoneyField, TextField } from './FormFields';

interface EssentialsCardProps {
  currency: string;
  /** With options, price and stock are set per variant under More details. */
  hasOptions: boolean;
  isOdooManaged?: boolean;
}

/** What every listing needs after its photos and words: price, condition and how many. */
export function EssentialsCard({
  currency,
  hasOptions,
  isOdooManaged = false,
}: EssentialsCardProps) {
  const { control } = useFormContext<ProductFormValues>();
  const tracked = useWatch({ control, name: 'variants.0.tracked' });
  return (
    <Card>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {!hasOptions && (
          <MoneyField
            name="variants.0.price"
            label="Price"
            currency={currency}
            disabled={isOdooManaged}
            description={isOdooManaged ? <OdooFieldLockNote /> : undefined}
          />
        )}
        <ConditionField />
        {!hasOptions && tracked && (
          <TextField
            name="variants.0.quantity"
            label="Quantity"
            inputMode="numeric"
            disabled={isOdooManaged}
            description={isOdooManaged ? <OdooFieldLockNote /> : undefined}
          />
        )}
      </CardContent>
    </Card>
  );
}
