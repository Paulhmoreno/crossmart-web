import { KeyRound, Unplug } from 'lucide-react';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { ChannelInfo, ConnectableChannel } from '../channels.constants';
import type { ChannelConnection } from '../channels.types';
import { reconnectAccountHandle } from '../connection-account';
import { needsReconnect } from '../connection-status';
import { useDisconnectChannel } from '../hooks/useChannelConnections';
import { ConnectChannelDialog } from './ConnectChannelDialog';
import { ReconnectButton } from './ReconnectButton';

interface ConnectionActionsProps {
  workspaceId: string;
  channel: ChannelInfo;
  connect: ConnectableChannel;
  connection: ChannelConnection;
  name: string;
  /** Called once the connection is disconnected, such as to leave its page. */
  onDisconnected?: () => void;
}

/** What a workspace admin can do with a connection: reconnect it, or disconnect it. */
export function ConnectionActions({
  workspaceId,
  channel,
  connect,
  connection,
  name,
  onDisconnected,
}: ConnectionActionsProps) {
  const disconnect = useDisconnectChannel(workspaceId);
  const { t } = useI18n();
  return (
    <>
      {needsReconnect(connection.status) && (
        <ReconnectButton
          workspaceId={workspaceId}
          channel={channel}
          connect={connect}
          connection={connection}
        />
      )}
      {!needsReconnect(connection.status) && connection.woocommerce && (
        <ConnectChannelDialog
          workspaceId={workspaceId}
          channel={channel}
          connect={connect}
          initialAccount={reconnectAccountHandle(connection)}
          trigger={
            <Button variant="outline" size="sm">
              <KeyRound data-icon="inline-start" />
              {t('Update credentials')}
            </Button>
          }
        />
      )}
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="sm">
            <Unplug data-icon="inline-start" />
            {t('Disconnect')}
          </Button>
        }
        title={t('Disconnect {name}?', { name })}
        description={t(
          'Crossmart stops syncing with this store and removes its access. Your products stay in Crossmart and on {channel}.',
          { channel: channel.name },
        )}
        confirmLabel={t('Disconnect')}
        onConfirm={async () => {
          await disconnect.mutateAsync(connection.id);
          onDisconnected?.();
        }}
      />
    </>
  );
}
