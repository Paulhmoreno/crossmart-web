import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { env } from '@/config/env';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

type PairingState =
  | 'unpaired'
  | 'pending_odoo'
  | 'outbound_only'
  | 'inbound_only'
  | 'verified'
  | 'revoked';

interface OdooPairingStatus {
  state: PairingState;
  connectionId: string | null;
  secretConfigured: boolean;
  secretMasked: string | null;
  crossmartApiUrl: string;
  isLocalOnlyUrl: boolean;
  odooIsRemote: boolean;
  inboundVerified: boolean;
  outboundVerified: boolean;
  createdAt: string | null;
  rotatedAt: string | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
}

interface GeneratedPairingCredentials {
  connectionId: string;
  crossmartApiUrl: string;
  apiSecret: string;
  secretMasked: string;
  isLocalOnlyUrl: boolean;
  odooIsRemote: boolean;
  rotated: boolean;
  createdAt: string;
}

interface PairingTestResult {
  ok: boolean;
  state: PairingState;
  outboundOk: boolean;
  inboundOk: boolean;
  outboundError: string | null;
  moduleVersion: string | null;
}

interface OdooCapabilitiesResponse {
  pairing?: OdooPairingStatus;
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
  const res = await fetch(`${env.apiUrl}/api/v1/workspaces/${workspaceId}/sources/odoo/capabilities`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as OdooCapabilitiesResponse;
}

function CopyableRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const { t } = useI18n();
  function handleCopy() {
    void navigator.clipboard.writeText(value);
    toast.success(t('Copied to clipboard'));
  }
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-xs">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground">{label}</p>
        <p className={`truncate font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>
        <Copy className="mr-1 size-3.5" />
        {t('Copy')}
      </Button>
    </div>
  );
}

function pairingBadgeMeta(state: PairingState): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
} {
  if (state === 'verified') {
    return {
      label: 'Bidirectional pairing verified',
      variant: 'default',
      className: 'bg-emerald-600 text-white hover:bg-emerald-600',
    };
  }
  if (state === 'outbound_only') {
    return { label: 'Odoo -> Crossmart pending', variant: 'secondary' };
  }
  if (state === 'inbound_only') {
    return { label: 'Crossmart -> Odoo pending', variant: 'secondary' };
  }
  if (state === 'pending_odoo') {
    return { label: 'Waiting for Odoo setup', variant: 'secondary' };
  }
  if (state === 'revoked') {
    return { label: 'Credentials revoked', variant: 'destructive' };
  }
  return { label: 'Pending pairing', variant: 'outline' };
}

export function OdooOperationsCard({
  workspaceId,
  canManage = false,
}: {
  workspaceId: string;
  canManage?: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState<GeneratedPairingCredentials | null>(null);
  const [confirmAction, setConfirmAction] = useState<'rotate' | 'revoke' | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ['odoo-capabilities', workspaceId],
    queryFn: () => fetchOdooCapabilities(workspaceId),
    refetchInterval: 15_000,
  });

  const generateMutation = useMutation({
    mutationFn: async (rotate: boolean): Promise<GeneratedPairingCredentials> => {
      const res = await fetch(`${env.apiUrl}/api/v1/workspaces/${workspaceId}/sources/odoo/pairing/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as GeneratedPairingCredentials;
    },
    onSuccess: (creds) => {
      setRevealed(creds);
      setConfirmAction(null);
      toast.success(
        creds.rotated
          ? t('Pairing credentials renewed. Previous credentials are now invalid.')
          : t('Pairing credentials generated'),
      );
      void queryClient.invalidateQueries({ queryKey: ['odoo-capabilities', workspaceId] });
    },
    onError: () => toast.error(t('Could not generate pairing credentials')),
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${env.apiUrl}/api/v1/workspaces/${workspaceId}/sources/odoo/pairing/revoke`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      setRevealed(null);
      setConfirmAction(null);
      toast.success(t('Pairing credentials revoked'));
      void queryClient.invalidateQueries({ queryKey: ['odoo-capabilities', workspaceId] });
    },
    onError: () => toast.error(t('Could not revoke pairing credentials')),
  });

  const testMutation = useMutation({
    mutationFn: async (): Promise<PairingTestResult> => {
      const res = await fetch(`${env.apiUrl}/api/v1/workspaces/${workspaceId}/sources/odoo/pairing/test`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as PairingTestResult;
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(t('Bidirectional communication verified successfully'));
      } else if (result.outboundOk && !result.inboundOk) {
        toast.warning(
          t('Crossmart reached Odoo, but Odoo has not confirmed communication to Crossmart yet.'),
        );
      } else if (!result.outboundOk && result.inboundOk) {
        toast.warning(
          t('Odoo reached Crossmart, but Crossmart could not verify the module endpoint in Odoo.'),
        );
      } else {
        toast.error(
          result.outboundError ?? t('Could not verify bidirectional communication with Odoo.'),
        );
      }
      void queryClient.invalidateQueries({ queryKey: ['odoo-capabilities', workspaceId] });
    },
    onError: () => toast.error(t('Could not test connection')),
  });

  const pairing = data?.pairing;
  const mod = data?.module;
  const stats = data?.inboundStats;
  const badge = pairing ? pairingBadgeMeta(pairing.state) : null;
  const lastSuccess =
    pairing?.lastInboundAt ?? pairing?.lastOutboundAt ?? mod?.outbox.lastSuccessAt ?? null;

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{t('Crossmart module pairing')}</CardTitle>
              <CardDescription>
                {t('Generate credentials here and paste them into Odoo under General Settings -> Crossmart.')}
              </CardDescription>
            </div>
            {badge && (
              <Badge variant={badge.variant} className={badge.className}>
                {t(badge.label)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPending ? (
            <p className="text-sm text-muted-foreground">{t('Loading...')}</p>
          ) : (
            <>
              {pairing?.isLocalOnlyUrl && pairing.odooIsRemote && (
                <div className="flex items-start gap-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">
                      {t('Local Crossmart API URL is not reachable from a remote Odoo server')}
                    </p>
                    <p>
                      {t('Your Crossmart API is currently running on a local address')}{' '}
                      (<span className="font-mono">{pairing.crossmartApiUrl}</span>).{' '}
                      {t('For a remote Odoo server to send events to Crossmart, use a controlled temporary HTTPS tunnel for testing, an authorized private network, or a permanent HTTPS domain for production.')}
                    </p>
                  </div>
                </div>
              )}

              {!pairing?.secretConfigured && !revealed ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-4">
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-foreground">
                      {t('Status')}: {t('Pending pairing')}
                    </p>
                    <p className="text-muted-foreground">
                      {t('Read-only catalog sync stays active. Generate pairing credentials to connect the crossmart_connector module in Odoo 18.')}
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      size="sm"
                      disabled={generateMutation.isPending}
                      onClick={() => generateMutation.mutate(false)}
                    >
                      <KeyRound className="mr-1.5 size-3.5" />
                      {generateMutation.isPending ? t('Generating...') : t('Generate credentials')}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {revealed && (
                    <div className="space-y-2.5 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3.5">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        {t('Copy these credentials into Odoo -> General Settings -> Crossmart -> Connection, click Test Connection, and Save.')}
                      </p>
                      <CopyableRow label={t('Crossmart API URL')} value={revealed.crossmartApiUrl} />
                      <CopyableRow label={t('Connection ID')} value={revealed.connectionId} />
                      <CopyableRow label={t('Integration secret (shown once)')} value={revealed.apiSecret} />
                      <p className="text-[11px] text-muted-foreground">
                        {t('For security, the full secret is only displayed now. After leaving this screen it will remain masked.')}
                      </p>
                    </div>
                  )}

                  {pairing && (
                    <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
                      <div className="rounded-md border px-3 py-2">
                        <p className="text-muted-foreground">{t('Installed module version')}</p>
                        <p className="mt-0.5 font-medium">
                          {mod?.installed
                            ? `v${mod.moduleVersion ?? '18.0.1.0.0'}`
                            : t('Not detected')}
                        </p>
                      </div>
                      <div className="rounded-md border px-3 py-2">
                        <p className="text-muted-foreground">{t('Last successful communication')}</p>
                        <p className="mt-0.5 font-medium">
                          {lastSuccess ? formatDateTime(lastSuccess) : t('Never')}
                        </p>
                      </div>
                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-muted-foreground">Crossmart → Odoo</span>
                        {pairing.outboundVerified ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5" />
                            {t('Verified')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-3.5" />
                            {t('Pending')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-muted-foreground">Odoo → Crossmart</span>
                        {pairing.inboundVerified ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5" />
                            {t('Verified')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-3.5" />
                            {t('Pending')}
                          </span>
                        )}
                      </div>
                      {!revealed && pairing.connectionId && (
                        <div className="sm:col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <CopyableRow label={t('Crossmart API URL')} value={pairing.crossmartApiUrl} />
                          <CopyableRow
                            label={`${t('Connection ID')} (${pairing.secretMasked ?? '••••••'})`}
                            value={pairing.connectionId}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {canManage && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={testMutation.isPending}
                        onClick={() => testMutation.mutate()}
                      >
                        <RefreshCw className="mr-1.5 size-3.5" />
                        {testMutation.isPending ? t('Testing...') : t('Test connection')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={generateMutation.isPending}
                        onClick={() => setConfirmAction('rotate')}
                      >
                        <KeyRound className="mr-1.5 size-3.5" />
                        {t('Renew credentials')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={revokeMutation.isPending}
                        onClick={() => setConfirmAction('revoke')}
                      >
                        <Trash2 className="mr-1.5 size-3.5" />
                        {t('Revoke pairing')}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

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

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'rotate' ? t('Renew pairing credentials') : t('Revoke module pairing')}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'rotate'
                ? t('Generating a new secret will immediately invalidate the previous secret. You will need to paste the new secret in Odoo.')
                : t('Revoking pairing credentials will immediately stop event synchronization and operational requests until new credentials are generated. Read-only catalog sync is not affected.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>
              {t('Cancel')}
            </Button>
            {confirmAction === 'rotate' ? (
              <Button
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate(true)}
              >
                {t('Confirm renewal')}
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={revokeMutation.isPending}
                onClick={() => revokeMutation.mutate()}
              >
                {t('Confirm revocation')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
