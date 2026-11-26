import { type RefObject, useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fetchClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { FormError } from '@/components/feedback/FormError';
import type { ChannelConnection } from '@/features/channels';
import {
  CHANNEL_CONNECTION_DETAIL_ENDPOINT,
  CHANNEL_CONNECTIONS_ENDPOINT,
  MERCADOLIBRE_LISTING_SETUP_ENDPOINT,
} from '@/features/channels/channels.constants';
import type {
  MercadoLibreListingSetupBody,
  MercadoLibreSettings,
} from '@/features/channels/channels.types';
import {
  initialCommercialValues,
  MercadoLibreSetupFields,
  parseOptionalNumber,
} from '@/features/channels/components/MercadoLibreSetupFields';
import { useInvalidateEndpoints } from '@/hooks/useInvalidateEndpoints';
import type { SaveStep } from '../hooks/useStoreSetupSave';
import { useStepSave } from './useStepSave';

const CONNECTION_ENDPOINTS = [
  CHANNEL_CONNECTIONS_ENDPOINT,
  CHANNEL_CONNECTION_DETAIL_ENDPOINT,
] as const;

interface MercadoLibreSetupStepProps {
  workspaceId: string;
  connection: ChannelConnection;
  mercadoLibre: MercadoLibreSettings;
  stepRef: RefObject<SaveStep | null>;
}

/** Commercial setup presented inside StoreSetupDialog immediately after OAuth connect. */
export function MercadoLibreSetupStep({
  workspaceId,
  connection,
  mercadoLibre,
  stepRef,
}: MercadoLibreSetupStepProps) {
  const refreshQueries = useInvalidateEndpoints(CONNECTION_ENDPOINTS);
  const [values, setValues] = useState(() => initialCommercialValues(mercadoLibre));

  const save = useMutation<ChannelConnection, Error, MercadoLibreListingSetupBody>({
    meta: { inlineError: true },
    mutationFn: (body) =>
      unwrap(
        fetchClient.PUT(MERCADOLIBRE_LISTING_SETUP_ENDPOINT, {
          params: { path: { workspaceId, connectionId: connection.id } },
          body,
        }),
      ),
    onSuccess: refreshQueries,
  });

  const saveNow = useCallback(async () => {
    try {
      await save.mutateAsync({
        defaultListingTypeId: values.defaultListingTypeId || null,
        shippingPolicy: values.shippingPolicy,
        autoFreeShippingMinPrice: parseOptionalNumber(values.autoFreeShippingMinPrice),
        autoFreeShippingMaxCostPercent: parseOptionalNumber(values.autoFreeShippingMaxCostPercent),
        importOrders: false,
      });
      return true;
    } catch {
      return false;
    }
  }, [save, values]);

  useStepSave(stepRef, saveNow);

  return (
    <div className="flex flex-col gap-4">
      <MercadoLibreSetupFields
        settings={mercadoLibre}
        values={values}
        onChange={setValues}
        disabled={save.isPending}
      />
      <FormError error={save.error} />
    </div>
  );
}
