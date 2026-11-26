import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, RefreshCw, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { useI18n } from '@/lib/i18n';
import { type ChatwootConnectionView, commercialAgentsApi } from './api';

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
  const [name, setName] = useState(editing?.name ?? 'Chatwoot');
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl ?? '');
  const [accountId, setAccountId] = useState(editing?.accountId ? String(editing.accountId) : '');
  const [apiAccessToken, setApiAccessToken] = useState('');
  const [agentBotToken, setAgentBotToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [testNote, setTestNote] = useState<string | null>(null);

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
        if (res.selectedAccountId && !accountId.trim()) setAccountId(String(res.selectedAccountId));
        setTestNote(
          `${t('Connected')} · ${tp(res.inboxes.length, '1 inbox found', '{count} inboxes found')}`,
        );
        toast.success(t('Connection test succeeded'));
      } else {
        setTestNote(res.error ?? t('Connection test failed'));
        toast.error(res.error ?? t('Connection test failed'));
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim() || 'Chatwoot',
        baseUrl: baseUrl.trim(),
        accountId: accountId.trim() ? Number(accountId) : null,
        apiAccessToken: apiAccessToken.trim() || null,
        agentBotToken: agentBotToken.trim() || undefined,
        webhookSecret: webhookSecret.trim() || undefined,
      };
      return editing
        ? commercialAgentsApi.updateChatwoot(workspaceId, editing.id, payload)
        : commercialAgentsApi.createChatwoot(workspaceId, payload);
    },
    onSuccess: () => {
      toast.success(t('Chatwoot connection saved'));
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const refresh = useMutation({
    mutationFn: () => commercialAgentsApi.refreshChatwootInboxes(workspaceId, editing!.id),
    onSuccess: () => {
      toast.success(t('Inboxes refreshed from Chatwoot'));
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t('Edit Chatwoot') : t('Connect Chatwoot')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <Field>
            <FieldLabel htmlFor="cw-name">{t('Connection name')}</FieldLabel>
            <Input id="cw-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="cw-url">{t('Instance URL')}</FieldLabel>
            <Input
              id="cw-url"
              placeholder="https://chatwoot.example.com"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="cw-token">{t('Admin API access token')}</FieldLabel>
              <Input
                id="cw-token"
                type="password"
                autoComplete="off"
                placeholder={editing?.hasApiAccessToken ? t('Stored securely') : ''}
                value={apiAccessToken}
                onChange={(event) => setApiAccessToken(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cw-account">{t('Account ID (optional)')}</FieldLabel>
              <Input
                id="cw-account"
                type="number"
                min="1"
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
          {testNote && <p className="text-xs text-muted-foreground">{testNote}</p>}
        </div>
        <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={test.isPending || !baseUrl.trim()}
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
            disabled={save.isPending || !baseUrl.trim()}
            onClick={() => save.mutate()}
          >
            {t('Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Communication connector card for Chatwoot (manages WhatsApp, Messenger, Instagram, Web, etc. via Chatwoot). */
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
  const connected = primary?.status === 'CONNECTED';

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                  <MessageSquare className="size-5 text-foreground" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Chatwoot</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('Customer conversations and channels managed through Chatwoot.')}
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  connected ? 'secondary' : primary?.status === 'ERROR' ? 'destructive' : 'outline'
                }
              >
                {connected
                  ? t('Connected')
                  : primary?.status === 'ERROR'
                    ? t('Error')
                    : t('Available')}
              </Badge>
            </div>
            {primary && (
              <p className="text-sm text-muted-foreground">
                {primary.accountName ?? primary.baseUrl} ·{' '}
                {tp(primary.inboxes.length, '1 inbox', '{count} inboxes')}
              </p>
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
