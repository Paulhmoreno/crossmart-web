import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ChannelConnectionStatus, WorkspacePermission } from '@/api/schema';
import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { Page } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PAGE_PARENTS } from '@/config/navigation';
import { ConnectionStatusBadge } from '@/features/channels/components/ConnectionStatusBadge';
import { socialMarketingApi } from '@/features/commercial-agents/social-api';
import { hasPermission, type Workspace } from '@/features/workspaces';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

function TryPostContent({ workspace }: { workspace: Workspace }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const canManage = hasPermission(workspace, WorkspacePermission.channels_manage);
  const [newApiKey, setNewApiKey] = useState('');

  const { data } = useQuery({
    queryKey: ['trypost-connection', workspace.id],
    queryFn: () => socialMarketingApi.getTryPost(workspace.id),
  });
  const conn = data?.connection ?? null;
  const badgeStatus =
    conn?.status === 'CONNECTED'
      ? ChannelConnectionStatus.CONNECTED
      : conn?.status === 'ERROR'
        ? ChannelConnectionStatus.ERROR
        : null;

  const testMutation = useMutation({
    mutationFn: () => socialMarketingApi.testTryPost(workspace.id, {}),
    onSuccess: (res) => {
      if (res.ok) toast.success(t('TryPost connection verified'));
      else toast.error(res.error ?? t('Connection failed'));
      void qc.invalidateQueries({ queryKey: ['trypost-connection', workspace.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rotateMutation = useMutation({
    mutationFn: () =>
      socialMarketingApi.upsertTryPost(workspace.id, {
        apiKey: newApiKey.trim(),
        baseUrl: conn?.baseUrl,
      }),
    onSuccess: () => {
      setNewApiKey('');
      toast.success(t('TryPost API key updated'));
      void qc.invalidateQueries({ queryKey: ['trypost-connection', workspace.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => socialMarketingApi.disconnectTryPost(workspace.id),
    onSuccess: () => {
      toast.success(t('TryPost disconnected'));
      void qc.invalidateQueries({ queryKey: ['trypost-connection', workspace.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Page
      name="TryPost"
      parents={PAGE_PARENTS.stores}
      title={
        <>
          <span>TryPost</span>
          {badgeStatus && <ConnectionStatusBadge status={badgeStatus} />}
        </>
      }
      description={conn?.baseUrl ?? 'https://app.trypost.it/api'}
    >
      <div className="flex max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('TryPost connection')}</CardTitle>
            <CardDescription>
              {t('REST API integration for editorial ideas, drafts, media uploads, queues, and social analytics.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">{t('Endpoint')}</p>
                <p className="mt-0.5 font-mono font-medium">{conn?.baseUrl ?? '—'}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">{t('Configured API Key')}</p>
                <p className="mt-0.5 font-mono font-medium">{conn?.secretMasked ?? t('Not configured')}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">{t('Last communication')}</p>
                <p className="mt-0.5 font-medium">
                  {conn?.lastTestedAt ? formatDateTime(conn.lastTestedAt) : t('Never')}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">{t('Authorized accounts')}</p>
                <p className="mt-0.5 font-medium">{conn?.channels.length ?? 0}</p>
              </div>
            </div>

            {conn && conn.channels.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">{t('Connected social accounts')}</p>
                <div className="flex flex-wrap gap-2">
                  {conn.channels.map((ch) => (
                    <Badge key={ch.id} variant="secondary">
                      {ch.platform}: {ch.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {conn && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(conn.capabilities).map(([cap, enabled]) => (
                  <div key={cap} className="flex items-center justify-between rounded-md border px-2.5 py-1.5">
                    <span className="truncate">{cap}</span>
                    {enabled ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="size-3.5 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {canManage && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="tp-rotate">{t('Renew API Key')}</Label>
                    <Input
                      id="tp-rotate"
                      type="password"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="tp_..."
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={!newApiKey.trim() || rotateMutation.isPending}
                    onClick={() => rotateMutation.mutate()}
                  >
                    {t('Update key')}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!conn || testMutation.isPending}
                    onClick={() => testMutation.mutate()}
                  >
                    <RefreshCw className="mr-1.5 size-3.5" />
                    {t('Test connection')}
                  </Button>
                  {conn?.status === 'CONNECTED' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={disconnectMutation.isPending}
                      onClick={() => disconnectMutation.mutate()}
                    >
                      <Trash2 className="mr-1.5 size-3.5" />
                      {t('Revoke & disconnect')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}

export function TryPostPage() {
  return <WorkspaceGate>{(workspace) => <TryPostContent workspace={workspace} />}</WorkspaceGate>;
}
