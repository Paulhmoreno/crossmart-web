import { useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import { Link } from 'react-router';
import { ChannelConnectionStatus, OdooConnectionStatus } from '@/api/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ROUTES } from '@/config/routes';
import { ChannelLogo } from '@/features/channels/components/ChannelLogo';
import { ConnectionStatusBadge } from '@/features/channels/components/ConnectionStatusBadge';
import { OdooConnectionForm, useOdooConnection } from '@/features/odoo';
import { useI18n } from '@/lib/i18n';
import odooLogo from './assets/logos/odoo.svg';

const ODOO_LOGO = { src: odooLogo } as const;

function mapOdooStatus(status: OdooConnectionStatus | undefined): ChannelConnectionStatus | null {
  if (status === OdooConnectionStatus.CONNECTED) return ChannelConnectionStatus.CONNECTED;
  if (status === OdooConnectionStatus.ERROR) return ChannelConnectionStatus.ERROR;
  return null;
}

/**
 * Source connector card for Odoo 18, matching native Crossmart store cards:
 * - Unconfigured: Connect opens a native connection dialog reusing `OdooConnectionForm`.
 * - Configured: Manage opens `/stores/odoo` inside Connectors (same navigation pattern as StorePage).
 */
export function OdooConnectorCard({
  workspaceId,
  canManage = true,
}: {
  workspaceId: string;
  canManage?: boolean;
}) {
  const { t, tp } = useI18n();
  const { data } = useOdooConnection(workspaceId);
  const [connectOpen, setConnectOpen] = useState(false);
  const connection = data?.connection ?? null;
  const badgeStatus = mapOdooStatus(connection?.status);
  const connected = connection?.status === OdooConnectionStatus.CONNECTED;

  return (
    <>
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
          {connection ? (
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.odooSource}>
                <Settings2 data-icon="inline-start" />
                {t('Manage')}
              </Link>
            </Button>
          ) : canManage ? (
            <Button type="button" size="sm" onClick={() => setConnectOpen(true)}>
              <Plus data-icon="inline-start" />
              {t('Connect')}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('Ask a workspace admin to connect it.')}
            </p>
          )}
        </CardFooter>
      </Card>

      {!connection && connectOpen && (
        <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
          <DialogContent className="max-h-[85vh] overflow-x-hidden overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{t('Connect Odoo')}</DialogTitle>
              <DialogDescription>
                {t('Read-only ERP source for catalog, prices, cost, and stock.')}
              </DialogDescription>
            </DialogHeader>
            <OdooConnectionForm
              workspaceId={workspaceId}
              connection={null}
              canManage={canManage}
              embedded
              onSaved={() => setConnectOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
