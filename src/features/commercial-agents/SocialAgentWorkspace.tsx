import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Background,
  Controls,
  type Edge,
  type Node,
  ReactFlow,
} from '@xyflow/react';
import {
  Check,
  Film,
  Image as ImageIcon,
  Pause,
  Play,
  Plus,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { SafeMarkdown } from './SafeMarkdown';
import {
  type SocialOperationalNodeView,
  socialMarketingApi,
} from './social-api';

const STATUS_BORDER: Record<SocialOperationalNodeView['status'], string> = {
  ok: '2px solid #10b981',
  warning: '2px solid #f59e0b',
  error: '2px solid #ef4444',
  unconfigured: '1px solid #94a3b8',
};

const STATUS_EDGE_COLOR: Record<SocialOperationalNodeView['status'], string> = {
  ok: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  unconfigured: '#94a3b8',
};

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  catalog: { x: 20, y: 20 },
  knowledge: { x: 20, y: 120 },
  research: { x: 20, y: 220 },
  ai: { x: 20, y: 320 },
  production: { x: 560, y: 20 },
  trypost: { x: 560, y: 120 },
  approvals: { x: 560, y: 220 },
  planning: { x: 560, y: 320 },
  results: { x: 290, y: 350 },
};

export function SocialAgentWorkspace({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      socialMarketingApi.chatSupervisor(workspaceId, { message, history: chatMessages }),
    onSuccess: (res, message) => {
      setChatMessages((prev) => [
        ...prev,
        { role: 'user', text: message },
        { role: 'assistant', text: res.reply },
      ]);
      setChatInput('');
      void qc.invalidateQueries({ queryKey: ['social-overview', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
    mutationFn: (patch: Record<string, unknown>) => socialMarketingApi.updatePolicy(workspaceId, patch),
    onSuccess: () => {
      toast.success(t('Social Agent policy updated'));
      void qc.invalidateQueries({ queryKey: ['social-overview', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { flowNodes, flowEdges } = useMemo(() => {
    const centerNode: Node = {
      id: 'social-agent-core',
      position: { x: 280, y: 155 },
      data: {
        label: (
          <div className="px-2 py-1 text-center">
            <p className="text-xs font-semibold">{t('Social Agent')}</p>
            <p className="text-[10px] text-muted-foreground">
              {overview?.policy.paused ? t('Paused') : overview?.policy.autonomyMode ?? 'SUPERVISED'}
            </p>
          </div>
        ),
      },
      style: {
        borderRadius: 12,
        border: '2px solid #2563eb',
        background: 'var(--card)',
        color: 'var(--card-foreground)',
        width: 190,
      },
    };

    const peripheralNodes: Node[] = (overview?.nodes ?? []).map((n) => ({
      id: n.id,
      position: NODE_POSITIONS[n.id] ?? { x: 20, y: 20 },
      data: {
        label: (
          <div className="px-1.5 py-0.5 text-left">
            <p className="text-[11px] font-semibold">{n.label}</p>
            <p className="truncate text-[10px] text-muted-foreground">{n.summary}</p>
          </div>
        ),
      },
      style: {
        borderRadius: 10,
        border: STATUS_BORDER[n.status],
        background: 'var(--card)',
        color: 'var(--card-foreground)',
        width: 190,
      },
    }));

    const edges: Edge[] = (overview?.nodes ?? []).map((n) => ({
      id: `e-${n.id}`,
      source: ['catalog', 'knowledge', 'research', 'ai'].includes(n.id) ? n.id : 'social-agent-core',
      target: ['catalog', 'knowledge', 'research', 'ai'].includes(n.id) ? 'social-agent-core' : n.id,
      animated: n.status === 'ok',
      style: {
        stroke: STATUS_EDGE_COLOR[n.status],
        strokeDasharray: n.status === 'warning' ? '5 4' : undefined,
      },
    }));

    return { flowNodes: [centerNode, ...peripheralNodes], flowEdges: edges };
  }, [overview, t]);

  const selectedNode = overview?.nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <div className="grid min-h-[620px] grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Left Column: Supervisor */}
      <Card className="flex flex-col lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Sparkles className="size-4 text-primary" />
            {t('Supervisor')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('Request strategies, ideas, visual compositions, or audiovisual scripts in natural language.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-3">
          <div className="max-h-[440px] flex-1 space-y-2.5 overflow-y-auto pr-1 text-xs">
            {chatMessages.length === 0 ? (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-muted-foreground">
                <p>{t('Ask me to analyze your catalog, propose an editorial plan, or design a content piece.')}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
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
                      className="h-auto py-1 text-[11px]"
                      onClick={() => chatMutation.mutate(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`rounded-md p-2.5 ${
                    msg.role === 'user'
                      ? 'ml-4 bg-primary text-primary-foreground'
                      : 'mr-2 border bg-muted/40'
                  }`}
                >
                  {msg.role === 'assistant' ? <SafeMarkdown text={msg.text} /> : <p>{msg.text}</p>}
                </div>
              ))
            )}
          </div>

          <form
            className="flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim() && !chatMutation.isPending) {
                chatMutation.mutate(chatInput.trim());
              }
            }}
          >
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={t('Write to Social Agent...')}
              className="h-8 text-xs"
            />
            <Button type="submit" size="sm" className="h-8 px-2.5" disabled={chatMutation.isPending}>
              <Send className="size-3.5" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Center Column: Operations (React Flow), Production, TryPost, Results */}
      <Card className="flex flex-col lg:col-span-6">
        <CardContent className="flex-1 pt-4">
          <Tabs defaultValue="operations" className="gap-3">
            <TabsList variant="line" className="w-full justify-start border-b">
              <TabsTrigger value="operations">{t('Operations')}</TabsTrigger>
              <TabsTrigger value="production">{t('Production')}</TabsTrigger>
              <TabsTrigger value="trypost">TryPost</TabsTrigger>
              <TabsTrigger value="results">{t('Results')}</TabsTrigger>
            </TabsList>

            <TabsContent value="operations" className="space-y-3">
              <div className="h-[430px] w-full overflow-hidden rounded-md border">
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  fitView
                  onNodeClick={(_ev, node) =>
                    setSelectedNodeId(node.id === 'social-agent-core' ? null : node.id)
                  }
                >
                  <Background />
                  <Controls />
                </ReactFlow>
              </div>
              {selectedNode && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{selectedNode.label}</span>
                    <Badge variant="outline">{selectedNode.status}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{selectedNode.summary}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="production" className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="font-semibold">{t('New editorial piece / script')}</p>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={t('Title or concept')}
                    className="h-8 text-xs"
                  />
                  <Select
                    value={newKind}
                    onValueChange={(v) => setNewKind(v as typeof newKind)}
                  >
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
                    onChange={(e) => setNewCaption(e.target.value)}
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
                    onChange={(e) => setSvgHeadline(e.target.value)}
                    placeholder={t('Main visual headline')}
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-2">
                    <Select
                      value={svgRatio}
                      onValueChange={(v) => setSvgRatio(v as typeof svgRatio)}
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
                  <p className="text-muted-foreground">{t('No content pieces created yet.')}</p>
                ) : (
                  (overview?.items ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5"
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
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder={t('Profile name (e.g. Brand voice, Product tutorial)')}
                    className="h-8 flex-1 text-xs"
                  />
                  <Input
                    value={profileInstructions}
                    onChange={(e) => setProfileInstructions(e.target.value)}
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
                {(overview?.profiles ?? []).map((p) => (
                  <div key={p.id} className="rounded-md border px-2.5 py-1.5">
                    <span className="font-medium">{p.name}</span>
                    <p className="text-muted-foreground">{p.instructions}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="trypost" className="space-y-3 text-xs">
              {overview?.trypost?.status === 'CONNECTED' ? (
                <>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-semibold">TryPost</p>
                      <p className="text-muted-foreground">{overview.trypost.baseUrl}</p>
                    </div>
                    <Badge>{overview.trypost.channels.length} cuenta(s)</Badge>
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
                <div className="rounded-md border bg-muted/30 p-4 text-muted-foreground">
                  {t('TryPost is not connected yet. Connect it under Connectors -> Marketing -> TryPost to sync ideas, remote drafts, queues, and analytics.')}
                </div>
              )}
            </TabsContent>

            <TabsContent value="results" className="space-y-4 text-xs">
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{t('Autonomy & creative budget controls')}</p>
                  <Button
                    size="sm"
                    variant={overview?.policy.paused ? 'default' : 'outline'}
                    onClick={() =>
                      policyMutation.mutate({ paused: !overview?.policy.paused })
                    }
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
                      onValueChange={(v) => policyMutation.mutate({ autonomyMode: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANUAL">{t('Manual')}</SelectItem>
                        <SelectItem value="SUPERVISED">{t('Supervised (recommended)')}</SelectItem>
                        <SelectItem value="AUTOMATIC">{t('Automatic (within approved limits)')}</SelectItem>
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
                {(overview?.opportunities.opportunities ?? []).map((op, i) => (
                  <div key={i} className="rounded-md border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{op.title}</span>
                      <Badge variant="outline">{op.suggestedPillar}</Badge>
                    </div>
                    <p className="mt-0.5 text-muted-foreground">{op.rationale}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Right Column: Real Operational Events */}
      <Card className="flex flex-col lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('Events')}</CardTitle>
          <CardDescription className="text-xs">
            {t('Real creative, approval, and TryPost activity.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[520px] flex-1 space-y-2.5 overflow-y-auto text-xs">
          {(overview?.events ?? []).length === 0 ? (
            <p className="text-muted-foreground">{t('No events recorded yet.')}</p>
          ) : (
            (overview?.events ?? []).map((ev) => (
              <div key={ev.id} className="border-l-2 border-border pl-2.5">
                <p className="font-medium">{ev.summary}</p>
                <p className="text-[11px] text-muted-foreground">{formatDateTime(ev.createdAt)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
