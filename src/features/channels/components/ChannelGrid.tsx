import { ChannelConnectionStatus, WorkspacePermission } from '@/api/schema';
import type { Workspace } from '@/features/workspaces';
import { hasPermission } from '@/features/workspaces';
import {
  CHANNELS,
  ChannelStatus,
  type ChannelInfo,
  type ConnectableChannel,
} from '../channels.constants';
import type { ChannelConnection } from '../channels.types';
import { useChannelConnections } from '../hooks/useChannelConnections';
import { useConnectChannelParam } from '../hooks/useConnectChannelParam';
import { ConnectableChannelCard } from './ConnectableChannelCard';
import { ConnectChannelDialog } from './ConnectChannelDialog';

const NO_CONNECTIONS: readonly ChannelConnection[] = [];

/**
 * Whether the channel gets a card: a live operational connector, or one the workspace already has
 * stores on, which stay reachable. Incomplete connectors are not presented as available.
 */
function isShown(channel: ChannelInfo, stores: number): boolean {
  if (!channel.connect) return false;
  return channel.status === ChannelStatus.Live || stores > 0;
}

interface ShownChannel {
  channel: ChannelInfo;
  connect: ConnectableChannel;
  stores: ChannelConnection[];
}

/**
 * The connect dialog a link asks for (`?connect=<channel>`), when the channel has a card here
 * and the person may connect stores. Closing it drops the parameter.
 */
function RequestedConnectDialog({
  workspaceId,
  cards,
  canManage,
}: {
  workspaceId: string;
  cards: readonly ShownChannel[];
  canManage: boolean;
}) {
  const requested = useConnectChannelParam();
  const card = cards.find(({ connect }) => connect.type === requested.channel);
  if (!card || !canManage) return null;
  return (
    <ConnectChannelDialog
      workspaceId={workspaceId}
      channel={card.channel}
      connect={card.connect}
      open
      onOpenChange={(open) => {
        if (!open) requested.clear();
      }}
    />
  );
}

/** The operational channels a store can be connected on, each with its stores. */
export function ChannelGrid({ workspace }: { workspace: Workspace }) {
  const { data } = useChannelConnections(workspace.id);
  const active = (data ?? NO_CONNECTIONS).filter(
    (connection) => connection.status !== ChannelConnectionStatus.DISCONNECTED,
  );
  const canManage = hasPermission(workspace, WorkspacePermission.channels_manage);
  const cards: ShownChannel[] = CHANNELS.flatMap((channel) => {
    const stores = active.filter((connection) => connection.channel === channel.connect?.type);
    const { connect } = channel;
    return connect && isShown(channel, stores.length) ? [{ channel, connect, stores }] : [];
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ channel, connect, stores }) => (
          <ConnectableChannelCard
            key={channel.name}
            workspaceId={workspace.id}
            channel={channel}
            connect={connect}
            connections={stores}
            canManage={canManage}
          />
        ))}
      </div>
      <RequestedConnectDialog workspaceId={workspace.id} cards={cards} canManage={canManage} />
    </div>
  );
}
