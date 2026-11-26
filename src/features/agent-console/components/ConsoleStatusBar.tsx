import type { ReactNode } from 'react';
import { RelativeTime } from '@/components/time/RelativeTime';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { AGENT_CONSOLE_COPY, AGENT_CONSOLE_TEST_IDS, AgentState } from '../agent-console.constants';
import type { StoresStatus } from '../console-status';

const { status: COPY } = AGENT_CONSOLE_COPY;

const AGENT_DOT_CLASSES: Record<AgentState, string> = {
  [AgentState.Idle]: 'bg-muted-foreground/50',
  [AgentState.Running]: 'bg-brand motion-safe:animate-pulse',
  [AgentState.Waiting]: 'bg-warning',
  [AgentState.Unavailable]: 'bg-muted-foreground/30',
};

function StatusItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      {/* Figures wrap whole rather than being cut, so each count stays readable. */}
      <dd className="flex flex-wrap items-center gap-x-1.5 text-sm font-medium [&>span]:whitespace-nowrap">
        {children}
      </dd>
    </div>
  );
}

interface ConsoleStatusBarProps {
  stores: StoresStatus;
  agent: AgentState;
}

/** The workspace at a glance, above the map: stores, listings, the agent and the last sync. */
export function ConsoleStatusBar({ stores, agent }: ConsoleStatusBarProps) {
  const { formatNumber, t, tp } = useI18n();
  return (
    <dl
      aria-label={t(COPY.label)}
      data-testid={AGENT_CONSOLE_TEST_IDS.statusBar}
      className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-card px-3 py-2 @lg:grid-cols-4"
    >
      <StatusItem label={t(COPY.stores)}>
        {t('{healthy} of {total} healthy', {
          healthy: formatNumber(stores.healthy),
          total: formatNumber(stores.total),
        })}
      </StatusItem>
      <StatusItem label={t(COPY.listings)}>
        {tp(stores.liveListings, '1 live', '{count} live')}
        {stores.failedListings > 0 && (
          <span className="text-destructive">
            · {t('{count} failed', { count: formatNumber(stores.failedListings) })}
          </span>
        )}
        {stores.needsDetailsListings > 0 && (
          <span className="text-warning">
            · {tp(stores.needsDetailsListings, '{count} needs details', '{count} need details')}
          </span>
        )}
      </StatusItem>
      <StatusItem label={t(COPY.agent)}>
        <span
          className={cn('size-2 shrink-0 rounded-full', AGENT_DOT_CLASSES[agent])}
          aria-hidden="true"
        />
        {t(AGENT_CONSOLE_COPY.agentStates[agent])}
      </StatusItem>
      <StatusItem label={t(COPY.lastSync)}>
        {stores.lastSyncedAt ? <RelativeTime value={stores.lastSyncedAt} /> : t(COPY.never)}
      </StatusItem>
    </dl>
  );
}
