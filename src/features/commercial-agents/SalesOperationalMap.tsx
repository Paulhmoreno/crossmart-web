import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  type NodeTypes,
  Position,
} from '@xyflow/react';
import {
  BookOpen,
  Bot,
  Brain,
  Check,
  Library,
  OctagonX,
  Pencil,
  Search,
  Trash2,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { RelativeTime } from '@/components/time/RelativeTime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ChannelMapView,
  MAP_EDGE_WIDTH,
  PULSING_EDGE_CLASS,
  PULSING_EDGE_WIDTH,
} from '@/features/channel-map/channel-map.constants';
import { ChannelMapCanvas } from '@/features/channel-map/components/ChannelMapCanvas';
import { MapViewToggle } from '@/features/channel-map/components/MapViewToggle';
import { useChannelMapView } from '@/features/channel-map/hooks/useChannelMapView';
import { canvasPoint, STATIC_NODE } from '@/features/channel-map/map-layout';
import type { ChannelLogo as ChannelLogoInfo } from '@/features/channels/channels.constants';
import { ChannelLogo } from '@/features/channels/components/ChannelLogo';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  commercialAgentsApi,
  type SalesAgentMode,
  type SalesKnowledgeEntryView,
  type SalesLearningProposalView,
  type SalesNodeHealth,
  type SalesOperationalNode,
  type SalesOperationalOverview,
} from './api';
import chatwootLogo from './assets/logos/chatwoot.svg';
import claudeCompatibleLogo from './assets/logos/claude-compatible.svg';
import claudeLogo from './assets/logos/claude.svg';
import geminiLogo from './assets/logos/gemini.svg';
import openaiCompatibleLogo from './assets/logos/openai-compatible.svg';
import openaiLogo from './assets/logos/openai.svg';

const CHATWOOT_X = 0;
const AGENT_X = 310;
const RIGHT_COL_X = 620;
const NODE_WIDTH = 248;
const RIGHT_ROW_STEP = 104;
const CENTER_Y = 208;
const GRAPH_HEIGHT = 530;
const RECENT_ACTIVITY_MS = 25_000;

const DOT_CLASSES: Record<SalesNodeHealth, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-warning',
  error: 'bg-destructive',
  unconfigured: 'bg-muted-foreground/45',
};

const EDGE_STROKES: Record<SalesNodeHealth, { stroke: string; dash?: string; opacity?: number }> = {
  healthy: { stroke: '#10b981' },
  warning: { stroke: '#f59e0b', dash: '5 4' },
  error: { stroke: '#ef4444' },
  unconfigured: { stroke: 'var(--muted-foreground)', dash: '4 4', opacity: 0.5 },
};

const MODE_LABELS: Record<SalesAgentMode, string> = {
  DISABLED: 'Disabled',
  SUPERVISED: 'Supervised',
  AUTOMATIC: 'Automatic',
};

const CATEGORY_LABELS: Record<string, string> = {
  business_info: 'Business info',
  location_hours: 'Location & hours',
  delivery_coverage: 'Delivery & coverage',
  payment_methods: 'Payment methods',
  warranties: 'Warranties',
  discounts: 'Discounts',
  channel_policies: 'Channel policies',
  service_style: 'Service style',
  faq: 'FAQ',
};

const SCOPE_LABELS: Record<string, string> = {
  global: 'All channels',
  'channel:web_widget': 'Web Widget',
  'channel:whatsapp': 'WhatsApp',
  'channel:marketplace': 'Marketplace',
  'channel:messenger': 'Messenger',
  'channel:instagram': 'Instagram',
};

const AI_PROVIDER_LOGOS: Record<string, ChannelLogoInfo> = {
  openai: { src: openaiLogo, tint: 'currentColor' },
  anthropic: { src: claudeLogo, tint: '#D97757' },
  gemini: { src: geminiLogo },
  openai_compatible: { src: openaiCompatibleLogo },
  anthropic_compatible: { src: claudeCompatibleLogo },
};

const HANDLE_CLASS = 'pointer-events-none! size-1! min-h-0! min-w-0! border-0! bg-transparent!';
const EMPTY_NODES: readonly SalesOperationalNode[] = [];
const EMPTY_EVENTS: SalesOperationalOverview['events'] = [];

type ActivityOrigin = 'real' | 'simulated' | null;

interface SalesFlowNodeData extends Record<string, unknown> {
  node: SalesOperationalNode;
  subtitle: string;
  selected: boolean;
  isHub: boolean;
  activity: ActivityOrigin;
  onSelect: (id: string) => void;
}

type SalesFlowNode = Node<SalesFlowNodeData, 'salesNode'>;

function nodeLogoFor(node: SalesOperationalNode): ChannelLogoInfo | null {
  if (node.id === 'chatwoot') return { src: chatwootLogo };
  if (node.id === 'ai_provider') {
    const provider = typeof node.meta.provider === 'string' ? node.meta.provider : '';
    return AI_PROVIDER_LOGOS[provider] ?? { src: openaiCompatibleLogo };
  }
  return null;
}

function NodeVisualTile({ node, isHub }: { node: SalesOperationalNode; isHub: boolean }) {
  const logo = nodeLogoFor(node);
  if (logo) {
    return <ChannelLogo logo={logo} />;
  }
  const Icon =
    node.id === 'sales_agent'
      ? Bot
      : node.id === 'catalog'
        ? Library
        : node.id === 'knowledge'
          ? BookOpen
          : node.id === 'learning'
            ? Brain
            : UserRoundCheck;
  return (
    <span
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-lg border',
        isHub
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-background text-foreground',
      )}
      aria-hidden="true"
    >
      <Icon className="size-5" />
    </span>
  );
}

/** React Flow node reusing Crossmart's native CatalogHubCard / StoreCard visual language. */
function SalesGraphNode({ data }: NodeProps<SalesFlowNode>) {
  const { t } = useI18n();
  const { node, subtitle, selected, isHub, activity, onSelect } = data;
  const hasLeftHandle = node.id !== 'chatwoot';
  const hasRightHandle = node.id === 'chatwoot' || node.id === 'sales_agent';

  return (
    <>
      {hasLeftHandle && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          className={HANDLE_CLASS}
        />
      )}
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={cn(
          'flex w-[248px] items-center gap-3 rounded-xl border bg-card p-3 text-left text-card-foreground shadow-sm transition-colors hover:border-ring/60 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
          selected && 'border-primary ring-2 ring-primary/25',
          activity === 'real' && 'border-emerald-500/70',
          activity === 'simulated' && 'border-sky-500/70',
        )}
      >
        <NodeVisualTile node={node} isHub={isHub} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">{t(node.label)}</span>
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                DOT_CLASSES[node.status],
                activity && 'motion-safe:animate-pulse',
              )}
              title={t(node.status)}
            />
          </div>
          <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
          {activity && (
            <span
              className={cn(
                'mt-0.5 text-[10px] font-medium',
                activity === 'real'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-sky-600 dark:text-sky-400',
              )}
            >
              {activity === 'real' ? t('Live Chatwoot activity') : t('Simulated activity')}
            </span>
          )}
        </div>
      </button>
      {hasRightHandle && (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={false}
          className={HANDLE_CLASS}
        />
      )}
    </>
  );
}

const SALES_NODE_TYPES: NodeTypes = {
  salesNode: SalesGraphNode,
};

function localizedNodeSubtitle(
  node: SalesOperationalNode,
  t: (key: string, params?: Record<string, string | number>) => string,
  formatNumber: (value: number) => string,
): string {
  const meta = node.meta;
  if (node.id === 'chatwoot') {
    if (node.status === 'unconfigured') return t('Not connected');
    const inboxes = Array.isArray(meta.inboxes) ? meta.inboxes.length : 0;
    const liveReady = Boolean(meta.liveCircuitVerified);
    const webhookReady = Boolean(meta.webhookAuthReady);
    if (liveReady) {
      return t('{count} inbox(es) · live webhook active', { count: formatNumber(inboxes) });
    }
    if (!webhookReady) {
      return t('{count} inbox(es) · webhook auth pending', { count: formatNumber(inboxes) });
    }
    return t('{count} inbox(es) · permanent webhook pending', { count: formatNumber(inboxes) });
  }
  if (node.id === 'sales_agent') {
    const mode = (meta.salesMode as SalesAgentMode | undefined) ?? 'DISABLED';
    const model = typeof meta.model === 'string' ? meta.model : t('No model');
    return `${t(MODE_LABELS[mode])} · ${model}`;
  }
  if (node.id === 'catalog') {
    const auth = typeof meta.authorizedProducts === 'number' ? meta.authorizedProducts : 0;
    const stock = typeof meta.inStockProducts === 'number' ? meta.inStockProducts : 0;
    return t('{authorized} authorized · {inStock} in stock', {
      authorized: formatNumber(auth),
      inStock: formatNumber(stock),
    });
  }
  if (node.id === 'ai_provider') {
    if (node.status === 'unconfigured') return t('Not configured');
    const model = typeof meta.model === 'string' ? meta.model : '';
    return model || node.detail;
  }
  if (node.id === 'knowledge') {
    const count = typeof meta.approvedKnowledge === 'number' ? meta.approvedKnowledge : 0;
    return t('{count} approved rule(s)', { count: formatNumber(count) });
  }
  if (node.id === 'learning') {
    const pending = typeof meta.pendingProposals === 'number' ? meta.pendingProposals : 0;
    const active = typeof meta.approvedKnowledge === 'number' ? meta.approvedKnowledge : 0;
    return pending > 0
      ? t('{count} proposal(s) awaiting review', { count: formatNumber(pending) })
      : t('{count} active learning(s)', { count: formatNumber(active) });
  }
  if (node.id === 'handoff') {
    const handoffs = typeof meta.handoffs === 'number' ? meta.handoffs : 0;
    return t('{count} handoff(s) recorded', { count: formatNumber(handoffs) });
  }
  return node.detail;
}

/**
 * Center column of the Sales Agent console: native status bar + React Flow operational graph
 * (reusing `ChannelMapCanvas` and `MapViewToggle` from Crossmart Agent) + node inspector &
 * supervised learning proposal controls.
 */
export function SalesOperationalMap({
  workspaceId,
  overview,
  knowledge,
  proposals,
  activeSimulation,
  onStopAuto,
  stoppingAuto,
}: {
  workspaceId: string;
  overview: SalesOperationalOverview | undefined;
  knowledge: readonly SalesKnowledgeEntryView[];
  proposals: readonly SalesLearningProposalView[];
  activeSimulation?: boolean;
  onStopAuto: () => void;
  stoppingAuto: boolean;
}) {
  const { t, formatNumber } = useI18n();
  const qc = useQueryClient();
  const { view, setView } = useChannelMapView();
  const [selectedNodeId, setSelectedNodeId] = useState<string>('sales_agent');
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['sales-overview', workspaceId] });
    void qc.invalidateQueries({ queryKey: ['sales-knowledge', workspaceId] });
    void qc.invalidateQueries({ queryKey: ['sales-proposals', workspaceId] });
  };

  const approve = useMutation({
    mutationFn: (args: { id: string; title?: string; content?: string }) =>
      commercialAgentsApi.approveLearningProposal(workspaceId, args.id, {
        ...(args.title ? { title: args.title } : {}),
        ...(args.content ? { content: args.content } : {}),
      }),
    onSuccess: () => {
      toast.success(t('Commercial knowledge approved'));
      setEditingProposalId(null);
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reject = useMutation({
    mutationFn: (id: string) => commercialAgentsApi.rejectLearningProposal(workspaceId, id),
    onSuccess: () => {
      toast.info(t('Learning proposal rejected'));
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateEntry = useMutation({
    mutationFn: (args: { id: string; title: string; content: string }) =>
      commercialAgentsApi.updateSalesKnowledge(workspaceId, args.id, {
        title: args.title,
        content: args.content,
      }),
    onSuccess: () => {
      toast.success(t('Commercial knowledge updated'));
      setEditingEntryId(null);
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const archive = useMutation({
    mutationFn: (entryId: string) =>
      commercialAgentsApi.archiveSalesKnowledge(workspaceId, entryId),
    onSuccess: () => {
      toast.success(t('Knowledge entry archived'));
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const nodes = overview?.nodes ?? EMPTY_NODES;
  const metrics = overview?.metrics;
  const events = overview?.events ?? EMPTY_EVENTS;
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0] ?? null;
  const pendingProposals = proposals.filter((prop) => prop.status === 'PENDING');
  const filteredKnowledge = knowledgeSearch.trim()
    ? knowledge.filter((entry) => {
        const needle = knowledgeSearch.trim().toLowerCase();
        return (
          entry.title.toLowerCase().includes(needle) ||
          entry.content.toLowerCase().includes(needle) ||
          t(CATEGORY_LABELS[entry.category] ?? entry.category)
            .toLowerCase()
            .includes(needle)
        );
      })
    : knowledge;

  const activeNodes = useMemo(() => {
    const map = new Map<string, ActivityOrigin>();
    if (activeSimulation) {
      map.set('sales_agent', 'simulated');
      map.set('ai_provider', 'simulated');
      map.set('catalog', 'simulated');
      return map;
    }
    const cutoff = Date.now() - RECENT_ACTIVITY_MS;
    for (const ev of events) {
      const ts = new Date(ev.createdAt).getTime();
      if (Number.isNaN(ts) || ts < cutoff) continue;
      const isReal =
        Boolean(ev.channelType && ev.type === 'message_received') || ev.type === 'reply_sent';
      const origin: ActivityOrigin = isReal ? 'real' : 'simulated';
      if (ev.type === 'message_received' || ev.type === 'reply_sent') {
        map.set('chatwoot', 'real');
        map.set('sales_agent', 'real');
      } else if (ev.type === 'catalog_queried' || ev.type === 'product_identified') {
        map.set('catalog', map.get('catalog') ?? origin);
        map.set('sales_agent', map.get('sales_agent') ?? origin);
      } else if (ev.type === 'knowledge_changed') {
        map.set('knowledge', 'real');
      } else if (ev.type === 'learning_proposed') {
        map.set('learning', 'real');
      } else if (ev.type === 'handoff_triggered') {
        map.set('handoff', 'real');
      }
    }
    return map;
  }, [activeSimulation, events]);

  const { flowNodes, flowEdges } = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const rightIds = ['catalog', 'ai_provider', 'knowledge', 'learning', 'handoff'];
    const builtNodes: SalesFlowNode[] = [];
    const builtEdges: Edge[] = [];

    const pushNode = (node: SalesOperationalNode, xPos: number, yPos: number, isHub = false) => {
      builtNodes.push({
        id: node.id,
        type: 'salesNode',
        position: canvasPoint(xPos, yPos),
        width: NODE_WIDTH,
        data: {
          node,
          subtitle: localizedNodeSubtitle(node, t, formatNumber),
          selected: selectedNode?.id === node.id,
          isHub,
          activity: activeNodes.get(node.id) ?? null,
          onSelect: setSelectedNodeId,
        },
        ...STATIC_NODE,
      });
    };

    const cwNode = byId.get('chatwoot');
    const agentNode = byId.get('sales_agent');
    if (cwNode) pushNode(cwNode, CHATWOOT_X, CENTER_Y);
    if (agentNode) pushNode(agentNode, AGENT_X, CENTER_Y, true);

    if (cwNode && agentNode) {
      const styleCfg = EDGE_STROKES[cwNode.status];
      const pulsing = activeNodes.get('chatwoot') === 'real';
      builtEdges.push({
        id: 'chatwoot->sales_agent',
        source: 'chatwoot',
        target: 'sales_agent',
        animated: pulsing,
        className: pulsing ? PULSING_EDGE_CLASS : undefined,
        selectable: false,
        focusable: false,
        style: {
          stroke: styleCfg.stroke,
          strokeWidth: pulsing ? PULSING_EDGE_WIDTH : MAP_EDGE_WIDTH,
          strokeDasharray: styleCfg.dash,
          opacity: styleCfg.opacity,
        },
      });
    }

    rightIds.forEach((id, idx) => {
      const target = byId.get(id);
      if (!target) return;
      pushNode(target, RIGHT_COL_X, idx * RIGHT_ROW_STEP);
      if (agentNode) {
        const styleCfg = EDGE_STROKES[target.status];
        const act = activeNodes.get(target.id);
        const pulsing = Boolean(act);
        builtEdges.push({
          id: `sales_agent->${target.id}`,
          source: 'sales_agent',
          target: target.id,
          animated: pulsing,
          className: pulsing ? PULSING_EDGE_CLASS : undefined,
          selectable: false,
          focusable: false,
          style: {
            stroke: act === 'simulated' ? '#0ea5e9' : styleCfg.stroke,
            strokeWidth: pulsing ? PULSING_EDGE_WIDTH : MAP_EDGE_WIDTH,
            strokeDasharray: act === 'simulated' ? '6 4' : styleCfg.dash,
            opacity: styleCfg.opacity,
          },
        });
      }
    });

    return { flowNodes: builtNodes, flowEdges: builtEdges };
  }, [activeNodes, formatNumber, nodes, selectedNode?.id, t]);

  return (
    <section
      aria-label={t('Operational map')}
      className="@container flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-card px-3 py-2 @lg:grid-cols-4">
        <div className="flex min-w-0 flex-col">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('Attention mode')}
          </dt>
          <dd className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                metrics?.salesMode === 'AUTOMATIC'
                  ? 'bg-emerald-500'
                  : metrics?.salesMode === 'SUPERVISED'
                    ? 'bg-warning'
                    : 'bg-muted-foreground/50',
              )}
            />
            <span>{t(MODE_LABELS[metrics?.salesMode ?? 'DISABLED'])}</span>
            {metrics?.salesMode === 'AUTOMATIC' && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-5 px-1.5 text-[11px]"
                disabled={stoppingAuto}
                onClick={onStopAuto}
              >
                <OctagonX className="size-3" />
                {t('Stop')}
              </Button>
            )}
          </dd>
        </div>

        <div className="flex min-w-0 flex-col">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('Catalog')}
          </dt>
          <dd className="text-sm font-medium">
            {formatNumber(metrics?.inStockProducts ?? 0)} /{' '}
            {formatNumber(metrics?.authorizedProducts ?? 0)}{' '}
            <span className="text-xs font-normal text-muted-foreground">{t('in stock')}</span>
          </dd>
        </div>

        <div className="flex min-w-0 flex-col">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('Conversations')}
          </dt>
          <dd className="text-sm font-medium">
            {formatNumber(metrics?.realConversations ?? 0)}
            <span className="text-xs font-normal text-muted-foreground">
              {' '}
              · {formatNumber(metrics?.repliesSent ?? 0)} {t('replies')}
            </span>
          </dd>
        </div>

        <div className="flex min-w-0 flex-col">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('Knowledge')}
          </dt>
          <dd className="flex items-center gap-1.5 text-sm font-medium">
            <span>{formatNumber(metrics?.approvedKnowledge ?? 0)}</span>
            {(metrics?.pendingProposals ?? 0) > 0 && (
              <Badge variant="warning" className="text-[10px]">
                {t('{count} pending', { count: metrics?.pendingProposals ?? 0 })}
              </Badge>
            )}
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {activeSimulation && (
            <Badge variant="outline" className="border-sky-500/50 text-sky-600 dark:text-sky-400">
              {t('Simulated activity')}
            </Badge>
          )}
        </div>
        <MapViewToggle value={view} onChange={setView} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {view !== ChannelMapView.List ? (
          <div className="min-h-[300px] flex-1">
            <ChannelMapCanvas
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={SALES_NODE_TYPES}
              graphHeight={GRAPH_HEIGHT}
              label={t('Sales Agent operational map')}
              fill
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {nodes.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-ring/60 hover:bg-accent/40',
                    selectedNode?.id === node.id && 'border-primary ring-1 ring-primary/30',
                  )}
                >
                  <NodeVisualTile node={node} isHub={node.id === 'sales_agent'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{t(node.label)}</span>
                      <span
                        className={cn('size-2 shrink-0 rounded-full', DOT_CLASSES[node.status])}
                        title={t(node.status)}
                      />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {localizedNodeSubtitle(node, t, formatNumber)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {pendingProposals.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-card p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('Pending learning proposals')} ({pendingProposals.length})
            </h3>
            {pendingProposals.map((prop) => {
              const isEditing = editingProposalId === prop.id;
              return (
                <div key={prop.id} className="flex flex-col gap-2 rounded-md border p-2.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{prop.title}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {t(CATEGORY_LABELS[prop.category] ?? prop.category)}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {t(SCOPE_LABELS[prop.scope] ?? prop.scope)}
                      </Badge>
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <Input
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                      />
                      <Textarea
                        rows={3}
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{prop.proposedContent}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      disabled={approve.isPending}
                      onClick={() =>
                        approve.mutate(
                          isEditing
                            ? { id: prop.id, title: editTitle, content: editContent }
                            : { id: prop.id },
                        )
                      }
                    >
                      <Check className="size-3.5" />
                      {t('Approve')}
                    </Button>
                    {!isEditing ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                        onClick={() => {
                          setEditingProposalId(prop.id);
                          setEditTitle(prop.title);
                          setEditContent(prop.proposedContent);
                        }}
                      >
                        {t('Edit')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditingProposalId(null)}
                      >
                        {t('Cancel')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive"
                      disabled={reject.isPending}
                      onClick={() => reject.mutate(prop.id)}
                    >
                      <X className="size-3.5" />
                      {t('Reject')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedNode && (
          <div className="flex flex-col gap-2.5 rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn('size-2 rounded-full', DOT_CLASSES[selectedNode.status])}
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium">{t(selectedNode.label)}</h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {localizedNodeSubtitle(selectedNode, t, formatNumber)}
              </span>
            </div>

            {selectedNode.id === 'knowledge' && (
              <div className="flex flex-col gap-2 pt-1">
                {knowledge.length > 0 && (
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      className="h-7 pl-8 text-xs"
                      placeholder={t('Search commercial knowledge...')}
                      value={knowledgeSearch}
                      onChange={(event) => setKnowledgeSearch(event.target.value)}
                    />
                  </div>
                )}
                {filteredKnowledge.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {knowledge.length === 0
                      ? t(
                          'No approved commercial knowledge yet. Teach policies naturally in Supervisor chat.',
                        )
                      : t('No matching knowledge entries.')}
                  </p>
                ) : (
                  filteredKnowledge.map((entry) => {
                    const isEditing = editingEntryId === entry.id;
                    return (
                      <div
                        key={entry.id}
                        className="flex flex-col gap-2 rounded-md border p-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium">{entry.title}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {t(CATEGORY_LABELS[entry.category] ?? entry.category)}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {t(SCOPE_LABELS[entry.scope] ?? entry.scope)} · v{entry.version}
                              </Badge>
                            </div>
                            {!isEditing && (
                              <p className="mt-1 text-muted-foreground">{entry.content}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-6 p-0 text-muted-foreground"
                              onClick={() => {
                                setEditingEntryId(entry.id);
                                setEntryTitle(entry.title);
                                setEntryContent(entry.content);
                              }}
                              aria-label={t('Edit')}
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-6 p-0 text-muted-foreground"
                              onClick={() => archive.mutate(entry.id)}
                              aria-label={t('Archive')}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        {isEditing && (
                          <div className="flex flex-col gap-2">
                            <Input
                              className="h-7 text-xs"
                              value={entryTitle}
                              onChange={(event) => setEntryTitle(event.target.value)}
                            />
                            <Textarea
                              rows={2}
                              className="text-xs"
                              value={entryContent}
                              onChange={(event) => setEntryContent(event.target.value)}
                            />
                            <div className="flex gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                className="h-6 px-2 text-[11px]"
                                disabled={updateEntry.isPending}
                                onClick={() =>
                                  updateEntry.mutate({
                                    id: entry.id,
                                    title: entryTitle,
                                    content: entryContent,
                                  })
                                }
                              >
                                {t('Save')}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => setEditingEntryId(null)}
                              >
                                {t('Cancel')}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {selectedNode.id === 'chatwoot' && (
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                <div className="grid grid-cols-2 gap-1.5 rounded-md bg-muted/30 p-2">
                  <span>
                    {t('API connection')}:{' '}
                    <strong className="text-foreground">
                      {selectedNode.meta.apiAuthenticated ? t('Authenticated') : t('Pending')}
                    </strong>
                  </span>
                  <span>
                    {t('Webhook auth')}:{' '}
                    <strong className="text-foreground">
                      {selectedNode.meta.webhookAuthReady ? t('Configured') : t('Pending')}
                    </strong>
                  </span>
                  <span>
                    {t('Public endpoint')}:{' '}
                    <strong className="text-foreground">
                      {selectedNode.meta.webhookEndpointPermanent
                        ? t('Permanent')
                        : t('Pending permanent URL')}
                    </strong>
                  </span>
                  <span>
                    {t('Last event')}:{' '}
                    <strong className="text-foreground">
                      {typeof selectedNode.meta.lastWebhookReceivedAt === 'string' ? (
                        <RelativeTime value={selectedNode.meta.lastWebhookReceivedAt} />
                      ) : (
                        t('Never')
                      )}
                    </strong>
                  </span>
                </div>
                {Array.isArray(selectedNode.meta.inboxes) &&
                selectedNode.meta.inboxes.length > 0 ? (
                  <ul className="space-y-1">
                    {(
                      selectedNode.meta.inboxes as Array<{
                        id: number;
                        name: string;
                        channelType: string;
                      }>
                    ).map((inbox) => {
                      const authIds = (selectedNode.meta.authorizedInboxIds as number[]) ?? [];
                      const isAuth = authIds.includes(inbox.id);
                      return (
                        <li key={inbox.id} className="flex items-center justify-between gap-2">
                          <span>
                            {inbox.name} (
                            {inbox.channelType === 'Channel::WebWidget'
                              ? t('Web Widget')
                              : inbox.channelType}
                            )
                          </span>
                          <Badge variant={isAuth ? 'success' : 'outline'} className="text-[10px]">
                            {isAuth ? t('Authorized') : t('Inactive')}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p>{t('Connect Chatwoot in Connectors to discover channels.')}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
