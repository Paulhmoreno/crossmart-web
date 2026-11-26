import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ChannelType, WorkspacePermission, WorkspaceRole, OutsideAgentChanges } from '@/api/schema';
import type { Workspace } from '@/features/workspaces';
import {
  CHANNEL_PREVIEW_COPY,
  CHANNEL_STATUS_LABELS,
  CHANNELS,
  ChannelStatus,
  REQUEST_CHANNEL_COPY,
} from '../channels.constants';
import type { ChannelConnection } from '../channels.types';
import type * as ChannelConnectionHooks from '../hooks/useChannelConnections';
import { useChannelConnections } from '../hooks/useChannelConnections';
import { connectionFixture } from '../testing/channel-connection.fixture';
import { ChannelGrid } from './ChannelGrid';

vi.mock('../hooks/useChannelConnections', async (importOriginal) => ({
  ...(await importOriginal<typeof ChannelConnectionHooks>()),
  useChannelConnections: vi.fn<typeof useChannelConnections>(),
}));

const WORKSPACE: Workspace = {
  id: 'ws-1',
  organizationId: 'org-1',
  name: 'Default',
  displayName: 'Demo Seller',
  slug: 'default',
  currency: 'USD',
  timeZone: null,
  sandbox: null,
  outsideAgentChanges: OutsideAgentChanges.require_approval,
  role: WorkspaceRole.ADMIN,
  customRole: null,
  permissions: [WorkspacePermission.channels_manage],
};

const CONNECT_ACTION = 'Connect';
const MANAGE_ACTION = 'Manage';

function renderGrid(
  connections: ChannelConnection[] = [],
  { url = '/stores', workspace = WORKSPACE }: { url?: string; workspace?: Workspace } = {},
) {
  vi.mocked(useChannelConnections).mockReturnValue({
    data: connections,
  } as unknown as ReturnType<typeof useChannelConnections>);
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>
        <ChannelGrid workspace={workspace} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The card of the channel with this name. */
function card(channelName: string): HTMLElement {
  const heading = screen.getByRole('heading', { name: channelName });
  const element = heading.closest<HTMLElement>('[data-slot="card"]');
  if (!element) throw new Error(`${channelName} has no card`);
  return element;
}

function channelNames(status: ChannelStatus): string[] {
  return CHANNELS.filter((channel) => channel.status === status).map((channel) => channel.name);
}

describe('ChannelGrid', () => {
  it('lists Shopify, eBay, Mercado Libre and WooCommerce as live, and Google, Etsy and Falabella as coming soon', () => {
    expect(channelNames(ChannelStatus.Live)).toEqual([
      'Shopify',
      'eBay',
      'Mercado Libre',
      'WooCommerce',
    ]);
    expect(channelNames(ChannelStatus.ComingSoon)).toEqual([
      'Google Merchant Center',
      'Etsy',
      'Falabella',
    ]);
  });

  it('lets merchants connect live channels', () => {
    renderGrid();

    for (const name of channelNames(ChannelStatus.Live)) {
      const liveCard = within(card(name));
      expect(liveCard.getByText(CHANNEL_STATUS_LABELS[ChannelStatus.Live])).toBeInTheDocument();
      expect(liveCard.getByRole('button', { name: CONNECT_ACTION })).toBeInTheDocument();
    }
  });

  it('leaves incomplete channels and marketplace request link out', () => {
    renderGrid();

    for (const status of [
      ChannelStatus.ComingSoon,
      ChannelStatus.Planned,
      ChannelStatus.Community,
    ]) {
      for (const name of channelNames(status)) {
        expect(screen.queryByRole('heading', { name })).not.toBeInTheDocument();
      }
    }
    expect(
      screen.queryByRole('link', { name: REQUEST_CHANNEL_COPY.action }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(CHANNEL_PREVIEW_COPY.note)).not.toBeInTheDocument();
  });

  it('keeps stores already connected to a channel that is coming soon reachable', () => {
    renderGrid([
      connectionFixture({
        id: 'c-google',
        channel: ChannelType.google_merchant,
        shopify: null,
      }),
    ]);

    const googleCard = within(card('Google Merchant Center'));
    expect(googleCard.getByRole('link', { name: MANAGE_ACTION })).toHaveAttribute(
      'href',
      '/stores/c-google',
    );
    expect(
      googleCard.queryByText(CHANNEL_STATUS_LABELS[ChannelStatus.ComingSoon]),
    ).not.toBeInTheDocument();
  });

  describe('with ?connect=<channel>, as an AI agent links the seller', () => {
    it('opens that channel’s connect dialog at once', () => {
      renderGrid([], { url: `/stores?connect=${ChannelType.shopify}` });

      expect(screen.getByRole('dialog', { name: 'Connect Shopify' })).toBeInTheDocument();
    });

    it('closes it for good on cancel', async () => {
      renderGrid([], { url: `/stores?connect=${ChannelType.ebay}` });

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('ignores a channel without a card, or an unknown one', () => {
      renderGrid([], { url: `/stores?connect=${ChannelType.etsy}` });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      renderGrid([], { url: '/stores?connect=myspace' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens nothing for someone who may not connect stores', () => {
      const viewer = { ...WORKSPACE, role: WorkspaceRole.VIEWER, permissions: [] };
      renderGrid([], { url: `/stores?connect=${ChannelType.shopify}`, workspace: viewer });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
