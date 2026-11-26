import { type ReactNode, useState } from 'react';
import { Radio } from 'lucide-react';
import { RelativeTime } from '@/components/time/RelativeTime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SalesEventView } from './api';

type EventFilterKey = 'all' | 'messages' | 'catalog' | 'knowledge' | 'errors';

const FILTER_MAP: Record<EventFilterKey, string[]> = {
  all: [],
  messages: ['message_received', 'reply_sent', 'handoff_triggered'],
  catalog: ['catalog_queried', 'product_identified'],
  knowledge: ['learning_proposed', 'knowledge_changed', 'config_changed'],
  errors: ['communication_error'],
};

const JSON_INDENT = 2;
const CATALOG_COUNT_GROUP = 2;

const EVENT_DOT: Record<string, string> = {
  message_received: 'bg-sky-500',
  product_identified: 'bg-emerald-500',
  catalog_queried: 'bg-indigo-500',
  reply_sent: 'bg-emerald-500',
  handoff_triggered: 'bg-warning',
  communication_error: 'bg-destructive',
  learning_proposed: 'bg-warning',
  knowledge_changed: 'bg-emerald-500',
  config_changed: 'bg-muted-foreground',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  message_received: 'Message received',
  product_identified: 'Product identified',
  catalog_queried: 'Catalog queried',
  reply_sent: 'Reply sent',
  handoff_triggered: 'Human handoff',
  communication_error: 'Communication error',
  learning_proposed: 'Learning proposed',
  knowledge_changed: 'Knowledge updated',
  config_changed: 'Configuration updated',
};

const CHANNEL_LABELS: Record<string, string> = {
  'Channel::WebWidget': 'Web Widget',
  'Channel::Whatsapp': 'WhatsApp',
  'Channel::FacebookPage': 'Messenger',
  'Channel::Instagram': 'Instagram',
  marketplace: 'Marketplace',
  web_widget: 'Web Widget',
};

function localizeEventSummary(
  ev: SalesEventView,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const raw = ev.summary;
  const replyMatch = /^Reply sent to Chatwoot #(\d+)$/.exec(raw);
  if (replyMatch) return t('Reply sent to Chatwoot #{id}', { id: replyMatch[1] ?? '' });
  const draftMatch = /^Private draft sent to Chatwoot #(\d+)$/.exec(raw);
  if (draftMatch) return t('Private draft sent to Chatwoot #{id}', { id: draftMatch[1] ?? '' });
  const buyerMatch = /^Buyer message on (.+)$/.exec(raw);
  if (buyerMatch) return t('Buyer message on {inbox}', { inbox: buyerMatch[1] ?? '' });
  const catalogMatch = /^Catalog queried \(([^)]+)\): (\d+) match\(es\)$/.exec(raw);
  if (catalogMatch) {
    return t('Catalog queried: {count} match(es)', {
      count: catalogMatch[CATALOG_COUNT_GROUP] ?? '0',
    });
  }
  const prodMatch = /^Product identified from channel context: (.+)$/.exec(raw);
  if (prodMatch) return t('Product identified: {title}', { title: prodMatch[1] ?? '' });
  const knowApprove = /^Knowledge approved: (.+?) \([^)]+\)$/.exec(raw);
  if (knowApprove) return t('Knowledge approved: {title}', { title: knowApprove[1] ?? '' });
  const learnProp = /^Learning proposed: (.+?) \([^)]+\)$/.exec(raw);
  if (learnProp) return t('Learning proposed: {title}', { title: learnProp[1] ?? '' });
  const knowUpd = /^Knowledge updated: (.+)$/.exec(raw);
  if (knowUpd) return t('Knowledge updated: {title}', { title: knowUpd[1] ?? '' });
  const knowArch = /^Knowledge archived: (.+)$/.exec(raw);
  if (knowArch) return t('Knowledge archived: {title}', { title: knowArch[1] ?? '' });
  return raw;
}

/**
 * Right column of the Sales Agent console: adapts Crossmart Agent's EventStreamPanel
 * to display real, non-fabricated commercial events with details and conversation traceability.
 */
export function SalesEventsPanel({
  events,
  onSelectConversation,
  headerAction,
}: {
  events: readonly SalesEventView[];
  onSelectConversation: (conversationId: string) => void;
  headerAction?: ReactNode;
}) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<EventFilterKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visible =
    filter === 'all' ? events : events.filter((ev) => FILTER_MAP[filter].includes(ev.type));

  const filters: Array<{ key: EventFilterKey; label: string }> = [
    { key: 'all', label: t('All') },
    { key: 'messages', label: t('Messages') },
    { key: 'catalog', label: t('Catalog') },
    { key: 'knowledge', label: t('Knowledge') },
    { key: 'errors', label: t('Errors') },
  ];

  return (
    <section aria-label={t('Commercial events')} className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-2 border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t('Events')}</h2>
          <div className="flex items-center gap-1">
            <Badge variant="success">
              <Radio aria-hidden="true" />
              {t('Live')}
            </Badge>
            {headerAction}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {filters.map((item) => (
            <Button
              key={item.key}
              type="button"
              size="sm"
              variant={filter === item.key ? 'secondary' : 'ghost'}
              className="h-6 px-2 text-xs"
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </header>

      <ol className="min-h-0 flex-1 divide-y overflow-y-auto">
        {visible.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t('No commercial events recorded yet.')}
          </li>
        ) : (
          visible.map((ev) => {
            const expanded = expandedId === ev.id;
            const channelLabel = ev.channelType
              ? t(CHANNEL_LABELS[ev.channelType] ?? ev.channelType)
              : null;
            return (
              <li key={ev.id} className="px-3 py-2 text-xs">
                <button
                  type="button"
                  className="flex w-full items-start gap-2 text-left"
                  onClick={() => setExpandedId(expanded ? null : ev.id)}
                >
                  <span
                    className={cn(
                      'mt-1 size-1.5 shrink-0 rounded-full',
                      EVENT_DOT[ev.type] ?? 'bg-muted-foreground',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{localizeEventSummary(ev, t)}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{t(EVENT_TYPE_LABELS[ev.type] ?? ev.type)}</span>
                      {channelLabel && <span>· {channelLabel}</span>}
                      <span>·</span>
                      <RelativeTime value={ev.createdAt} />
                    </div>
                  </div>
                </button>
                {expanded && (
                  <div className="mt-2 flex flex-col gap-1.5 rounded-md bg-muted/40 p-2 text-[11px]">
                    {Object.keys(ev.details).length > 0 && (
                      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">
                        {JSON.stringify(ev.details, null, JSON_INDENT)}
                      </pre>
                    )}
                    {ev.conversationId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 self-start px-2 text-[11px]"
                        onClick={() => onSelectConversation(ev.conversationId!)}
                      >
                        {t('Open conversation')}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })
        )}
      </ol>
    </section>
  );
}
