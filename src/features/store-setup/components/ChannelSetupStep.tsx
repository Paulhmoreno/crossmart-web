import type { RefObject } from 'react';
import type { ChannelConnection } from '@/features/channels';
import type { SaveStep } from '../hooks/useStoreSetupSave';
import { EbaySetupStep } from './EbaySetupStep';
import { GoogleSetupStep } from './GoogleSetupStep';
import { MercadoLibreSetupStep } from './MercadoLibreSetupStep';

interface ChannelSetupStepProps {
  workspaceId: string;
  connection: ChannelConnection;
  stepRef: RefObject<SaveStep | null>;
}

/** The channel's initial commercial setup right after OAuth connect. */
export function ChannelSetupStep({ workspaceId, connection, stepRef }: ChannelSetupStepProps) {
  if (connection.mercadoLibre) {
    return (
      <MercadoLibreSetupStep
        workspaceId={workspaceId}
        connection={connection}
        mercadoLibre={connection.mercadoLibre}
        stepRef={stepRef}
      />
    );
  }
  if (connection.publishReadiness.ready) return null;
  if (connection.ebay) {
    return (
      <EbaySetupStep
        workspaceId={workspaceId}
        connection={connection}
        ebay={connection.ebay}
        stepRef={stepRef}
      />
    );
  }
  if (connection.googleMerchant) {
    return (
      <GoogleSetupStep
        workspaceId={workspaceId}
        connection={connection}
        google={connection.googleMerchant}
        stepRef={stepRef}
      />
    );
  }
  return null;
}
