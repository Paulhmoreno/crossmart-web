import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ChannelConnectionStatus } from '@/api/schema';
import { CopyableValue } from '@/components/forms/CopyableValue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ChannelLogo } from '@/features/channels/components/ChannelLogo';
import { ConnectionStatusBadge } from '@/features/channels/components/ConnectionStatusBadge';
import { useI18n } from '@/lib/i18n';
import { type ChatwootConnectionView, commercialAgentsApi } from './api';
import chatwootLogo from './assets/logos/chatwoot.svg';

const CHATWOOT_LOGO = { src: chatwootLogo } as const;

interface DiscoveredAccount {
  id: number;
  name: string;
}

function mapChatwootStatus(
  status: ChatwootConnectionView['status'] | undefined,
): ChannelConnectionStatus | 'DISABLED' | null {
  if (status === 'CONNECTED') return ChannelConnectionStatus.CONNECTED;
  if (status === 'ERROR') return ChannelConnectionStatus.ERROR;
  if (status === 'DISABLED') return 'DISABLED';
  return null;
}

function ChatwootDialog({
  workspaceId,
  editing,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  editing: ChatwootConnectionView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, tp } = useI18n();
  const qc = useQueryClient();
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl ?? '');
  const [apiAccessToken, setApiAccessToken] = useState('');
  const [accountId, setAccountId] = useState(editing?.accountId ? String(editing.accountId) : '');
  const [discoveredAccounts, setDiscoveredAccounts] = useState<DiscoveredAccount[]>(
    editing?.accountId && editing.accountName
      ? [{ id: editing.accountId, name: editing.accountName }]
      : [],
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [name, setName] = useState(editing?.name ?? 'Chatwoot');
  const [agentBotToken, setAgentBotToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [testFeedback, setTestFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const urlChanged = Boolean(
    editing && baseUrl.trim().replace(/\/+$/, '') !== editing.baseUrl.replace(/\/+$/, ''),
  );

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['chatwoot-connections', workspaceId] });
  };

  const test = useMutation({
    mutationFn: () =>
      commercialAgentsApi.testChatwoot(workspaceId, {
        connectionId: editing?.id ?? null,
        baseUrl: baseUrl.trim(),
        accountId: accountId.trim() ? Number(accountId) : null,
        apiAccessToken: apiAccessToken.trim() || null,
      }),
    onSuccess: (res) => {
      if (res.ok) {
        setDiscoveredAccounts(res.accounts);
        if (res.selectedAccountId) {
          setAccountId(String(res.selectedAccountId));
          const selected = res.accounts.find((acc) => acc.id === res.selectedAccountId);
          setTestFeedback({
            ok: true,
            text: `${t('Authenticated')} · ${selected?.name ?? `#${res.selectedAccountId}`} · ${tp(
              res.inboxes.length,
              '1 inbox',
              '{count} inboxes',
            )}`,
          });
        } else if (res.accounts.length > 1) {
          setTestFeedback({
            ok: true,
            text: t('Multiple accounts found. Select one before saving.'),
          });
        } else {
          setTestFeedback({ ok: true, text: t('Authenticated') });
        }
        toast.success(t('Connection test succeeded'));
      } else {
        setTestFeedback({ ok: false, text: res.error ?? t('Connection test failed') });
        toast.error(res.error ?? t('Connection test failed'));
      }
    },
    onError: (err: Error) => {
      setTestFeedback({ ok: false, text: err.message });
      toast.error(err.message);
    },
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name: name.trim() || 'Chatwoot',
        baseUrl: baseUrl.trim(),
        accountId: accountId.trim() ? Number(accountId) : null,
        apiAccessToken: apiAccessToken.trim() || null,
      };
      if (agentBotToken.trim()) payload.agentBotToken = agentBotToken.trim();
      if (webhookSecret.trim()) payload.webhookSecret = webhookSecret.trim();
      return editing
        ? commercialAgentsApi.updateChatwoot(workspaceId, editing.id, payload)
        : commercialAgentsApi.createChatwoot(workspaceId, payload);
    },
    onSuccess: () => {
      toast.success(t('Chatwoot connection verified and saved'));
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      setTestFeedback({ ok: false, text: err.message });
      toast.error(err.message);
    },
  });

  const refresh = useMutation({
    mutationFn: () => commercialAgentsApi.refreshChatwootInboxes(workspaceId, editing!.id),
    onSuccess: (updated) => {
      toast.success(t('Inboxes refreshed from Chatwoot'));
      setTestFeedback({
        ok: true,
        text: `${updated.accountName ?? updated.baseUrl} · ${tp(
          updated.inboxes.length,
          '1 inbox',
          '{count} inboxes',
        )}`,
      });
      invalidate();
    },
    onError: (err: Error) => {
      setTestFeedback({ ok: false, text: err.message });
      toast.error(err.message);
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: () => commercialAgentsApi.deleteChatwoot(workspaceId, editing!.id),
    onSuccess: () => {
      toast.success(t('Chatwoot connection deleted'));
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const needsToken = (!editing || urlChanged) && !apiAccessToken.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t('Manage Chatwoot') : t('Connect Chatwoot')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="cw-url">{t('Instance URL')}</FieldLabel>
            <Input
              id="cw-url"
              placeholder="https://chat.example.com"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="cw-token">{t('Admin API access token')}</FieldLabel>
            <Input
              id="cw-token"
              type="password"
              autoComplete="off"
              placeholder={
                editing?.hasApiAccessToken && !urlChanged
                  ? t('Leave blank to keep stored token')
                  : t('User access token from Chatwoot profile')
              }
              value={apiAccessToken}
              onChange={(event) => setApiAccessToken(event.target.value)}
            />
          </Field>

          {discoveredAccounts.length > 1 && (
            <Field>
              <FieldLabel htmlFor="cw-account-select">{t('Account')}</FieldLabel>
              <select
                id="cw-account-select"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              >
                <option value="">{t('Select an account')}</option>
                {discoveredAccounts.map((acc) => (
                  <option key={acc.id} value={String(acc.id)}>
                    {acc.name} (#{acc.id})
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="border-t pt-2">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowAdvanced((prev) => !prev)}
            >
              {showAdvanced ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
              {t('Advanced options & AgentBot setup')}
            </button>

            {showAdvanced && (
              <div className="mt-3 flex flex-col gap-3.5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="cw-name">{t('Connection name')}</FieldLabel>
                    <Input
                      id="cw-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cw-account">{t('Account ID (optional)')}</FieldLabel>
                    <Input
                      id="cw-account"
                      type="number"
                      min="1"
                      placeholder={t('Auto-detect')}
                      value={accountId}
                      onChange={(event) => setAccountId(event.target.value)}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="cw-bot-token">{t('AgentBot token (optional)')}</FieldLabel>
                    <Input
                      id="cw-bot-token"
                      type="password"
                      autoComplete="off"
                      placeholder={editing?.hasAgentBotToken ? t('Stored securely') : ''}
                      value={agentBotToken}
                      onChange={(event) => setAgentBotToken(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cw-secret">{t('Webhook secret (optional)')}</FieldLabel>
                    <Input
                      id="cw-secret"
                      type="password"
                      autoComplete="off"
                      placeholder={editing?.hasWebhookSecret ? t('Stored securely') : ''}
                      value={webhookSecret}
                      onChange={(event) => setWebhookSecret(event.target.value)}
                    />
                  </Field>
                </div>

                {editing && (
                  <Field>
                    <FieldLabel>{t('Webhook URL')}</FieldLabel>
                    <CopyableValue
                      value={editing.webhookUrl}
                      copyLabel={t('Copy')}
                      copiedMessage={t('Copied')}
                    />
                  </Field>
                )}
              </div>
            )}
          </div>

          {testFeedback && (
            <p
              className={
                testFeedback.ok ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'
              }
            >
              {testFeedback.text}
            </p>
          )}
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={test.isPending || !baseUrl.trim() || needsToken}
              onClick={() => test.mutate()}
            >
              {t('Test connection')}
            </Button>
            {editing && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={refresh.isPending}
                  onClick={() => refresh.mutate()}
                >
                  <RefreshCw className="size-3.5" />
                  {t('Refresh inboxes')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={save.isPending || !baseUrl.trim() || needsToken}
            onClick={() => save.mutate()}
          >
            {t('Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Communication connector card for Chatwoot, matching native Crossmart store cards. */
export function ChatwootConnectorSection({
  workspaceId,
  canManage,
}: {
  workspaceId: string;
  canManage: boolean;
}) {
  const { t, tp } = useI18n();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChatwootConnectionView | null>(null);

  const { data: connections = [] } = useQuery({
    queryKey: ['chatwoot-connections', workspaceId],
    queryFn: () => commercialAgentsApi.listChatwoot(workspaceId),
  });

  const primary = connections[0] ?? null;
  const status = mapChatwootStatus(primary?.status);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <ChannelLogo logo={CHATWOOT_LOGO} />
              {status === 'DISABLED' ? (
                <Badge variant="outline">{t('Disabled')}</Badge>
              ) : status ? (
                <ConnectionStatusBadge status={status} />
              ) : (
                <Badge variant="outline">{t('Available')}</Badge>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="font-medium">Chatwoot</h2>
              <p className="text-sm text-muted-foreground">
                {t('Customer conversations and channels managed through Chatwoot.')}
              </p>
            </div>

            {primary && primary.status === 'CONNECTED' && (
              <p className="text-sm text-muted-foreground">
                {primary.accountName ?? primary.baseUrl} ·{' '}
                {tp(primary.inboxes.length, '1 inbox', '{count} inboxes')}
              </p>
            )}

            {primary && primary.status === 'CONNECTED' && !primary.operationalReady && (
              <p className="flex items-center gap-1.5 text-sm text-warning">
                <CircleDashed className="size-4 shrink-0" aria-hidden="true" />
                <span>{t('AgentBot and webhook auth pending for live replies.')}</span>
              </p>
            )}

            {primary && primary.status === 'ERROR' && primary.lastError && (
              <p className="text-sm text-destructive">{primary.lastError}</p>
            )}
          </CardContent>
          <CardFooter className="mt-auto">
            {canManage ? (
              <Button
                type="button"
                variant={primary ? 'outline' : 'default'}
                size="sm"
                onClick={() => {
                  setEditing(primary);
                  setOpen(true);
                }}
              >
                {primary ? (
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
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('Ask a workspace admin to connect it.')}
              </p>
            )}
          </CardFooter>
        </Card>
      </div>

      {open && (
        <ChatwootDialog
          key={editing?.id ?? 'new'}
          workspaceId={workspaceId}
          editing={editing}
          open
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setEditing(null);
          }}
        />
      )}
    </>
  );
}
