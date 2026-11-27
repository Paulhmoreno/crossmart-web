import { type ReactNode, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Radio } from 'lucide-react';
import { RelativeTime } from '@/components/time/RelativeTime';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SocialAgentEventView } from './social-api';

type EventFilter = 'all' | 'content' | 'approvals' | 'trypost' | 'errors';

const FILTER_LABELS: Array<{ key: EventFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'content', label: 'Production' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'trypost', label: 'TryPost' },
  { key: 'errors', label: 'Errors' },
];

const SEVERITY_DOT: Record<string, string> = {
  info: 'bg-emerald-500',
  warn: 'bg-warning',
  warning: 'bg-warning',
  error: 'bg-destructive',
};

function matchesFilter(ev: SocialAgentEventView, filter: EventFilter): boolean {
  if (filter === 'all') return true;
  const type = ev.eventType.toLowerCase();
  if (filter === 'errors') return ev.severity === 'error' || ev.severity === 'warn' || type.includes('error');
  if (filter === 'approvals') return type.includes('approv') || type.includes('reject');
  if (filter === 'trypost') return type.includes('trypost') || type.includes('publish');
  if (filter === 'content') {
    return (
      type.includes('item') ||
      type.includes('content') ||
      type.includes('svg') ||
      type.includes('profile') ||
      type.includes('supervisor') ||
      type.includes('policy')
    );
  }
  return true;
}

export function SocialEventsPanel({
  events,
  headerAction,
}: {
  events: SocialAgentEventView[];
  headerAction?: ReactNode;
}) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<EventFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleEvents = useMemo(
    () => events.filter((ev) => matchesFilter(ev, filter)),
    [events, filter],
  );

  return (
    <section
      aria-label={t('Events')}
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <header className="flex flex-col gap-2 border-b px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{t('Events')}</h2>
            <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] font-medium">
              <Radio className="size-2.5 text-emerald-500" />
              {t('Live')}
            </Badge>
          </div>
          {headerAction}
        </div>

        <div className="flex flex-wrap gap-1">
          {FILTER_LABELS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors',
                filter === item.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground',
              )}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {visibleEvents.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {t('No events recorded yet.')}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {visibleEvents.map((ev) => {
              const expanded = expandedId === ev.id;
              return (
                <li
                  key={ev.id}
                  className="rounded-lg border bg-card/60 transition-colors hover:bg-accent/30"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId((prev) => (prev === ev.id ? null : ev.id))}
                    className="flex w-full items-start gap-2 p-2 text-left"
                  >
                    <span
                      className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        SEVERITY_DOT[ev.severity] ?? 'bg-muted-foreground/50',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-medium leading-snug">{ev.summary}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <RelativeTime value={ev.createdAt} />
                        <span>·</span>
                        <span className="truncate font-mono">{ev.eventType}</span>
                      </div>
                    </div>
                    {expanded ? (
                      <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {expanded && (
                    <div className="border-t bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">
                      <p className="break-words text-foreground">{ev.summary}</p>
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span>{t('Event type')}: {ev.eventType}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {ev.severity}
                        </Badge>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
