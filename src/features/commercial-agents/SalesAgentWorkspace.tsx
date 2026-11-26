import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OctagonX, Plus, Send, Trash2, UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { type AgentConfigView, commercialAgentsApi, type SalesAgentMode } from './api';

const MODE_LABELS: Record<SalesAgentMode, string> = {
  DISABLED: 'Disabled',
  SUPERVISED: 'Supervised',
  AUTOMATIC: 'Automatic',
};

/**
 * Isolated Sales Agent workspace: buyer conversation simulator against real catalog/stock/prices
 * plus real attention mode indicator and immediate stop button. Does NOT duplicate Chatwoot's inbox
 * or impose Crossmart Agent's operational map.
 */
export function SalesAgentWorkspace({
  workspaceId,
  config,
}: {
  workspaceId: string;
  config: AgentConfigView;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const { data: conversations = [] } = useQuery({
    queryKey: ['sales-conversations', workspaceId],
    queryFn: () => commercialAgentsApi.listSalesConversations(workspaceId),
  });

  const selectedId = activeId ?? conversations[0]?.id ?? null;

  const { data: detail } = useQuery({
    queryKey: ['sales-conversation', workspaceId, selectedId],
    queryFn: () => commercialAgentsApi.getSalesConversation(workspaceId, selectedId!),
    enabled: Boolean(selectedId),
  });

  const createConv = useMutation({
    mutationFn: () => commercialAgentsApi.createSalesConversation(workspaceId),
    onSuccess: (created) => {
      setActiveId(created.id);
      void qc.invalidateQueries({ queryKey: ['sales-conversations', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteConv = useMutation({
    mutationFn: (id: string) => commercialAgentsApi.deleteSalesConversation(workspaceId, id),
    onSuccess: (_, id) => {
      if (selectedId === id) setActiveId(null);
      void qc.invalidateQueries({ queryKey: ['sales-conversations', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendMsg = useMutation({
    mutationFn: async (text: string) => {
      let targetId = selectedId;
      if (!targetId) {
        const created = await commercialAgentsApi.createSalesConversation(workspaceId);
        targetId = created.id;
        setActiveId(targetId);
      }
      return commercialAgentsApi.sendSimulatedBuyerMessage(workspaceId, targetId, text);
    },
    onSuccess: (updated) => {
      setDraft('');
      qc.setQueryData(['sales-conversation', workspaceId, updated.id], updated);
      void qc.invalidateQueries({ queryKey: ['sales-conversations', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stopAuto = useMutation({
    mutationFn: () => commercialAgentsApi.stopSalesAgent(workspaceId),
    onSuccess: () => {
      toast.success(t('Automatic sales responses stopped'));
      void qc.invalidateQueries({ queryKey: ['internal-agent-configs', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sendMsg.isPending) return;
    sendMsg.mutate(trimmed);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">{t('Attention mode')}:</span>
          <Badge variant={config.salesMode === 'AUTOMATIC' ? 'default' : 'secondary'}>
            {t(MODE_LABELS[config.salesMode])}
          </Badge>
          {config.model && <span className="text-xs text-muted-foreground">· {config.model}</span>}
        </div>
        {config.salesMode === 'AUTOMATIC' && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={stopAuto.isPending}
            onClick={() => stopAuto.mutate()}
          >
            <OctagonX className="size-3.5" />
            {t('Stop automatic responses')}
          </Button>
        )}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[260px_1fr]">
        <Card className="flex min-h-0 flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('Simulated conversations')}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={createConv.isPending}
              onClick={() => createConv.mutate()}
            >
              <Plus className="size-3.5" />
              {t('New')}
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t(
                  'Start a simulated buyer chat to test catalog answers before enabling Chatwoot.',
                )}
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center justify-between gap-1 rounded-md px-2 py-1.5 text-sm ${
                    conv.id === selectedId ? 'bg-muted font-medium' : 'hover:bg-muted/50'
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => setActiveId(conv.id)}
                  >
                    {conv.title}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-6 p-0 text-muted-foreground"
                    onClick={() => deleteConv.mutate(conv.id)}
                    aria-label={t('Delete')}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col p-3">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-3">
            {!detail || detail.messages.length === 0 ? (
              <div className="my-auto text-center text-sm text-muted-foreground">
                {t(
                  'Write a buyer question below to test real prices, stock, and commercial answers.',
                )}
              </div>
            ) : (
              detail.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1 ${
                    msg.role === 'buyer' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'buyer'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {detail?.handoffRequested && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <UserRoundCheck className="size-4 shrink-0" />
                <span>
                  {t('Human handoff requested')}: {detail.handoffReason}
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t pt-3">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('Ask as a buyer (e.g. price, availability, recommendations)...')}
              disabled={sendMsg.isPending}
            />
            <Button type="submit" size="sm" disabled={sendMsg.isPending || !draft.trim()}>
              <Send className="size-3.5" />
              {t('Send')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
