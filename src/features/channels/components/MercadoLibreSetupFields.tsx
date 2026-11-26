import { MercadoLibreShippingPolicy } from '@/api/schema';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { MERCADOLIBRE_SHIPPING_POLICY_LABELS } from '../channels.constants';
import type { MercadoLibreSettings } from '../channels.types';

export interface MercadoLibreCommercialValues {
  defaultListingTypeId: string;
  shippingPolicy: MercadoLibreShippingPolicy;
  autoFreeShippingMinPrice: string;
  autoFreeShippingMaxCostPercent: string;
}

interface ListingTypeOption {
  id: string;
  label: string;
}

const CLASSIC_NAMES = new Set(['clásica', 'clasica', 'classic']);
const PREMIUM_NAMES = new Set(['premium']);
const FREE_LISTING_IDS = new Set(['free']);

/**
 * Surfaces the real commercial listing types offered by the connected site (e.g. Clásica and
 * Premium), preserving the exact site IDs returned by Mercado Libre without hardcoded defaults.
 */
export function commercialListingTypeOptions(
  settings: Pick<MercadoLibreSettings, 'availableListingTypes' | 'defaultListingTypeId'>,
): ListingTypeOption[] {
  const options: ListingTypeOption[] = [];
  const available = settings.availableListingTypes;

  const classic = available.find((item) => CLASSIC_NAMES.has(item.name.trim().toLowerCase()));
  if (classic) {
    options.push({ id: classic.id, label: 'Classic' });
  }

  const premium = available.find((item) => PREMIUM_NAMES.has(item.name.trim().toLowerCase()));
  if (premium && !options.some((item) => item.id === premium.id)) {
    options.push({ id: premium.id, label: 'Premium' });
  }

  if (options.length === 0) {
    for (const item of available) {
      if (!FREE_LISTING_IDS.has(item.id.toLowerCase())) {
        options.push({ id: item.id, label: item.name });
      }
    }
  }

  if (
    settings.defaultListingTypeId &&
    !options.some((item) => item.id === settings.defaultListingTypeId)
  ) {
    const matched = available.find((item) => item.id === settings.defaultListingTypeId);
    options.push({
      id: settings.defaultListingTypeId,
      label: matched?.name ?? settings.defaultListingTypeId,
    });
  }

  return options;
}

export function initialCommercialValues(
  settings: MercadoLibreSettings,
): MercadoLibreCommercialValues {
  const options = commercialListingTypeOptions(settings);
  return {
    defaultListingTypeId: settings.defaultListingTypeId ?? options[0]?.id ?? '',
    shippingPolicy: settings.shippingPolicy ?? MercadoLibreShippingPolicy.buyer_pays,
    autoFreeShippingMinPrice:
      settings.autoFreeShippingMinPrice !== null ? String(settings.autoFreeShippingMinPrice) : '',
    autoFreeShippingMaxCostPercent:
      settings.autoFreeShippingMaxCostPercent !== null
        ? String(settings.autoFreeShippingMaxCostPercent)
        : '',
  };
}

export function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

interface MercadoLibreSetupFieldsProps {
  settings: MercadoLibreSettings;
  values: MercadoLibreCommercialValues;
  onChange: (next: MercadoLibreCommercialValues) => void;
  disabled: boolean;
}

/** Shared commercial fields (Clásica/Premium + shipping policy) for StoreSetupDialog and Settings. */
export function MercadoLibreSetupFields({
  settings,
  values,
  onChange,
  disabled,
}: MercadoLibreSetupFieldsProps) {
  const { t } = useI18n();
  const listingOptions = commercialListingTypeOptions(settings);
  const isAutomatic = values.shippingPolicy === MercadoLibreShippingPolicy.automatic;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="ml-listing-type">{t('Default listing type')}</FieldLabel>
        <Select
          value={values.defaultListingTypeId}
          onValueChange={(value) => onChange({ ...values, defaultListingTypeId: value })}
          disabled={disabled}
        >
          <SelectTrigger id="ml-listing-type">
            <SelectValue placeholder={t('Choose listing type')} />
          </SelectTrigger>
          <SelectContent>
            {listingOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {t(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor="ml-shipping-policy">{t('Shipping policy')}</FieldLabel>
        <Select
          value={values.shippingPolicy}
          onValueChange={(value) =>
            onChange({ ...values, shippingPolicy: value as MercadoLibreShippingPolicy })
          }
          disabled={disabled}
        >
          <SelectTrigger id="ml-shipping-policy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(MercadoLibreShippingPolicy).map((policy) => (
              <SelectItem key={policy} value={policy}>
                {t(MERCADOLIBRE_SHIPPING_POLICY_LABELS[policy])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {isAutomatic && (
        <>
          <Field>
            <FieldLabel htmlFor="ml-auto-min-price">
              {t('Minimum price ({currency})', { currency: settings.currencyCode })}
            </FieldLabel>
            <Input
              id="ml-auto-min-price"
              type="number"
              min="0"
              step="0.01"
              value={values.autoFreeShippingMinPrice}
              onChange={(event) =>
                onChange({ ...values, autoFreeShippingMinPrice: event.target.value })
              }
              disabled={disabled}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="ml-auto-max-cost">
              {t('Max shipping cost (% of price)')}
            </FieldLabel>
            <Input
              id="ml-auto-max-cost"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={values.autoFreeShippingMaxCostPercent}
              onChange={(event) =>
                onChange({ ...values, autoFreeShippingMaxCostPercent: event.target.value })
              }
              disabled={disabled}
            />
          </Field>
        </>
      )}
    </div>
  );
}
