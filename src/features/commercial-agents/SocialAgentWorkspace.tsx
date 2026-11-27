import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Film, Image as ImageIcon, Pause, Play, Plus, X } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CONSOLE_COLUMNS_MEDIA_QUERY } from '@/features/agent-console/agent-console.constants';
import {
  EventsRail,
  HideEventsButton,
} from '@/features/agent-console/components/EventsColumnToggle';
import { useEventsColumn } from '@/features/agent-console/hooks/useEventsColumn';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { SafeMarkdown } from './SafeMarkdown';
import {
  SharedLiveActivity,
  SharedSupervisorComposer,
  SharedToolRunList,
} from './SharedAgentActivity';
import { socialMarketingApi } from './social-api';
import { SocialEventsPanel } from './SocialEventsPanel';
import { SocialOperationalMap } from './SocialOperationalMap';
import { type AgentToolRunView, useAgentStream } from './useAgentStream';

type SocialCenterView = 'operations' | 'production' | 'trypost' | 'results';

interface SocialChatMessage {
  role: 'user' | 'assistant';
  text: string;
  toolRuns?: AgentToolRunView[];
  status?: 'completed' | 'failed' | 'cancelled' | 'awaiting_approval';
}

const COLUMN_CLASS = 'min-h-0 overflow-hidden rounded-xl border bg-background';
const MAX_SAVED_MESSAGES = 30;
const MAX_HISTORY_TURNS = 12;

function loadSavedChat(workspaceId: string): SocialChatMessage[] {
  try {
    const raw = window.localStorage.getItem(`crossmart.social.chat.${workspaceId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? (parsed as SocialChatMessage[]).slice(-MAX_SAVED_MESSAGES)
      : [];
  } catch {
    return [];
  }
}

/**
 * Unified 3-column Social Agent workspace reusing Crossmart Agent and Sales Agent's exact layout,
 * visual tokens, collapsible Events rail, native ChannelMapCanvas, and responsive narrow-screen tabs:
 * - Left: Supervisor natural-language strategy & creative direction chat
 * - Center: Operations (native React Flow map + list), Production, TryPost, and Results
 * - Right: Real operational events panel with Live indicator and filter pills
 */
export function SocialAgentWorkspace({ workspaceId }: { workspaceId: string }) {
  const { t, formatNumber, locale } = useI18n();
  const qc = useQueryClient();
  const wide = useMediaQuery(CONSOLE_COLUMNS_MEDIA_QUERY);
  const eventsCol = useEventsColumn();
  const stream = useAgentStream();

  const [centerTab, setCenterTab] = useState<SocialCenterView>('operations');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<SocialChatMessage[]>(() =>
    loadSavedChat(workspaceId),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `crossmart.social.chat.${workspaceId}`,
        JSON.stringify(chatMessages.slice(-MAX_SAVED_MESSAGES)),
      );
    } catch {
      // Ignore storage quota errors.
    }
  }, [chatMessages, workspaceId]);

  // Production creation form state
  const [newTitle, setNewTitle] = useState('');
  const [newKind, setNewKind] = useState<'IDEA' | 'POST' | 'CAROUSEL' | 'VIDEO_SCRIPT'>('POST');
  const [newCaption, setNewCaption] = useState('');
  const [svgHeadline, setSvgHeadline] = useState('');
  const [svgRatio, setSvgRatio] = useState<'1:1' | '4:5' | '9:16' | '16:9'>('4:5');
  const [svgPreview, setSvgPreview] = useState<string | null>(null);

  // Creative profile state
  const [profileName, setProfileName] = useState('');
  const [profileInstructions, setProfileInstructions] = useState('');

  const { data: overview } = useQuery({
    queryKey: ['social-overview', workspaceId],
    queryFn: () => socialMarketingApi.getOverview(workspaceId),
    refetchInterval: 20_000,
  });

  const sendSupervisorPrompt = async (rawMessage: string) => {
    const trimmed = rawMessage.trim();
    if (!trimmed || stream.state.isBusy) return;
    const history = chatMessages
      .slice(-MAX_HISTORY_TURNS)
      .map((msg) => ({ role: msg.role, text: msg.text }));
    setChatMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setChatInput('');

    await stream.startStream({
      path: `/api/v1/workspaces/${workspaceId}/social-agent/supervisor/stream`,
      body: { message: trimmed, history, locale },
      cancelPathForTurn: (turnId) =>
        `/api/v1/workspaces/${workspaceId}/social-agent/supervisor/cancel/${turnId}`,
      onFinished: (payload) => {
        if (payload.text || payload.toolRuns.length > 0 || payload.status === 'cancelled') {
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text:
                payload.text ||
                (payload.status === 'cancelled'
                  ? t('Execution cancelled.')
                  : payload.error || t('No response received.')),
              toolRuns: payload.toolRuns,
              status: payload.status,
            },
          ]);
        }
        void qc.invalidateQueries({ queryKey: ['social-overview', workspaceId] });
      },
      onError: (message) => toast.error(message),
    });
  };

  const createItemMutation = useMutation({
    mutationFn: () =>
      socialMarketingApi.createItem(workspaceId, {
        kind: newKind,
        title: newTitle.trim(),
        caption: newCaption.trim(),
        productionMode: newKind === 'VIDEO_SCRIPT' ? 'AUDIOVISUAL' : 'ASSISTED',
      }),
    onSuccess: () => {
      setNewTitle('');
      setNewCaption('');
      toast.success(t('Content piece created'));
      void qc.invalidateQueries({ queryKey: ['social-overview', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveMutation = useMutation({
    mutationFn: (itemId: string) => socialMarketingApi.approveItem(workspaceId, itemId),
    onSuccess: () => {
      toast.success(t('Content approved'));
      void qc.invalidateQueries({ queryKey: ['social-overview', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (itemId: string) => socialMarketingApi.rejectItem(workspaceId, itemId),
    onSuccess: () => {
      toast.info(t('Content rejected'));
      void qc.invalidateQueries({ queryKey: ['social-overview', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const composeMutation = useMutation({
    mutationFn: () =>
      socialMarketingApi.composeSvg(workspaceId, {
        headline: svgHeadline.trim(),
        aspectRatio: svgRatio,
      }),
    onSuccess: (res) => setSvgPreview(res.svg),
    onError: (err: Error) => toast.error(err.message),
  });

  const createProfileMutation = useMutation({
    mutationFn: () =>
      socialMarketingApi.createProfile(workspaceId, {
        name: profileName.trim(),
        instructions: profileInstructions.trim(),
      }),
    onSuccess: () => {
      setProfileName('');
      setProfileInstructions('');
      toast.success(t('Creative profile saved'));
      void qc.invalidateQueries({ queryKey: ['social-overview', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const policyMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      socialMarketingApi.updatePolicy(workspaceId, patch),
    onSuccess: () => {
      toast.success(t('Social Agent policy updated'));
      void qc.invalidateQueries({ queryKey: ['social-overview', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Left Column: Shared Supervisor Panel ── */
  const supervisorPanel = (
    <section aria-label={t('Supervisor')} className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex flex-col gap-2 border-b px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{t('Supervisor')}</h2>
            <Badge variant="outline" className="text-[10px]">
              {overview?.policy.paused
                ? t('Paused')
                : t(
                    overview?.policy.autonomyMode === 'AUTOMATIC'
                      ? 'Automatic'
                      : overview?.policy.autonomyMode === 'MANUAL'
                        ? 'Manual'
                        : 'Supervised',
                  )}
            </Badge>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={chatMessages.length === 0 || stream.state.isBusy}
            onClick={() => {
              setChatMessages([]);
              stream.reset();
            }}
          >
            <Plus className="size-3.5" />
            {t('New')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(
            'Request strategies, ideas, visual compositions, or audiovisual scripts in natural language.',
          )}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {chatMessages.length === 0 && !stream.state.isBusy ? (
          <div className="my-auto flex flex-col gap-2.5 px-2 text-center text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{t('Supervisor mode')}</p>
            <p>
              {t(
                'Ask me to analyze your catalog, propose an editorial plan, or design a content piece.',
              )}
            </p>
            <div className="flex flex-col gap-1.5 pt-1">
              {[
                t('Analyze catalog opportunities'),
                t('Propose a weekly content strategy'),
                t('Create an educational video script'),
              ].map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto whitespace-normal py-1.5 text-left text-xs"
                  disabled={stream.state.isBusy}
                  onClick={() => void sendSupervisorPrompt(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {chatMessages.map((msg, idx) => {
              const isOutgoing = msg.role === 'user';
              return (
                <div
                  key={idx}
                  className={cn('flex flex-col gap-1.5', isOutgoing ? 'items-end' : 'items-start')}
                >
                  {!isOutgoing && msg.toolRuns && msg.toolRuns.length > 0 && (
                    <SharedToolRunList toolRuns={msg.toolRuns} />
                  )}
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
                </div>
              );
            })}
            <SharedLiveActivity stream={stream.state} />
          </>
        )}
      </div>

      <SharedSupervisorComposer
        value={chatInput}
        onChange={setChatInput}
        onSubmit={() => void sendSupervisorPrompt(chatInput)}
        onStop={() => void stream.cancel()}
        isBusy={stream.state.isBusy}
        isCancelling={stream.state.isCancelling}
        placeholder={t('Write to Social Agent...')}
      />
    </section>
  );

  /* ── Center Column: Operations (native React Flow map), Production, TryPost, Results ── */
  const centerPanel = (
    <Tabs
      value={centerTab}
      onValueChange={(value) => setCenterTab(value as SocialCenterView)}
      className="flex h-full min-h-0 flex-col gap-0"
    >
      <div className="flex items-center justify-between border-b px-3 pt-1.5">
        <TabsList variant="line" className="h-9 justify-start">
          <TabsTrigger value="operations" className="text-xs">
            {t('Operations')}
          </TabsTrigger>
          <TabsTrigger value="production" className="text-xs">
            {t('Production')}
          </TabsTrigger>
          <TabsTrigger value="trypost" className="text-xs">
            TryPost
          </TabsTrigger>
          <TabsTrigger value="results" className="text-xs">
            {t('Results')}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="operations" className="mt-0 flex min-h-0 flex-1 flex-col">
        <SocialOperationalMap
          overview={overview}
          onTogglePause={() => policyMutation.mutate({ paused: !overview?.policy.paused })}
          togglingPause={policyMutation.isPending}
          onNavigateTab={setCenterTab}
        />
      </TabsContent>

      <TabsContent
        value="production"
        className="mt-0 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 text-xs"
      >
        <div className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="font-semibold">{t('New editorial piece / script')}</p>
            <Input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder={t('Title or concept')}
              className="h-8 text-xs"
            />
            <Select value={newKind} onValueChange={(value) => setNewKind(value as typeof newKind)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IDEA">{t('Editorial idea')}</SelectItem>
                <SelectItem value="POST">{t('Social post')}</SelectItem>
                <SelectItem value="CAROUSEL">{t('Carousel')}</SelectItem>
                <SelectItem value="VIDEO_SCRIPT">{t('Audiovisual script (assisted)')}</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              rows={2}
              value={newCaption}
              onChange={(event) => setNewCaption(event.target.value)}
              placeholder={t('Copy, script outline, or production notes...')}
              className="text-xs"
            />
            <Button
              size="sm"
              disabled={!newTitle.trim() || createItemMutation.isPending}
              onClick={() => createItemMutation.mutate()}
            >
              <Plus className="mr-1 size-3.5" />
              {t('Create piece')}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-1 font-semibold">
              <ImageIcon className="size-3.5" />
              {t('Lightweight visual composition (SVG)')}
            </p>
            <Input
              value={svgHeadline}
              onChange={(event) => setSvgHeadline(event.target.value)}
              placeholder={t('Main visual headline')}
              className="h-8 text-xs"
            />
            <div className="flex gap-2">
              <Select
                value={svgRatio}
                onValueChange={(value) => setSvgRatio(value as typeof svgRatio)}
              >
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1</SelectItem>
                  <SelectItem value="4:5">4:5</SelectItem>
                  <SelectItem value="9:16">9:16</SelectItem>
                  <SelectItem value="16:9">16:9</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={!svgHeadline.trim() || composeMutation.isPending}
                onClick={() => composeMutation.mutate()}
              >
                {t('Compose preview')}
              </Button>
            </div>
            {svgPreview && (
              <div
                className="flex h-44 w-full items-center justify-center overflow-hidden rounded border bg-slate-950 p-1 [&>svg]:h-full [&>svg]:w-auto [&>svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: svgPreview }}
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-semibold">{t('Content pipeline & approvals')}</p>
          {(overview?.items ?? []).length === 0 ? (
            <p className="rounded-lg border bg-muted/20 p-3 text-muted-foreground">
              {t('No content pieces created yet.')}
            </p>
          ) : (
            (overview?.items ?? []).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline">{item.kind}</Badge>
                    <span className="truncate font-medium">{item.title}</span>
                    <Badge variant="secondary">v{item.contentVersion}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-muted-foreground">
                    {item.caption || item.objective || item.status}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge>{item.status}</Badge>
                  {item.status !== 'APPROVED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2"
                      onClick={() => approveMutation.mutate(item.id)}
                    >
                      <Check className="mr-1 size-3" />
                      {t('Approve')}
                    </Button>
                  )}
                  {item.status !== 'REJECTED' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => rejectMutation.mutate(item.id)}
                    >
                      <X className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 border-t pt-3">
          <p className="flex items-center gap-1 font-semibold">
            <Film className="size-3.5" />
            {t('Dynamic creative profiles (optional)')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder={t('Profile name (e.g. Brand voice, Product tutorial)')}
              className="h-8 flex-1 text-xs"
            />
            <Input
              value={profileInstructions}
              onChange={(event) => setProfileInstructions(event.target.value)}
              placeholder={t('Creative instructions or guidelines')}
              className="h-8 flex-1 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!profileName.trim() || !profileInstructions.trim()}
              onClick={() => createProfileMutation.mutate()}
            >
              {t('Add profile')}
            </Button>
          </div>
          {(overview?.profiles ?? []).map((profile) => (
            <div key={profile.id} className="rounded-lg border bg-card px-2.5 py-1.5">
              <span className="font-medium">{profile.name}</span>
              <p className="text-muted-foreground">{profile.instructions}</p>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent
        value="trypost"
        className="mt-0 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 text-xs"
      >
        {overview?.trypost?.status === 'CONNECTED' ? (
          <>
            <div className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div>
                <p className="font-semibold">TryPost</p>
                <p className="text-muted-foreground">{overview.trypost.baseUrl}</p>
              </div>
              <Badge variant="success">
                {t('{count} accounts', { count: formatNumber(overview.trypost.channels.length) })}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {overview.trypost.channels.map((ch) => (
                <Badge key={ch.id} variant="secondary">
                  {ch.platform}: {ch.name}
                </Badge>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-muted-foreground">
            <p>
              {t(
                'TryPost is not connected yet. Connect it under Connectors -> Marketing -> TryPost to sync ideas, remote drafts, queues, and analytics.',
              )}
            </p>
            <div>
              <Button asChild size="sm" variant="outline">
                <Link to="/connectors">
                  {t('Go to Connectors')}
                  <ExternalLink className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent
        value="results"
        className="mt-0 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 text-xs"
      >
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{t('Autonomy & creative budget controls')}</p>
            <Button
              size="sm"
              variant={overview?.policy.paused ? 'default' : 'outline'}
              onClick={() => policyMutation.mutate({ paused: !overview?.policy.paused })}
            >
              {overview?.policy.paused ? (
                <>
                  <Play className="mr-1 size-3.5" />
                  {t('Resume agent')}
                </>
              ) : (
                <>
                  <Pause className="mr-1 size-3.5" />
                  {t('Pause agent')}
                </>
              )}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">{t('Autonomy mode')}</Label>
              <Select
                value={overview?.policy.autonomyMode ?? 'SUPERVISED'}
                onValueChange={(value) => policyMutation.mutate({ autonomyMode: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">{t('Manual')}</SelectItem>
                  <SelectItem value="SUPERVISED">{t('Supervised (recommended)')}</SelectItem>
                  <SelectItem value="AUTOMATIC">
                    {t('Automatic (within approved limits)')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span>{t('Allow automatic publishing')}</span>
              <Switch
                checked={Boolean(overview?.policy.autoPublishAuthorized)}
                onCheckedChange={(checked) =>
                  policyMutation.mutate({ autoPublishAuthorized: checked })
                }
              />
            </div>
          </div>
          <p className="text-muted-foreground">
            {t('Monthly creative budget')}: ${String(overview?.policy.monthlyLimitUsd ?? 0)} ·{' '}
            {t('Spent this month')}: ${String(overview?.policy.spentThisMonthUsd ?? 0)}
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-semibold">{t('Detected commercial opportunities')}</p>
          {(overview?.opportunities.opportunities ?? []).length === 0 ? (
            <p className="rounded-lg border bg-muted/20 p-3 text-muted-foreground">
              {t('No opportunities detected yet.')}
            </p>
          ) : (
            (overview?.opportunities.opportunities ?? []).map((op, idx) => (
              <div key={idx} className="rounded-lg border bg-card p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{op.title}</span>
                  <Badge variant="outline">{op.suggestedPillar}</Badge>
                </div>
                <p className="mt-0.5 text-muted-foreground">{op.rationale}</p>
              </div>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );

  const eventsList = overview?.events ?? [];
  const hideAction = <HideEventsButton onHide={() => eventsCol.setCollapsed(true)} />;

  const eventsPanel = (
    <SocialEventsPanel
      events={eventsList}
      headerAction={wide ? hideAction : undefined}
    />
  );

  /* ── Narrow screen: identical 3-tab responsive layout to SalesAgentWorkspace ── */
  if (!wide) {
    return (
      <Tabs defaultValue="chat" className="flex h-full min-h-0 flex-col gap-2">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">{t('Supervisor')}</TabsTrigger>
          <TabsTrigger value="map">{t('Operations')}</TabsTrigger>
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
          {supervisorPanel}
        </TabsContent>
        <TabsContent value="map" className={cn(COLUMN_CLASS, 'flex-1')}>
          {centerPanel}
        </TabsContent>
        <TabsContent value="events" className={cn(COLUMN_CLASS, 'flex-1')}>
          {eventsPanel}
        </TabsContent>
      </Tabs>
    );
  }

  /* ── Wide screen: identical 3-column grid + collapsible EventsRail ── */
  return (
    <div
      className={cn(
        'grid h-full min-h-0 gap-3',
        eventsCol.collapsed
          ? 'grid-cols-[20rem_minmax(0,1fr)_auto] 2xl:grid-cols-[24rem_minmax(0,1fr)_auto]'
          : 'grid-cols-[20rem_minmax(0,1fr)_18rem] 2xl:grid-cols-[24rem_minmax(0,1fr)_22rem]',
      )}
    >
      <div className={COLUMN_CLASS}>{supervisorPanel}</div>
      <div className={COLUMN_CLASS}>{centerPanel}</div>
      {eventsCol.collapsed ? (
        <EventsRail unseen={0} onShow={() => eventsCol.setCollapsed(false)} />
      ) : (
        <div className={COLUMN_CLASS}>{eventsPanel}</div>
      )}
    </div>
  );
}
