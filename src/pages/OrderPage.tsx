import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { WorkspacePermission } from '@/api/schema';
import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { Page } from '@/components/layout/Page';
import { type ResourcePageCopy, ResourcePage } from '@/components/layout/ResourcePage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PAGE_PARENTS } from '@/config/navigation';
import { ROUTE_PARAMS } from '@/config/routes';
import { useOdooConnection } from '@/features/odoo';
import { OrderLinesTable, OrderStatusBadge, useOrder } from '@/features/orders';
import { ReleaseReservationDialog } from '@/features/orders/components/ReleaseReservationDialog';
import { hasPermission, type Workspace } from '@/features/workspaces';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

function formatOptionalAmount(value: unknown, currencyCode: string, fallback: string): string {
  if (typeof value === 'number' || typeof value === 'string') {
    return formatMoney(String(value), currencyCode);
  }
  return fallback;
}

const ORDER_PAGE_COPY: ResourcePageCopy = {
  name: 'Order',
  notFoundName: 'Order not found',
  notFound: 'This order does not exist in this workspace.',
  loadFailed: 'This order could not be loaded',
};

interface ExtendedOrderFields {
  commercialStatus?: string;
  paymentStatus?: string;
  reservationStatus?: string;
  logisticsStatus?: string;
  invoicingStatus?: string;
  financialStatus?: string;
  manualInterventionRequired?: boolean;
  manualReleaseLock?: boolean;
  manualReleaseReason?: string | null;
  erpOrderName?: string | null;
  erpInvoiceName?: string | null;
  financialBreakdown?: Record<string, unknown> | null;
  logisticsInfo?: Record<string, unknown> | null;
  incidents?: Array<{ code?: string; message?: string; createdAt?: string }>;
  events?: Array<{
    id: string;
    eventType: string;
    summary: string;
    actorLabel: string | null;
    createdAt: string;
  }>;
}

function Order({ workspace, orderId }: { workspace: Workspace; orderId: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const query = useOrder(workspace.id, orderId);
  const odooQuery = useOdooConnection(workspace.id);
  const hasOdoo = Boolean(odooQuery.data?.connection);
  const canManage = hasPermission(workspace, WorkspacePermission.channels_manage);

  const reReserveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/v1/workspaces/${workspace.id}/orders/${orderId}/re-reserve`,
        { method: 'POST', credentials: 'include' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('Reservation restored'));
      void queryClient.invalidateQueries({
        queryKey: ['get', '/api/v1/workspaces/{workspaceId}/orders/{orderId}'],
      });
    },
    onError: () => toast.error(t('Could not restore reservation')),
  });

  const invoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/workspaces/${workspace.id}/orders/${orderId}/invoice`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post: false }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('Draft invoice created in Odoo'));
      void queryClient.invalidateQueries({
        queryKey: ['get', '/api/v1/workspaces/{workspaceId}/orders/{orderId}'],
      });
    },
    onError: (err: Error) => toast.error(err.message || t('Could not generate invoice')),
  });

  return (
    <ResourcePage query={query} copy={ORDER_PAGE_COPY} parents={PAGE_PARENTS.orders}>
      {(order) => {
        const ext = order as unknown as ExtendedOrderFields;
        const reservedUnits = order.lines.reduce((sum, line) => sum + line.reservedQuantity, 0);
        const productSummary = order.lines.map((line) => `${line.title} (x${line.quantity})`).join(', ');
        const incidents = ext.incidents ?? [];
        const events = ext.events ?? [];
        const fin = ext.financialBreakdown ?? null;
        const logi = ext.logisticsInfo ?? null;

        return (
          <Page
            name={order.name}
            parents={PAGE_PARENTS.orders}
            title={
              <>
                <span>{order.name}</span>
                <OrderStatusBadge status={order.status} />
              </>
            }
            description={`${order.storeName} · ${formatDateTime(order.placedAt)} · ${formatMoney(order.total, order.currencyCode)}`}
            actions={
              canManage ? (
                <div className="flex flex-wrap items-center gap-2">
                  {reservedUnits > 0 && !ext.manualReleaseLock && (
                    <ReleaseReservationDialog
                      workspaceId={workspace.id}
                      orderId={order.id}
                      orderName={order.name}
                      commercialStatus={ext.commercialStatus ?? order.status}
                      reservedUnits={reservedUnits}
                      productSummary={productSummary}
                    />
                  )}
                  {ext.manualReleaseLock && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reReserveMutation.isPending}
                      onClick={() => reReserveMutation.mutate()}
                    >
                      <RefreshCw className="mr-1.5 size-3.5" />
                      {t('Re-reserve')}
                    </Button>
                  )}
                  {hasOdoo && !ext.erpInvoiceName && order.status !== 'CANCELLED' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={invoiceMutation.isPending}
                      onClick={() => invoiceMutation.mutate()}
                    >
                      <FileText className="mr-1.5 size-3.5" />
                      {t('Generate draft invoice')}
                    </Button>
                  )}
                </div>
              ) : undefined
            }
          >
            <Tabs defaultValue="summary" className="gap-4">
              <TabsList variant="line" className="w-full justify-start border-b">
                <TabsTrigger value="summary">{t('Summary')}</TabsTrigger>
                <TabsTrigger value="financials">{t('Financials')}</TabsTrigger>
                <TabsTrigger value="logistics">{t('Logistics')}</TabsTrigger>
                <TabsTrigger value="history">{t('History')}</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{t('Commercial')}</p>
                      <Badge variant="outline" className="mt-1">
                        {ext.commercialStatus ?? order.status}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{t('Payment')}</p>
                      <Badge variant="outline" className="mt-1">
                        {ext.paymentStatus ?? 'PENDING'}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{t('Reservation')}</p>
                      <Badge variant="outline" className="mt-1">
                        {ext.reservationStatus ?? 'UNRESERVED'}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{t('Logistics')}</p>
                      <Badge variant="outline" className="mt-1">
                        {ext.logisticsStatus ?? 'PENDING'}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{t('Invoicing')}</p>
                      <Badge variant="outline" className="mt-1">
                        {ext.invoicingStatus ?? 'NOT_INVOICED'}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                {incidents.length > 0 && (
                  <Card className="border-amber-500/40 bg-amber-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="size-4 text-amber-500" />
                        {t('Operational incidents')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs">
                      {incidents.map((inc, idx) => (
                        <p key={`${inc.code ?? 'inc'}-${idx}`}>• {inc.message}</p>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {hasOdoo && (ext.erpOrderName || ext.erpInvoiceName) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t('Odoo documents')}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-6 text-xs">
                      <div>
                        <span className="text-muted-foreground">{t('Sale order')}: </span>
                        <strong>{ext.erpOrderName ?? '—'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('Invoice')}: </span>
                        <strong>{ext.erpInvoiceName ?? '—'}</strong>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <OrderLinesTable lines={order.lines} currency={order.currencyCode} />
              </TabsContent>

              <TabsContent value="financials">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{t('Financial breakdown')}</CardTitle>
                      <Badge variant="secondary">{ext.financialStatus ?? 'UNAVAILABLE'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {fin ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="flex justify-between border-b py-1.5">
                          <span className="text-muted-foreground">{t('Gross sale')}</span>
                          <span>{formatOptionalAmount(fin.grossSale, order.currencyCode, t('Unavailable'))}</span>
                        </div>
                        <div className="flex justify-between border-b py-1.5">
                          <span className="text-muted-foreground">{t('Marketplace commission')}</span>
                          <span>
                            {formatOptionalAmount(fin.marketplaceCommission, order.currencyCode, t('Unavailable'))}
                          </span>
                        </div>
                        <div className="flex justify-between border-b py-1.5">
                          <span className="text-muted-foreground">{t('Shipping cost')}</span>
                          <span>{formatOptionalAmount(fin.shippingCost, order.currencyCode, t('Unavailable'))}</span>
                        </div>
                        <div className="flex justify-between border-b py-1.5">
                          <span className="text-muted-foreground">{t('Expected settlement')}</span>
                          <span>
                            {formatOptionalAmount(fin.expectedSettlement, order.currencyCode, t('Unavailable'))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t('Financial breakdown data is not yet available from the channel. Missing values are never estimated or invented.')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logistics">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('Logistics & fulfillment')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <p>
                      <span className="text-muted-foreground">{t('Logistics status')}: </span>
                      <strong>{ext.logisticsStatus ?? 'PENDING'}</strong>
                    </p>
                    <p>
                      <span className="text-muted-foreground">{t('Label status')}: </span>
                      <strong>
                        {logi && typeof logi.labelStatus === 'string'
                          ? logi.labelStatus
                          : t('Unavailable')}
                      </strong>
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('Operational history')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {events.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t('No operational events recorded yet for this order.')}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {events.map((ev) => (
                          <div key={ev.id} className="border-l-2 border-border pl-3 text-xs">
                            <p className="font-medium">{ev.summary}</p>
                            <p className="text-muted-foreground">
                              {formatDateTime(ev.createdAt)} · {ev.actorLabel ?? 'Sistema'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </Page>
        );
      }}
    </ResourcePage>
  );
}

export function OrderPage() {
  const orderId = useParams()[ROUTE_PARAMS.orderId] ?? '';
  return (
    <WorkspaceGate>
      {(workspace) => <Order workspace={workspace} orderId={orderId} />}
    </WorkspaceGate>
  );
}
