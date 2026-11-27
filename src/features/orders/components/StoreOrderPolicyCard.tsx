import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { env } from '@/config/env';
import type { ChannelConnection } from '@/features/channels';
import { useOdooConnection } from '@/features/odoo';
import { useI18n } from '@/lib/i18n';

interface OrderPolicyState {
  importOrders: boolean;
  createErpOrder: boolean;
  reserveInventory: boolean;
  autoCancelRelease: boolean;
  invoicingPolicy: 'MANUAL' | 'DRAFT_ON_ORDER' | 'ON_LABEL_PRINT' | 'ON_LOGISTICS_EVENT' | 'SCHEDULED';
  autoInvoicingEnabled: boolean;
  scheduledInvoicingTime: string;
  importFinancials: boolean;
}

function readPolicy(connection: ChannelConnection): OrderPolicyState {
  const connRecord = connection as unknown as { settings?: Record<string, unknown> };
  const settings = connRecord.settings ?? {};
  const raw = (settings.orderPolicy ?? {}) as Record<string, unknown>;
  const policyVal = raw.invoicingPolicy;
  return {
    importOrders:
      typeof raw.importOrders === 'boolean' ? raw.importOrders : Boolean(settings.importOrders),
    createErpOrder: Boolean(raw.createErpOrder),
    reserveInventory: typeof raw.reserveInventory === 'boolean' ? raw.reserveInventory : true,
    autoCancelRelease: typeof raw.autoCancelRelease === 'boolean' ? raw.autoCancelRelease : true,
    invoicingPolicy:
      policyVal === 'DRAFT_ON_ORDER' ||
      policyVal === 'ON_LABEL_PRINT' ||
      policyVal === 'ON_LOGISTICS_EVENT' ||
      policyVal === 'SCHEDULED'
        ? policyVal
        : 'MANUAL',
    autoInvoicingEnabled: Boolean(raw.autoInvoicingEnabled),
    scheduledInvoicingTime:
      typeof raw.scheduledInvoicingTime === 'string' ? raw.scheduledInvoicingTime : '18:00',
    importFinancials: typeof raw.importFinancials === 'boolean' ? raw.importFinancials : true,
  };
}

interface StoreOrderPolicyCardProps {
  workspaceId: string;
  connection: ChannelConnection;
  canManage: boolean;
}

export function StoreOrderPolicyCard({
  workspaceId,
  connection,
  canManage,
}: StoreOrderPolicyCardProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const odooQuery = useOdooConnection(workspaceId);
  const hasOdoo = Boolean(odooQuery.data?.connection);
  const isMercadoLibre = String(connection.channel).toUpperCase().includes('MERCADO');

  const [policy, setPolicy] = useState<OrderPolicyState>(() => readPolicy(connection));

  const saveMutation = useMutation({
    mutationFn: async (next: OrderPolicyState) => {
      const connRecord = connection as unknown as { settings?: Record<string, unknown> };
      const existingSettings = connRecord.settings ?? {};
      const res = await fetch(
        `${env.apiUrl}/api/v1/workspaces/${workspaceId}/channels/${connection.id}/settings`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...existingSettings,
            importOrders: next.importOrders,
            orderPolicy: {
              ...next,
              invoicingTimezone: 'America/Guayaquil',
            },
          }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('Order management settings saved'));
      void queryClient.invalidateQueries({
        queryKey: ['get', '/api/v1/workspaces/{workspaceId}/channels/{connectionId}'],
      });
    },
    onError: () => {
      toast.error(t('Could not save order management settings'));
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{t('Order management')}</CardTitle>
            <CardDescription>
              {t('Operational rules for order reception, inventory reservation, invoicing, and financial tracking.')}
            </CardDescription>
          </div>
          <Badge variant={policy.importOrders ? 'default' : 'secondary'}>
            {policy.importOrders ? t('Active') : t('Paused')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-md border p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('Orders & reservations')}
            </p>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="pol-import" className="text-sm font-normal">
                {t('Automatic order import')}
              </Label>
              <Switch
                id="pol-import"
                disabled={!canManage}
                checked={policy.importOrders}
                onCheckedChange={(checked) => setPolicy((p) => ({ ...p, importOrders: checked }))}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="pol-reserve" className="text-sm font-normal">
                {t('Automatic stock reservation')}
              </Label>
              <Switch
                id="pol-reserve"
                disabled={!canManage}
                checked={policy.reserveInventory}
                onCheckedChange={(checked) =>
                  setPolicy((p) => ({ ...p, reserveInventory: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="pol-cancel" className="text-sm font-normal">
                {t('Auto-cancel & release on cancellation')}
              </Label>
              <Switch
                id="pol-cancel"
                disabled={!canManage}
                checked={policy.autoCancelRelease}
                onCheckedChange={(checked) =>
                  setPolicy((p) => ({ ...p, autoCancelRelease: checked }))
                }
              />
            </div>
            {hasOdoo && (
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="pol-erp" className="text-sm font-normal">
                  {t('Create sale order in Odoo')}
                </Label>
                <Switch
                  id="pol-erp"
                  disabled={!canManage}
                  checked={policy.createErpOrder}
                  onCheckedChange={(checked) =>
                    setPolicy((p) => ({ ...p, createErpOrder: checked }))
                  }
                />
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-md border p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('Invoicing & financials')}
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('Invoicing policy')}</Label>
              <Select
                disabled={!canManage}
                value={policy.invoicingPolicy}
                onValueChange={(value) =>
                  setPolicy((p) => ({
                    ...p,
                    invoicingPolicy: value as OrderPolicyState['invoicingPolicy'],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">{t('Manual invoicing')}</SelectItem>
                  <SelectItem value="DRAFT_ON_ORDER">{t('Draft invoice on order')}</SelectItem>
                  {isMercadoLibre && (
                    <SelectItem value="ON_LABEL_PRINT">{t('On first label print')}</SelectItem>
                  )}
                  <SelectItem value="ON_LOGISTICS_EVENT">
                    {t('On authorized logistics event')}
                  </SelectItem>
                  <SelectItem value="SCHEDULED">{t('Scheduled daily (Guayaquil)')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {policy.invoicingPolicy === 'SCHEDULED' && (
              <div className="space-y-1">
                <Label htmlFor="pol-time" className="text-xs text-muted-foreground">
                  {t('Scheduled time (America/Guayaquil)')}
                </Label>
                <Input
                  id="pol-time"
                  type="time"
                  disabled={!canManage}
                  value={policy.scheduledInvoicingTime}
                  onChange={(e) =>
                    setPolicy((p) => ({ ...p, scheduledInvoicingTime: e.target.value }))
                  }
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="pol-auto-inv" className="text-sm font-normal">
                {t('Enable automatic invoicing')}
              </Label>
              <Switch
                id="pol-auto-inv"
                disabled={!canManage}
                checked={policy.autoInvoicingEnabled}
                onCheckedChange={(checked) =>
                  setPolicy((p) => ({ ...p, autoInvoicingEnabled: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="pol-fin" className="text-sm font-normal">
                {t('Import financial breakdown')}
              </Label>
              <Switch
                id="pol-fin"
                disabled={!canManage}
                checked={policy.importFinancials}
                onCheckedChange={(checked) =>
                  setPolicy((p) => ({ ...p, importFinancials: checked }))
                }
              />
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(policy)}
            >
              {saveMutation.isPending ? t('Saving...') : t('Save order settings')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
