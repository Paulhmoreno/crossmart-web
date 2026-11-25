import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChannelType, WooCommercePublishStatus } from '@/api/schema';
import {
  CHANNELS,
  type ChannelInfo,
  ConnectMethod,
  CREDENTIALS_DIALOG_COPY,
  type CredentialsConnectableChannel,
} from '../channels.constants';
import type { TestedCredentials } from '../channels.types';
import type * as ConnectionHooks from '../hooks/useChannelConnections';
import {
  useConnectWithCredentials,
  useTestChannelCredentials,
} from '../hooks/useChannelConnections';
import { ConnectChannelDialog } from './ConnectChannelDialog';

vi.mock('../hooks/useChannelConnections', async (importOriginal) => ({
  ...(await importOriginal<typeof ConnectionHooks>()),
  useConnectWithCredentials: vi.fn<typeof useConnectWithCredentials>(),
  useTestChannelCredentials: vi.fn<typeof useTestChannelCredentials>(),
}));

function channelByType(type: ChannelType): {
  channel: ChannelInfo;
  connect: CredentialsConnectableChannel;
} {
  const channel = CHANNELS.find((info) => info.connect?.type === type);
  const connect = channel?.connect;
  if (!channel || connect?.method !== ConnectMethod.Credentials) {
    throw new Error(`${type} is not connected with credentials`);
  }
  return { channel, connect };
}

function renderDialog(
  type: ChannelType,
  options: { error?: Error | null; tested?: TestedCredentials; onTest?: () => void } = {},
) {
  const testMutate = options.onTest ?? vi.fn<() => void>();
  vi.mocked(useConnectWithCredentials).mockReturnValue({
    mutate: vi.fn<() => void>(),
    reset: vi.fn<() => void>(),
    isPending: false,
    error: options.error ?? null,
  } as unknown as ReturnType<typeof useConnectWithCredentials>);
  vi.mocked(useTestChannelCredentials).mockReturnValue({
    mutate: testMutate,
    reset: vi.fn<() => void>(),
    isPending: false,
    error: null,
    data: options.tested,
  } as unknown as ReturnType<typeof useTestChannelCredentials>);
  const { channel, connect } = channelByType(type);
  render(<ConnectChannelDialog workspaceId="ws-1" channel={channel} connect={connect} open />);
  return { testMutate };
}

describe('CredentialsConnectDialog', () => {
  it('asks for the seller id, user, a masked API key and the country, with a guide', async () => {
    renderDialog(ChannelType.falabella);

    expect(screen.getByRole('heading', { name: 'Connect Falabella' })).toBeInTheDocument();
    expect(screen.getByLabelText('API key')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('combobox', { name: 'Country' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: CREDENTIALS_DIALOG_COPY.guide })).toHaveAttribute(
      'href',
      channelByType(ChannelType.falabella).connect.guideUrl,
    );
    const submit = screen.getByRole('button', { name: CREDENTIALS_DIALOG_COPY.submit });
    await userEvent.type(screen.getByLabelText('Seller ID'), 'SC478FA');
    await userEvent.type(screen.getByLabelText('User ID'), 'me@shop.cl');
    await userEvent.type(screen.getByLabelText('API key'), 'key');
    expect(submit).toBeDisabled();
  });

  it('shows why Falabella refused the details', () => {
    renderDialog(ChannelType.falabella, { error: new Error('Those details were rejected.') });

    expect(screen.getByText('Those details were rejected.')).toBeInTheDocument();
  });

  it('shows the Spanish WooCommerce single-screen form with test connection and collapsible WordPress media fields', async () => {
    const onTest = vi.fn<() => void>();
    renderDialog(ChannelType.woocommerce, {
      onTest,
      tested: {
        ok: true,
        externalAccountId: 'tienda.ejemplo.com',
        displayName: 'Mi Tienda EC',
        falabella: null,
        woocommerce: {
          storeUrl: 'https://tienda.ejemplo.com',
          storeName: 'Mi Tienda EC',
          currencyCode: 'USD',
          pricesIncludeTax: true,
          weightUnit: 'kg',
          dimensionUnit: 'cm',
          defaultStatus: WooCommercePublishStatus.draft,
          hasWordPressMediaAuth: true,
          wpUsername: 'crossmart-media',
          remoteProductCount: 24,
        },
      },
    });

    expect(screen.getByRole('heading', { name: 'Conectar WooCommerce' })).toBeInTheDocument();
    expect(screen.getByText(/Conexión verificada: Mi Tienda EC \(USD\)/)).toBeInTheDocument();
    expect(screen.getByText(/Productos remotos detectados: 24/)).toBeInTheDocument();

    const testButton = screen.getByRole('button', { name: 'Probar conexión' });
    const connectButton = screen.getByRole('button', { name: 'Conectar' });
    expect(testButton).toBeDisabled();
    expect(connectButton).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText('URL de la tienda (HTTPS)'),
      'https://tienda.ejemplo.com',
    );
    await userEvent.type(screen.getByLabelText('Consumer Key'), 'ck_demo');
    await userEvent.type(screen.getByLabelText('Consumer Secret'), 'cs_demo');

    expect(testButton).toBeEnabled();
    expect(connectButton).toBeEnabled();
    await userEvent.click(testButton);
    expect(onTest).toHaveBeenCalledWith({
      channel: ChannelType.woocommerce,
      credentials: {
        storeUrl: 'https://tienda.ejemplo.com',
        consumerKey: 'ck_demo',
        consumerSecret: 'cs_demo',
      },
    });

    await userEvent.click(screen.getByRole('button', { name: /Opciones avanzadas/ }));
    expect(screen.getByLabelText('Usuario de WordPress (para subir fotos)')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña de aplicación de WordPress')).toHaveAttribute(
      'type',
      'password',
    );
  });
});
