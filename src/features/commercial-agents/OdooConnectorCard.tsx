import { Plus, Settings2 } from 'lucide-react';
import { Link } from 'react-router';
import { ChannelConnectionStatus, OdooConnectionStatus } from '@/api/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ROUTES } from '@/config/routes';
import { ChannelLogo } from '@/features/channels/components/ChannelLogo';
import { ConnectionStatusBadge } from '@/features/channels/components/ConnectionStatusBadge';
import { useOdooConnection } from '@/features/odoo';
import { useI18n } from '@/lib/i18n';
import odooLogo from './assets/logos/odoo.svg';

const ODOO_LOGO = { src: odooLogo } as const;

function mapOdooStatus(status: OdooConnectionStatus | undefined): ChannelConnectionStatus | null {
  if (status === OdooConnectionStatus.CONNECTED) return ChannelConnectionStatus.CONNECTED;
  if (status === OdooConnectionStatus.ERROR) return ChannelConnectionStatus.ERROR;
  return null;
}

/** Source connector card for Odoo 18, matching native Crossmart store cards. */
export function OdooConnectorCard({ workspaceId }: { workspaceId: string }) {
  const { t, tp } = useI18n();
  const { data } = useOdooConnection(workspaceId);
  const connection = data?.connection ?? null;
  const badgeStatus = mapOdooStatus(connection?.status);
  const connected = connection?.status === OdooConnectionStatus.CONNECTED;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <ChannelLogo logo={ODOO_LOGO} />
          {badgeStatus ? (
            <ConnectionStatusBadge status={badgeStatus} />
          ) : (
            <Badge variant="outline">{t('Available')}</Badge>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-medium">Odoo</h2>
          <p className="text-sm text-muted-foreground">
            {t('Read-only ERP source for catalog, prices, cost, and stock.')}
          </p>
        </div>
        {connected && typeof connection?.syncedProductCount === 'number' && (
          <p className="text-sm text-muted-foreground">
            {tp(connection.syncedProductCount, '1 synced product', '{count} synced products')}
          </p>
        )}
      </CardContent>
      <CardFooter className="mt-auto">
        <Button asChild variant={connection ? 'outline' : 'default'} size="sm">
          <Link to={ROUTES.odooSource}>
            {connection ? (
              <>
                <Settings2 data-icon="inline-start" />
                {t('Manage')}
              </>
            ) : (
              <>
                <Plus data-icon="inline-start" />
                {t('Connect')}
              </>
            )}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
