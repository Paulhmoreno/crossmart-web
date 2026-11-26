import { OdooConnectionStatus, OdooSyncRunStatus } from '@/api/schema';
import odooLogo from '@/features/commercial-agents/assets/logos/odoo.svg';
import { useI18n } from '@/lib/i18n';
import type { OdooConnection } from '../hooks/useOdooSource';

interface OdooCatalogStatusIndicatorProps {
  connection: OdooConnection;
}

type SyncIndicatorTone = 'emerald' | 'amber' | 'red' | 'slate';

function resolveSyncIndicator(connection: OdooConnection): {
  label: string;
  tone: SyncIndicatorTone;
} {
  const runStatus = connection.latestRun?.status;
  if (runStatus === OdooSyncRunStatus.QUEUED || runStatus === OdooSyncRunStatus.RUNNING) {
    return { label: 'Odoo synchronizing', tone: 'amber' };
  }
  if (
    connection.status === OdooConnectionStatus.ERROR ||
    runStatus === OdooSyncRunStatus.FAILED
  ) {
    return { label: 'Sync error', tone: 'red' };
  }
  if (connection.status === OdooConnectionStatus.DISCONNECTED) {
    return { label: 'Update pending', tone: 'amber' };
  }
  if (connection.lastSyncedAt || runStatus === OdooSyncRunStatus.COMPLETED) {
    return { label: 'Odoo synced', tone: 'emerald' };
  }
  return { label: 'Status unverified', tone: 'slate' };
}

const DOT_STYLES: Record<SyncIndicatorTone, string> = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-muted-foreground/50',
};

/**
 * Discrete informational sync status indicator for Products & Stock when Odoo is configured
 * as the exclusive catalog source. Intentionally contains NO manual sync button.
 */
export function OdooCatalogStatusIndicator({ connection }: OdooCatalogStatusIndicatorProps) {
  const { t } = useI18n();
  const { label, tone } = resolveSyncIndicator(connection);

  return (
    <div
      className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground"
      data-testid="odoo-catalog-status-indicator"
    >
      <img src={odooLogo} alt="Odoo" className="h-3.5 w-auto object-contain" />
      <span className={`size-2 shrink-0 rounded-full ${DOT_STYLES[tone]}`} aria-hidden="true" />
      <span>{t(label)}</span>
    </div>
  );
}
