import { Database, Plus, Settings2 } from 'lucide-react';
import { Link } from 'react-router';
import { OdooConnectionStatus } from '@/api/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ROUTES } from '@/config/routes';
import { useOdooConnection } from '@/features/odoo';
import { useI18n } from '@/lib/i18n';

/** Source connector card for Odoo 18, reusing `useOdooConnection` and opening `/settings/odoo`. */
export function OdooConnectorCard({ workspaceId }: { workspaceId: string }) {
  const { t, tp } = useI18n();
  const { data } = useOdooConnection(workspaceId);
  const connection = data?.connection ?? null;
  const connected = connection?.status === OdooConnectionStatus.CONNECTED;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
              <Database className="size-5 text-foreground" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Odoo</h3>
              <p className="text-xs text-muted-foreground">
                {t('Read-only ERP source for catalog, prices, cost, and stock.')}
              </p>
            </div>
          </div>
          <Badge variant={connected ? 'secondary' : 'outline'}>
            {connected ? t('Connected') : t('Available')}
          </Badge>
        </div>
        {connected && typeof connection?.syncedProductCount === 'number' && (
          <p className="text-sm text-muted-foreground">
            {tp(connection.syncedProductCount, '1 synced product', '{count} synced products')}
          </p>
        )}
      </CardContent>
      <CardFooter className="mt-auto">
        <Button asChild variant={connected ? 'outline' : 'default'} size="sm">
          <Link to={ROUTES.odooSource}>
            {connected ? (
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
