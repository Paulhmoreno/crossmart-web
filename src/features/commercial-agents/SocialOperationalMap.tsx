import { useMemo, useState } from 'react';
import { Handle, type Node, type NodeProps, type NodeTypes, Position } from '@xyflow/react';
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarClock,
  CheckCircle2,
  Compass,
  ExternalLink,
  Package,
  Pause,
  Play,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import claudeCompatibleLogo from './assets/logos/claude-compatible.svg';
import claudeLogo from './assets/logos/claude.svg';
import geminiLogo from './assets/logos/gemini.svg';
import openaiCompatibleLogo from './assets/logos/openai-compatible.svg';
import openaiLogo from './assets/logos/openai.svg';
import trypostLogo from './assets/logos/trypost.svg';
import type { SocialOperationalNodeView, SocialOverviewResponse } from './social-api';

type SocialNodeStatus = SocialOperationalNodeView['status'];
type SocialCenterView = 'operations' | 'production' | 'trypost' | 'results';

interface SocialFlowNodeData extends Record<string, unknown> {
  node: SocialOperationalNodeView;
  title: string;
  subtitle: string;
  selected: boolean;
  isHub: boolean;
  hasLeftHandle: boolean;
  hasRightHandle: boolean;
  onSelect: (id: string) => void;
}

type SocialFlowNode = Node<SocialFlowNodeData, 'social-node'>;

const AI_PROVIDER_LOGOS: Record<string, { src: string; alt: string }> = {
  openai: { src: openaiLogo, alt: 'OpenAI' },
  anthropic: { src: claudeLogo, alt: 'Claude' },
  gemini: { src: geminiLogo, alt: 'Gemini' },
  openai_compatible: { src: openaiCompatibleLogo, alt: 'OpenAI Compatible' },
  anthropic_compatible: { src: claudeCompatibleLogo, alt: 'Claude Compatible' },
};

const HANDLE_CLASS = '!size-2 !border-2 !border-background !bg-border';

const DOT_CLASSES: Record<SocialNodeStatus, string> = {
  ok: 'bg-emerald-500',
  warning: 'bg-warning',
  error: 'bg-destructive',
  unconfigured: 'bg-muted-foreground/50',
};

const STATUS_BADGE: Record<SocialNodeStatus, 'success' | 'warning' | 'destructive' | 'outline'> = {
  ok: 'success',
  warning: 'warning',
  error: 'destructive',
  unconfigured: 'outline',
};

const EDGE_STROKES: Record<SocialNodeStatus, { stroke: string; dash?: string; opacity: number }> = {
  ok: { stroke: 'var(--color-emerald-500, #10b981)', opacity: 0.9 },
  warning: { stroke: 'var(--color-amber-500, #f59e0b)', dash: '5 4', opacity: 0.85 },
  error: { stroke: 'var(--color-red-500, #ef4444)', dash: '4 4', opacity: 0.9 },
  unconfigured: { stroke: 'var(--muted-foreground)', dash: '3 4', opacity: 0.45 },
};

const AUTONOMY_LABELS: Record<'MANUAL' | 'SUPERVISED' | 'AUTOMATIC', string> = {
  MANUAL: 'Manual',
  SUPERVISED: 'Supervised',
  AUTOMATIC: 'Automatic',
};

const LEFT_COL_X = 0;
const CENTER_COL_X = 330;
const RIGHT_COL_X = 660;
const LEFT_ROW_OFFSET = 24;
const LEFT_ROW_STEP = 98;
const CENTER_HUB_Y = 174;
const RIGHT_ROW_STEP = 92;
const GRAPH_HEIGHT = 460;
const USD_DECIMALS = 2;

const LEFT_NODE_IDS = ['catalog', 'knowledge', 'research', 'ai'] as const;
const RIGHT_NODE_IDS = ['production', 'trypost', 'approvals', 'planning', 'results'] as const;

const NODE_TITLE_KEYS: Record<string, string> = {
  social_agent: 'Social Agent',
  catalog: 'Catalog & Inventory',
  knowledge: 'Commercial Knowledge',
  research: 'Market Research',
  ai: 'AI Model',
  production: 'Creative Production',
  trypost: 'TryPost',
  approvals: 'Approvals',
  planning: 'Planning',
  results: 'Results & Learning',
};

function localizedNodeTitle(
  node: SocialOperationalNodeView,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const key = NODE_TITLE_KEYS[node.id];
  return key ? t(key) : t(node.label);
}

function localizedNodeSubtitle(
  node: SocialOperationalNodeView,
  overview: SocialOverviewResponse | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
  formatNumber: (value: number) => string,
): string {
  const details = node.details ?? {};
  switch (node.id) {
    case 'social_agent': {
      if (overview?.policy.paused) return t('Paused');
      const mode = overview?.policy.autonomyMode ?? 'SUPERVISED';
      return t(AUTONOMY_LABELS[mode]);
    }
    case 'catalog': {
      const inStock = Number(
        details.inStockProducts ?? overview?.opportunities.inStockProducts ?? 0,
      );
      const total = Number(details.totalProducts ?? overview?.opportunities.totalProducts ?? 0);
      return t('{inStock} in stock / {total} total', {
        inStock: formatNumber(inStock),
        total: formatNumber(total),
      });
    }
    case 'knowledge': {
      const count = Number(details.count ?? 0);
      return count > 0
        ? t('{count} approved entries', { count: formatNumber(count) })
        : t('No approved business knowledge yet');
    }
    case 'research': {
      const count = Number(
        details.opportunities ?? overview?.opportunities.opportunities.length ?? 0,
      );
      return count > 0
        ? t('{count} opportunities detected', { count: formatNumber(count) })
        : t('Waiting for catalog analysis');
    }
    case 'ai': {
      const model = typeof details.model === 'string' && details.model ? details.model : null;
      return model ?? t('Pending model assignment');
    }
    case 'production': {
      const count = Number(details.items ?? overview?.items.length ?? 0);
      const profiles = Number(details.profiles ?? overview?.profiles.length ?? 0);
      return t('{items} pieces · {profiles} profiles', {
        items: formatNumber(count),
        profiles: formatNumber(profiles),
      });
    }
    case 'trypost': {
      const channels = Array.isArray(overview?.trypost?.channels)
        ? overview.trypost.channels.length
        : Number(details.channels ?? 0);
      return overview?.trypost?.status === 'CONNECTED'
        ? t('Connected · {count} accounts', { count: formatNumber(channels) })
        : t('Not connected');
    }
    case 'approvals': {
      const pending = Number(
        details.pending ??
          (overview?.items ?? []).filter((item) => item.status === 'PENDING_APPROVAL').length,
      );
      return pending > 0
        ? t('{count} pending review', { count: formatNumber(pending) })
        : t('No pending approvals');
    }
    case 'planning': {
      const scheduled = Number(
        details.scheduled ??
          (overview?.items ?? []).filter((item) => Boolean(item.scheduledFor)).length,
      );
      return scheduled > 0
        ? t('{count} scheduled pieces', { count: formatNumber(scheduled) })
        : t('No scheduled queue yet');
    }
    case 'results': {
      const spent = Number(overview?.policy.spentThisMonthUsd ?? 0);
      const limit = Number(overview?.policy.monthlyLimitUsd ?? 0);
      return `$${spent.toFixed(USD_DECIMALS)} / $${limit.toFixed(USD_DECIMALS)} ${t('budget')}`;
    }
    default:
      return node.summary;
  }
}

function NodeVisualTile({
  node,
  isHub,
}: {
  node: SocialOperationalNodeView;
  isHub: boolean;
}) {
  if (node.id === 'trypost') {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-background p-1.5">
        <img src={trypostLogo} alt="TryPost" className="size-7 object-contain" />
      </span>
    );
  }

  if (node.id === 'ai') {
    const providerKey = typeof node.details?.providerKey === 'string' ? node.details.providerKey : '';
    const brand = AI_PROVIDER_LOGOS[providerKey];
    if (brand) {
      return (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-background p-1.5">
          <img src={brand.src} alt={brand.alt} className="size-7 object-contain" />
        </span>
      );
    }
  }

  let Icon = Sparkles;
  switch (node.id) {
    case 'social_agent':
      Icon = Bot;
      break;
    case 'catalog':
      Icon = Package;
      break;
    case 'knowledge':
      Icon = BookOpen;
      break;
    case 'research':
      Icon = Compass;
      break;
    case 'production':
      Icon = Wand2;
      break;
    case 'approvals':
      Icon = CheckCircle2;
      break;
    case 'planning':
      Icon = CalendarClock;
      break;
    case 'results':
      Icon = BarChart3;
      break;
    default:
      Icon = Sparkles;
  }

  return (
    <span
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-lg border',
        isHub
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-muted/40 text-foreground',
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}

function SocialNodeCard({ data }: NodeProps<SocialFlowNode>) {
  const { node, title, subtitle, selected, isHub, hasLeftHandle, hasRightHandle, onSelect } = data;
  return (
    <div className="relative">
      {hasLeftHandle && (
        <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      )}
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={cn(
          'flex w-[248px] items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-all hover:border-ring/60 hover:bg-accent/40',
          isHub && 'border-primary/60 shadow-md',
          selected && 'border-primary ring-2 ring-primary/30',
        )}
      >
        <NodeVisualTile node={node} isHub={isHub} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="truncate text-sm font-semibold">{title}</span>
            <span
              className={cn('size-2 shrink-0 rounded-full', DOT_CLASSES[node.status])}
              aria-hidden="true"
            />
          </div>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </button>
      {hasRightHandle && (
        <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
      )}
    </div>
  );
}

const SOCIAL_NODE_TYPES: NodeTypes = {
  'social-node': SocialNodeCard,
};

export interface SocialOperationalMapProps {
  overview: SocialOverviewResponse | undefined;
  onTogglePause: () => void;
  togglingPause: boolean;
  onNavigateTab: (tab: SocialCenterView) => void;
}

export function SocialOperationalMap({
  overview,
  onTogglePause,
  togglingPause,
  onNavigateTab,
}: SocialOperationalMapProps) {
  const { t, formatNumber } = useI18n();
  const { view, setView } = useChannelMapView();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const policy = overview?.policy;
  const paused = Boolean(policy?.paused);
  const autonomyMode = policy?.autonomyMode ?? 'SUPERVISED';
  const itemsCount = overview?.items.length ?? 0;
  const pendingApprovalCount = (overview?.items ?? []).filter(
    (item) => item.status === 'PENDING_APPROVAL',
  ).length;
  const trypostConnected = overview?.trypost?.status === 'CONNECTED';
  const trypostAccounts = overview?.trypost?.channels.length ?? 0;

  const allNodes = useMemo<SocialOperationalNodeView[]>(() => {
    const hubNode: SocialOperationalNodeView = {
      id: 'social_agent',
      label: 'Social Agent',
      status: paused ? 'warning' : 'ok',
      summary: paused ? t('Paused') : t(AUTONOMY_LABELS[autonomyMode]),
      details: {
        autonomyMode,
        paused,
        autoPublishAuthorized: Boolean(policy?.autoPublishAuthorized),
        monthlyLimitUsd: Number(policy?.monthlyLimitUsd ?? 0),
        spentThisMonthUsd: Number(policy?.spentThisMonthUsd ?? 0),
      },
    };
    return [hubNode, ...(overview?.nodes ?? [])];
  }, [autonomyMode, overview?.nodes, paused, policy, t]);

  const selectedNode = useMemo(
    () => allNodes.find((item) => item.id === selectedNodeId) ?? null,
    [allNodes, selectedNodeId],
  );

  const { flowNodes, flowEdges } = useMemo(() => {
    const byId = new Map(allNodes.map((item) => [item.id, item]));
    const builtNodes: SocialFlowNode[] = [];
    const builtEdges: Array<{
      id: string;
      source: string;
      target: string;
      animated?: boolean;
      className?: string;
      selectable: false;
      focusable: false;
      style: {
        stroke: string;
        strokeWidth: number;
        strokeDasharray?: string;
        opacity: number;
      };
    }> = [];

    const pushNode = (
      node: SocialOperationalNodeView,
      posX: number,
      posY: number,
      opts: { isHub: boolean; hasLeftHandle: boolean; hasRightHandle: boolean },
    ) => {
      builtNodes.push({
        id: node.id,
        type: 'social-node',
        position: canvasPoint(posX, posY),
        ...STATIC_NODE,
        data: {
          node,
          title: localizedNodeTitle(node, t),
          subtitle: localizedNodeSubtitle(node, overview, t, formatNumber),
          selected: selectedNode?.id === node.id,
          isHub: opts.isHub,
          hasLeftHandle: opts.hasLeftHandle,
          hasRightHandle: opts.hasRightHandle,
          onSelect: (id) => setSelectedNodeId((prev) => (prev === id ? null : id)),
        },
      });
    };

    const hub = byId.get('social_agent');
    if (hub) {
      pushNode(hub, CENTER_COL_X, CENTER_HUB_Y, {
        isHub: true,
        hasLeftHandle: true,
        hasRightHandle: true,
      });
    }

    LEFT_NODE_IDS.forEach((id, idx) => {
      const node = byId.get(id);
      if (!node) return;
      pushNode(node, LEFT_COL_X, LEFT_ROW_OFFSET + idx * LEFT_ROW_STEP, {
        isHub: false,
        hasLeftHandle: false,
        hasRightHandle: true,
      });
      if (hub) {
        const styleCfg = EDGE_STROKES[node.status];
        const pulsing = node.status === 'ok' && !paused;
        builtEdges.push({
          id: `${node.id}->social_agent`,
          source: node.id,
          target: 'social_agent',
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
    });

    RIGHT_NODE_IDS.forEach((id, idx) => {
      const node = byId.get(id);
      if (!node) return;
      pushNode(node, RIGHT_COL_X, idx * RIGHT_ROW_STEP, {
        isHub: false,
        hasLeftHandle: true,
        hasRightHandle: false,
      });
      if (hub) {
        const styleCfg = EDGE_STROKES[node.status];
        const pulsing = node.status === 'ok' && !paused;
        builtEdges.push({
          id: `social_agent->${node.id}`,
          source: 'social_agent',
          target: node.id,
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
    });

    return { flowNodes: builtNodes, flowEdges: builtEdges };
  }, [allNodes, formatNumber, overview, paused, selectedNode?.id, t]);

  return (
    <section
      aria-label={t('Operational map')}
      className="@container flex h-full min-h-0 flex-col gap-3 p-3"
    >
      {/* Native 4-metric operational indicator bar matching SalesOperationalMap */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-card px-3 py-2 @lg:grid-cols-4">
        <div className="flex min-w-0 flex-col">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('Autonomy mode')}
          </dt>
          <dd className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                paused
                  ? 'bg-warning'
                  : autonomyMode === 'AUTOMATIC'
                    ? 'bg-emerald-500'
                    : autonomyMode === 'SUPERVISED'
                      ? 'bg-emerald-500'
                      : 'bg-muted-foreground/50',
              )}
            />
            <span>{paused ? t('Paused') : t(AUTONOMY_LABELS[autonomyMode])}</span>
            <Button
              type="button"
              variant={paused ? 'default' : 'outline'}
              size="sm"
              className="h-5 px-1.5 text-[11px]"
              disabled={togglingPause}
              onClick={onTogglePause}
            >
              {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
              {paused ? t('Resume') : t('Pause')}
            </Button>
          </dd>
        </div>

        <div className="flex min-w-0 flex-col">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('Catalog')}
          </dt>
          <dd className="text-sm font-medium">
            {formatNumber(overview?.opportunities.inStockProducts ?? 0)} /{' '}
            {formatNumber(overview?.opportunities.totalProducts ?? 0)}{' '}
            <span className="text-xs font-normal text-muted-foreground">{t('in stock')}</span>
          </dd>
        </div>

        <div className="flex min-w-0 flex-col">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('Production')}
          </dt>
          <dd className="flex items-center gap-1.5 text-sm font-medium">
            <span>{formatNumber(itemsCount)}</span>
            {pendingApprovalCount > 0 ? (
              <Badge variant="warning" className="text-[10px]">
                {t('{count} pending', { count: pendingApprovalCount })}
              </Badge>
            ) : (
              <span className="text-xs font-normal text-muted-foreground">{t('pieces')}</span>
            )}
          </dd>
        </div>

        <div className="flex min-w-0 flex-col">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">TryPost</dt>
          <dd className="flex items-center gap-1.5 text-sm font-medium">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                trypostConnected ? 'bg-emerald-500' : 'bg-muted-foreground/50',
              )}
            />
            <span className="truncate">
              {trypostConnected
                ? t('{count} accounts', { count: formatNumber(trypostAccounts) })
                : t('Not connected')}
            </span>
          </dd>
        </div>
      </dl>

      {/* Toolbar: status hint + native MapViewToggle (Map / List) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {t('Monthly creative budget')}:{' '}
            <strong className="font-medium text-foreground">
              ${Number(policy?.spentThisMonthUsd ?? 0).toFixed(USD_DECIMALS)} / $
              {Number(policy?.monthlyLimitUsd ?? 0).toFixed(USD_DECIMALS)}
            </strong>
          </span>
        </div>
        <MapViewToggle value={view} onChange={setView} />
      </div>

      {/* Main canvas or List view + Node Inspector */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {view !== ChannelMapView.List ? (
          <div className="min-h-[320px] flex-1">
            <ChannelMapCanvas
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={SOCIAL_NODE_TYPES}
              graphHeight={GRAPH_HEIGHT}
              label={t('Social Agent operational map')}
              fill
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {allNodes.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
                  }
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-ring/60 hover:bg-accent/40',
                    selectedNode?.id === node.id && 'border-primary ring-1 ring-primary/30',
                  )}
                >
                  <NodeVisualTile node={node} isHub={node.id === 'social_agent'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {localizedNodeTitle(node, t)}
                      </span>
                      <span
                        className={cn('size-2 shrink-0 rounded-full', DOT_CLASSES[node.status])}
                        title={t(node.status)}
                      />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {localizedNodeSubtitle(node, overview, t, formatNumber)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Native Node Inspector */}
        {selectedNode && (
          <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{localizedNodeTitle(selectedNode, t)}</h3>
                <Badge variant={STATUS_BADGE[selectedNode.status]} className="text-[10px]">
                  {t(selectedNode.status)}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedNode.id === 'production' || selectedNode.id === 'approvals' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onNavigateTab('production')}
                  >
                    {t('Open Production')}
                  </Button>
                ) : null}
                {selectedNode.id === 'trypost' ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => onNavigateTab('trypost')}
                    >
                      {t('Open TryPost')}
                    </Button>
                    <Button asChild type="button" size="sm" variant="ghost" className="h-7 text-xs">
                      <Link to="/connectors">
                        {t('Connectors')}
                        <ExternalLink className="ml-1 size-3" />
                      </Link>
                    </Button>
                  </>
                ) : null}
                {selectedNode.id === 'results' || selectedNode.id === 'social_agent' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onNavigateTab('results')}
                  >
                    {t('Open Results')}
                  </Button>
                ) : null}
                {selectedNode.id === 'ai' ? (
                  <Button asChild type="button" size="sm" variant="outline" className="h-7 text-xs">
                    <Link to="/connectors">
                      {t('Configure AI')}
                      <ExternalLink className="ml-1 size-3" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {localizedNodeSubtitle(selectedNode, overview, t, formatNumber)}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Operational Status Bar */}
      <footer className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>
          {t('Social Agent')} · {paused ? t('Paused') : t(AUTONOMY_LABELS[autonomyMode])}
          {policy?.autoPublishAuthorized ? ` · ${t('Auto-publish enabled')}` : ` · ${t('Manual approval required')}`}
        </span>
        <span>
          {trypostConnected
            ? `TryPost: ${t('{count} accounts', { count: formatNumber(trypostAccounts) })}`
            : `TryPost: ${t('Not connected')}`}
        </span>
      </footer>
    </section>
  );
}
