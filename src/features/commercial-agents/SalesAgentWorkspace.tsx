import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Send,
  SlidersHorizontal,
  Trash2,
  UserRoundCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CONSOLE_COLUMNS_MEDIA_QUERY } from '@/features/agent-console/agent-console.constants';
import {
  EventsRail,
  HideEventsButton,
} from '@/features/agent-console/components/EventsColumnToggle';
import { useEventsColumn } from '@/features/agent-console/hooks/useEventsColumn';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type AgentConfigView, commercialAgentsApi, type SalesChannelContext } from './api';
import { SafeMarkdown } from './SafeMarkdown';
import { SalesEventsPanel } from './SalesEventsPanel';
import { SalesOperationalMap } from './SalesOperationalMap';

type ChatMode = 'supervisor' | 'simulator';

const COLUMN_CLASS = 'min-h-0 overflow-hidden rounded-xl border bg-background';

const CHANNEL_OPTIONS = [
  { value: 'Channel::WebWidget', label: 'Web Widget' },
  { value: 'Channel::Whatsapp', label: 'WhatsApp' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'Channel::FacebookPage', label: 'Messenger' },
  { value: 'Channel::Instagram', label: 'Instagram' },
];

/**
 * Unified 3-column Sales Agent workspace reusing Crossmart Agent's exact layout, visual tokens,
 * collapsible Events rail, and responsive narrow-screen tabs:
 * - Left: Supervisor (default) & Simulation (buyer lab with channel/product context + correction)
 * - Center: Verified Operational Map + real sales indicators + Knowledge & Proposal review
 * - Right: Real Commercial Events with expandable details & conversation traceability
 */
export function SalesAgentWorkspace({
  workspaceId,
}: {
  workspaceId: string;
  config: AgentConfigView;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const wide = useMediaQuery(CONSOLE_COLUMNS_MEDIA_QUERY);
  const eventsCol = useEventsColumn();

  const [chatMode, setChatMode] = useState<ChatMode>('supervisor');
  const [activeIds, setActiveIds] = useState<Record<ChatMode, string | null>>({
    supervisor: null,
    simulator: null,
  });
  const [inspectedChatwootId, setInspectedChatwootId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  // Optional simulated channel/product context for Simulation lab
  const [showSimContext, setShowSimContext] = useState(false);
  const [simChannel, setSimChannel] = useState('Channel::WebWidget');
  const [simListingId, setSimListingId] = useState('');
  const [simSku, setSimSku] = useState('');
  const [simProductRef, setSimProductRef] = useState('');

  // Inline correction -> supervised learning proposal
  const [correctingMsgId, setCorrectingMsgId] = useState<string | null>(null);
  const [correctionTitle, setCorrectionTitle] = useState('');
  const [correctionText, setCorrectionText] = useState('');

  const { data: overview } = useQuery({
    queryKey: ['sales-overview', workspaceId],
    queryFn: () => commercialAgentsApi.getSalesOverview(workspaceId),
    refetchInterval: 10_000,
  });

  const { data: knowledge = [] } = useQuery({
    queryKey: ['sales-knowledge', workspaceId],
    queryFn: () => commercialAgentsApi.listSalesKnowledge(workspaceId),
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['sales-proposals', workspaceId],
    queryFn: () => commercialAgentsApi.listLearningProposals(workspaceId),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['sales-conversations', workspaceId, chatMode],
    queryFn: () => commercialAgentsApi.listSalesConversations(workspaceId, chatMode),
  });

  const selectedId = inspectedChatwootId ?? activeIds[chatMode] ?? conversations[0]?.id ?? null;

  const { data: detail } = useQuery({
    queryKey: ['sales-conversation', workspaceId, selectedId],
    queryFn: () => commercialAgentsApi.getSalesConversation(workspaceId, selectedId!),
    enabled: Boolean(selectedId),
  });

  const isReadOnlyTrace = detail?.source === 'chatwoot';

  const buildSimContext = (): SalesChannelContext | undefined => {
    if (chatMode !== 'simulator') return undefined;
    const ctx: SalesChannelContext = { channelType: simChannel };
    if (simListingId.trim()) ctx.listingId = simListingId.trim();
    if (simSku.trim()) ctx.sku = simSku.trim();
    if (simProductRef.trim()) ctx.productRef = simProductRef.trim();
    return ctx;
  };

  const invalidateAfterTurn = () => {
    void qc.invalidateQueries({ queryKey: ['sales-conversations', workspaceId, chatMode] });
    void qc.invalidateQueries({ queryKey: ['sales-overview', workspaceId] });
    void qc.invalidateQueries({ queryKey: ['sales-proposals', workspaceId] });
    void qc.invalidateQueries({ queryKey: ['sales-knowledge', workspaceId] });
  };

  const createConv = useMutation({
    mutationFn: () =>
      commercialAgentsApi.createSalesConversation(workspaceId, {
        source: chatMode,
        context: buildSimContext(),
      }),
    onSuccess: (created) => {
      setInspectedChatwootId(null);
      setActiveIds((prev) => ({ ...prev, [chatMode]: created.id }));
      void qc.invalidateQueries({ queryKey: ['sales-conversations', workspaceId, chatMode] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteConv = useMutation({
    mutationFn: (id: string) => commercialAgentsApi.deleteSalesConversation(workspaceId, id),
    onSuccess: (_, id) => {
      if (activeIds[chatMode] === id) {
        setActiveIds((prev) => ({ ...prev, [chatMode]: null }));
      }
      void qc.invalidateQueries({ queryKey: ['sales-conversations', workspaceId, chatMode] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendMsg = useMutation({
    mutationFn: async (text: string) => {
      let targetId = activeIds[chatMode] ?? conversations[0]?.id ?? null;
      const ctx = buildSimContext();
      if (!targetId) {
        const created = await commercialAgentsApi.createSalesConversation(workspaceId, {
          source: chatMode,
          context: ctx,
        });
        targetId = created.id;
        setActiveIds((prev) => ({ ...prev, [chatMode]: created.id }));
      }
      return commercialAgentsApi.sendSalesMessage(workspaceId, targetId, text, ctx);
    },
    onSuccess: (updated) => {
      setDraft('');
      setInspectedChatwootId(null);
      qc.setQueryData(['sales-conversation', workspaceId, updated.id], updated);
      invalidateAfterTurn();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const proposeCorrection = useMutation({
    mutationFn: (msgId: string) =>
      commercialAgentsApi.createLearningProposal(workspaceId, {
        category: 'channel_policies',
        scope: chatMode === 'simulator' ? simChannel : 'global',
        title: correctionTitle.trim() || t('Commercial response correction'),
        proposedContent: correctionText.trim(),
        originType: 'simulation_feedback',
        originConversationId: detail?.id,
        originMessageId: msgId,
      }),
    onSuccess: () => {
      toast.success(t('Learning proposal created for review'));
      setCorrectingMsgId(null);
      setCorrectionTitle('');
      setCorrectionText('');
      invalidateAfterTurn();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stopAuto = useMutation({
    mutationFn: () => commercialAgentsApi.stopSalesAgent(workspaceId),
    onSuccess: () => {
      toast.success(t('Automatic sales responses stopped'));
      void qc.invalidateQueries({ queryKey: ['internal-agent-configs', workspaceId] });
      void qc.invalidateQueries({ queryKey: ['sales-overview', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sendMsg.isPending || isReadOnlyTrace) return;
    sendMsg.mutate(trimmed);
  }

  function handleOpenEventConversation(conversationId: string) {
    setInspectedChatwootId(conversationId);
  }

  const chatPanel = (
    <section aria-label={t('Sales Agent conversation')} className="flex h-full min-h-0 flex-col">
      {/* Mode switcher: Supervisor (default) vs Simulation */}
      <header className="flex flex-col gap-2 border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => {
                setInspectedChatwootId(null);
                setChatMode('supervisor');
              }}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                chatMode === 'supervisor' && !inspectedChatwootId
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t('Supervisor')}
            </button>
            <button
              type="button"
              onClick={() => {
                setInspectedChatwootId(null);
                setChatMode('simulator');
              }}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                chatMode === 'simulator' && !inspectedChatwootId
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t('Simulation')}
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={createConv.isPending}
            onClick={() => createConv.mutate()}
          >
            <Plus className="size-3.5" />
            {t('New')}
          </Button>
        </div>

        {/* Conversation switcher for active mode */}
        {isReadOnlyTrace ? (
          <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1 text-xs">
            <span className="truncate font-medium">
              {t('Real conversation')}: {detail.title}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[11px]"
              onClick={() => setInspectedChatwootId(null)}
            >
              {t('Back')}
            </Button>
          </div>
        ) : (
          conversations.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                aria-label={t('Conversation')}
                className="h-7 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-xs"
                value={selectedId ?? ''}
                onChange={(event) =>
                  setActiveIds((prev) => ({ ...prev, [chatMode]: event.target.value }))
                }
              >
                {conversations.map((conv) => (
                  <option key={conv.id} value={conv.id}>
                    {conv.title}
                  </option>
                ))}
              </select>
              {selectedId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-7 shrink-0 p-0 text-muted-foreground"
                  onClick={() => deleteConv.mutate(selectedId)}
                  aria-label={t('Delete')}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          )
        )}

        {/* Simulated channel / listing / product context (Simulation mode only) */}
        {chatMode === 'simulator' && !isReadOnlyTrace && (
          <div className="pt-0.5">
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowSimContext((prev) => !prev)}
            >
              {showSimContext ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              <SlidersHorizontal className="size-3" />
              {t('Simulated channel context')}
            </button>
            {showSimContext && (
              <div className="mt-2 grid gap-1.5 rounded-md border bg-muted/20 p-2 text-xs">
                <select
                  aria-label={t('Channel')}
                  className="h-7 rounded border border-input bg-background px-2 text-xs"
                  value={simChannel}
                  onChange={(event) => setSimChannel(event.target.value)}
                >
                  {CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    className="h-7 text-xs"
                    placeholder={t('SKU (optional)')}
                    value={simSku}
                    onChange={(event) => setSimSku(event.target.value)}
                  />
                  <Input
                    className="h-7 text-xs"
                    placeholder={t('Listing ID (optional)')}
                    value={simListingId}
                    onChange={(event) => setSimListingId(event.target.value)}
                  />
                </div>
                <Input
                  className="h-7 text-xs"
                  placeholder={t('Product reference (optional)')}
                  value={simProductRef}
                  onChange={(event) => setSimProductRef(event.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </header>

      {/* Message transcript with SafeMarkdown */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {!detail || detail.messages.length === 0 ? (
          <div className="my-auto flex flex-col gap-2 px-2 text-center text-xs text-muted-foreground">
            {chatMode === 'supervisor' ? (
              <>
                <p className="font-medium text-foreground">{t('Supervisor mode')}</p>
                <p>
                  {t(
                    'Ask about sales activity, review responses, or teach commercial policies naturally to propose structured knowledge.',
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">{t('Simulation lab')}</p>
                <p>
                  {t(
                    'Test real catalog prices, stock, and approved policies as a buyer without sending external messages.',
                  )}
                </p>
              </>
            )}
          </div>
        ) : (
          detail.messages.map((msg) => {
            const isOutgoing = msg.role === 'buyer' || msg.role === 'supervisor';
            const isCorrecting = correctingMsgId === msg.id;
            return (
              <div
                key={msg.id}
                className={cn('flex flex-col gap-1', isOutgoing ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[90%] rounded-2xl px-3 py-2 text-sm',
                    isOutgoing
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm bg-muted text-foreground',
                  )}
                >
                  {isOutgoing ? (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                  ) : (
                    <SafeMarkdown text={msg.text} />
                  )}
                </div>

                {!isOutgoing && chatMode === 'simulator' && !isReadOnlyTrace && (
                  <div className="flex items-center gap-1">
                    {!isCorrecting ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setCorrectingMsgId(msg.id);
                          setCorrectionTitle('');
                          setCorrectionText('');
                        }}
                      >
                        <BookOpen className="size-3" />
                        {t('Propose correction')}
                      </button>
                    ) : (
                      <div className="mt-1 flex w-full flex-col gap-1.5 rounded-md border bg-card p-2 text-xs">
                        <Input
                          className="h-7 text-xs"
                          placeholder={t('Rule title')}
                          value={correctionTitle}
                          onChange={(event) => setCorrectionTitle(event.target.value)}
                        />
                        <Input
                          className="h-7 text-xs"
                          placeholder={t('How should the agent respond instead?')}
                          value={correctionText}
                          onChange={(event) => setCorrectionText(event.target.value)}
                        />
                        <div className="flex gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            className="h-6 px-2 text-[11px]"
                            disabled={!correctionText.trim() || proposeCorrection.isPending}
                            onClick={() => proposeCorrection.mutate(msg.id)}
                          >
                            {t('Propose')}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => setCorrectingMsgId(null)}
                          >
                            {t('Cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {detail?.handoffRequested && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
            <UserRoundCheck className="size-4 shrink-0" />
            <span>
              {t('Human handoff requested')}: {detail.handoffReason}
            </span>
          </div>
        )}
      </div>

      {/* Composer */}
      {!isReadOnlyTrace && (
        <form onSubmit={handleSubmit} className="flex gap-2 border-t p-2.5">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              chatMode === 'supervisor'
                ? t('Ask the Sales Agent or teach a store policy...')
                : t('Ask as a buyer (e.g. price, availability, recommendations)...')
            }
            disabled={sendMsg.isPending}
          />
          <Button type="submit" size="sm" disabled={sendMsg.isPending || !draft.trim()}>
            <Send className="size-3.5" />
            <span className="sr-only">{t('Send')}</span>
          </Button>
        </form>
      )}
    </section>
  );

  const mapPanel = (
    <SalesOperationalMap
      workspaceId={workspaceId}
      overview={overview}
      knowledge={knowledge}
      proposals={proposals}
      activeSimulation={sendMsg.isPending && chatMode === 'simulator'}
      onStopAuto={() => stopAuto.mutate()}
      stoppingAuto={stopAuto.isPending}
    />
  );

  const eventsList = overview?.events ?? [];
  const hideAction = <HideEventsButton onHide={() => eventsCol.setCollapsed(true)} />;

  const eventsPanel = (
    <SalesEventsPanel
      events={eventsList}
      onSelectConversation={handleOpenEventConversation}
      headerAction={wide ? hideAction : undefined}
    />
  );

  if (!wide) {
    return (
      <Tabs defaultValue="chat" className="flex h-full min-h-0 flex-col gap-2">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">{t('Chat')}</TabsTrigger>
          <TabsTrigger value="map">{t('Map')}</TabsTrigger>
          <TabsTrigger value="events">
            {t('Events')}
            {eventsList.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {eventsList.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className={cn(COLUMN_CLASS, 'flex-1')}>
          {chatPanel}
        </TabsContent>
        <TabsContent value="map" className={cn(COLUMN_CLASS, 'flex-1')}>
          {mapPanel}
        </TabsContent>
        <TabsContent value="events" className={cn(COLUMN_CLASS, 'flex-1')}>
          {eventsPanel}
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <div
      className={cn(
        'grid h-full min-h-0 gap-3',
        eventsCol.collapsed
          ? 'grid-cols-[20rem_minmax(0,1fr)_auto] 2xl:grid-cols-[24rem_minmax(0,1fr)_auto]'
          : 'grid-cols-[20rem_minmax(0,1fr)_18rem] 2xl:grid-cols-[24rem_minmax(0,1fr)_22rem]',
      )}
    >
      <div className={COLUMN_CLASS}>{chatPanel}</div>
      <div className={COLUMN_CLASS}>{mapPanel}</div>
      {eventsCol.collapsed ? (
        <EventsRail unseen={0} onShow={() => eventsCol.setCollapsed(false)} />
      ) : (
        <div className={COLUMN_CLASS}>{eventsPanel}</div>
      )}
    </div>
  );
}
