import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { MercadoLibreShippingMode } from '@/api/schema';
import { fetchClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PageSection } from '@/config/routes';
import { useInvalidateEndpoints } from '@/hooks/useInvalidateEndpoints';
import { useI18n } from '@/lib/i18n';
import {
  CHANNEL_CONNECTION_DETAIL_ENDPOINT,
  CHANNEL_CONNECTIONS_ENDPOINT,
  MERCADOLIBRE_LISTING_SETUP_ENDPOINT,
  MERCADOLIBRE_REFRESH_ENDPOINT,
  MERCADOLIBRE_SHIPPING_MODE_LABELS,
} from '../channels.constants';
import type {
  ChannelConnection,
  MercadoLibreListingSetupBody,
  MercadoLibreSettings,
} from '../channels.types';

const CONNECTION_ENDPOINTS = [
  CHANNEL_CONNECTIONS_ENDPOINT,
  CHANNEL_CONNECTION_DETAIL_ENDPOINT,
] as const;

const ACCOUNT_DEFAULT_VALUE = '__default__';

interface MercadoLibreListingSetupCardProps {
  workspaceId: string;
  connectionId: string;
  mercadoLibre: MercadoLibreSettings;
  canManage: boolean;
}

/** Commercial listing setup for a Mercado Libre store (listing type, shipping, warranty, orders). */
export function MercadoLibreListingSetupCard({
  workspaceId,
  connectionId,
  mercadoLibre,
  canManage,
}: MercadoLibreListingSetupCardProps) {
  const { t } = useI18n();
  const refreshQueries = useInvalidateEndpoints(CONNECTION_ENDPOINTS);
  const [listingTypeId, setListingTypeId] = useState(
    mercadoLibre.defaultListingTypeId ?? ACCOUNT_DEFAULT_VALUE,
  );
  const [shippingMode, setShippingMode] = useState<string>(
    mercadoLibre.shippingMode ?? ACCOUNT_DEFAULT_VALUE,
  );
  const [localPickUp, setLocalPickUp] = useState(Boolean(mercadoLibre.localPickUp));
  const [warrantyType, setWarrantyType] = useState(mercadoLibre.warrantyType ?? '');
  const [warrantyTime, setWarrantyTime] = useState(mercadoLibre.warrantyTime ?? '');
  const [importOrders, setImportOrders] = useState(Boolean(mercadoLibre.importOrders));

  const save = useMutation<ChannelConnection, Error, MercadoLibreListingSetupBody>({
    meta: { successMessage: t('Mercado Libre listing setup saved') },
    mutationFn: (body) =>
      unwrap(
        fetchClient.PUT(MERCADOLIBRE_LISTING_SETUP_ENDPOINT, {
          params: { path: { workspaceId, connectionId } },
          body,
        }),
      ),
    onSuccess: refreshQueries,
  });

  const refreshTypes = useMutation<ChannelConnection, Error, void>({
    meta: { successMessage: t('Listing types refreshed from Mercado Libre') },
    mutationFn: () =>
      unwrap(
        fetchClient.POST(MERCADOLIBRE_REFRESH_ENDPOINT, {
          params: { path: { workspaceId, connectionId } },
        }),
      ),
    onSuccess: refreshQueries,
  });

  function handleSave() {
    save.mutate({
      defaultListingTypeId: listingTypeId === ACCOUNT_DEFAULT_VALUE ? null : listingTypeId,
      shippingMode:
        shippingMode === ACCOUNT_DEFAULT_VALUE ? null : (shippingMode as MercadoLibreShippingMode),
      localPickUp,
      warrantyType: warrantyType.trim() || null,
      warrantyTime: warrantyTime.trim() || null,
      importOrders,
    });
  }

  return (
    <Card id={PageSection.StoreListingSetup}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>
          <h2>{t('Listing setup')}</h2>
        </CardTitle>
        {canManage && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshTypes.isPending}
            onClick={() => refreshTypes.mutate()}
          >
            <RefreshCw className="size-3.5" />
            {t('Refresh options')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="ml-listing-type">{t('Default listing type')}</FieldLabel>
            <Select value={listingTypeId} onValueChange={setListingTypeId} disabled={!canManage}>
              <SelectTrigger id="ml-listing-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ACCOUNT_DEFAULT_VALUE}>{t('Classic (default)')}</SelectItem>
                {mercadoLibre.availableListingTypes.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name} ({option.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="ml-shipping-mode">{t('Shipping mode')}</FieldLabel>
            <Select value={shippingMode} onValueChange={setShippingMode} disabled={!canManage}>
              <SelectTrigger id="ml-shipping-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ACCOUNT_DEFAULT_VALUE}>
                  {t('Account default (recommended)')}
                </SelectItem>
                {Object.values(MercadoLibreShippingMode).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {t(MERCADOLIBRE_SHIPPING_MODE_LABELS[mode])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="ml-warranty-type">{t('Warranty type')}</FieldLabel>
            <Input
              id="ml-warranty-type"
              value={warrantyType}
              onChange={(event) => setWarrantyType(event.target.value)}
              placeholder={t('Seller warranty')}
              disabled={!canManage}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="ml-warranty-time">{t('Warranty duration')}</FieldLabel>
            <Input
              id="ml-warranty-time"
              value={warrantyTime}
              onChange={(event) => setWarrantyTime(event.target.value)}
              placeholder={t('6 months')}
              disabled={!canManage}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Field>
            <FieldLabel htmlFor="ml-local-pickup">{t('Allow local pickup')}</FieldLabel>
            <FieldDescription>
              {t('Applied only when the site and category allow in-person pickup.')}
            </FieldDescription>
          </Field>
          <Switch
            id="ml-local-pickup"
            checked={localPickUp}
            onCheckedChange={setLocalPickUp}
            disabled={!canManage}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Field>
            <FieldLabel htmlFor="ml-import-orders">{t('Import orders')}</FieldLabel>
            <FieldDescription>
              {t('Keep disabled until order stock deductions are reconciled with Odoo.')}
            </FieldDescription>
          </Field>
          <Switch
            id="ml-import-orders"
            checked={importOrders}
            onCheckedChange={setImportOrders}
            disabled={!canManage}
          />
        </div>

        {canManage && (
          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={save.isPending}>
              {t('Save setup')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
