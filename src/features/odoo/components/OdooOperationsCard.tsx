import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';

interface OdooCapabilitiesResponse {
  module: {
    installed: boolean;
    moduleVersion: string | null;
    capabilities: {
      eventSync: boolean;
      incrementalReconcile: boolean;
      createPartner: boolean;
      createSaleOrder: boolean;
      reserveStock: boolean;
      releaseStock: boolean;
      cancelOrder: boolean;
      draftInvoice: boolean;
      postInvoice: boolean;
      writesSuspended: boolean;
    };
    outbox: {
      pending: number;
      failed: number;
      lastCommAt: string | null;
      lastSuccessAt: string | null;
    };
    error?: string;
  };
  inboundStats: {
    processedLast24h: number;
    failedLast24h: number;
    avgProcessingMs: number;
    lastEventAt: string | null;
  };
}

async function fetchOdooCapabilities(workspaceId: string): Promise<OdooCapabilitiesResponse> {
  const res = await fetch(`/api/v1/workspaces/${workspaceId}/sources/odoo/capabilities`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as OdooCapabilitiesResponse;
}

export function OdooOperationsCard({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n();
  const { data, isPending } = useQuery({
    queryKey: ['odoo-capabilities', workspaceId],
    queryFn: () => fetchOdooCapabilities(workspaceId),
    refetchInterval: 15_000,
  });

  const mod = data?.module;
  const stats = data?.inboundStats;

  const capabilityRows: Array<{ label: string; enabled: boolean }> = mod
    ? [
        { label: t('Event-driven sync'), enabled: mod.capabilities.eventSync },
        { label: t('Contact creation'), enabled: mod.capabilities.createPartner },
        { label: t('Sale order creation'), enabled: mod.capabilities.createSaleOrder },
        { label: t('Native stock reservation'), enabled: mod.capabilities.reserveStock },
        { label: t('Reservation release'), enabled: mod.capabilities.releaseStock },
        { label: t('Authorized cancellations'), enabled: mod.capabilities.cancelOrder },
        { label: t('Draft invoices'), enabled: mod.capabilities.draftInvoice },
        { label: t('Invoice posting / SRI'), enabled: mod.capabilities.postInvoice },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{t('Operational module (crossmart_connector)')}</CardTitle>
            <CardDescription>
              {t('Capabilities authorized by Odoo and real-time event queue health.')}
            </CardDescription>
          </div>
          {mod && (
            <Badge variant={mod.installed ? 'default' : 'secondary'}>
              {mod.installed
                ? `v${mod.moduleVersion ?? '18.0.1.0.0'}`
                : t('Read-only mode (module not installed)')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending ? (
          <p className="text-sm text-muted-foreground">{t('Loading...')}</p>
        ) : mod ? (
          <>
            {mod.capabilities.writesSuspended && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                <ShieldAlert className="size-4 shrink-0" />
                <span>{t('Commercial writes are currently suspended from Odoo.')}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {capabilityRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"
                >
                  <span>{row.label}</span>
                  {row.enabled ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      {t('Authorized')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <XCircle className="size-3.5" />
                      {t('Disabled')}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-4 text-xs sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground">{t('Pending events')}</p>
                <p className="text-base font-semibold">{mod.outbox.pending}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('Failed events')}</p>
                <p className="text-base font-semibold text-destructive">{mod.outbox.failed}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('Processed (24h)')}</p>
                <p className="text-base font-semibold">{stats?.processedLast24h ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('Avg latency')}</p>
                <p className="text-base font-semibold">{stats?.avgProcessingMs ?? 0} ms</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('Read-only connector active. Install crossmart_connector in Odoo 18 to enable event sync and operational writes.')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
