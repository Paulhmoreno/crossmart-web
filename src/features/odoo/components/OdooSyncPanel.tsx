import { useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { OdooConnectionStatus, OdooSyncMode, OdooSyncRunStatus } from '@/api/schema';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/lib/i18n';
import { type OdooConnection, type OdooSyncRun, useStartOdooSync } from '../hooks/useOdooSource';
import { ODOO_COPY, ODOO_SYNC_RUN_STATUS_LABELS } from '../odoo.constants';

const PERCENT_MAX = 100;

interface OdooSyncPanelProps {
  workspaceId: string;
  connection: OdooConnection;
  canManage: boolean;
}

function ActiveSyncCard({ run }: { run: OdooSyncRun }) {
  const { t } = useI18n();
  const progressPercent =
    run.totalCount > 0 ? Math.round((run.processedCount / run.totalCount) * PERCENT_MAX) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          {t('Syncing')} ({t(ODOO_SYNC_RUN_STATUS_LABELS[run.status])})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Progress value={progressPercent} />
        <p className="text-xs text-muted-foreground">
          {t('Processed')}: {run.processedCount}/{run.totalCount} · {t('Created')}:{' '}
          {run.createdCount} · {t('Updated')}: {run.updatedCount} · {t('Errors')}: {run.failedCount}
        </p>
      </CardContent>
    </Card>
  );
}

function SyncAlerts({ run }: { run: OdooSyncRun }) {
  const { t } = useI18n();
  return (
    <>
      {run.status === OdooSyncRunStatus.FAILED && run.errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>{t('Failed')}</AlertTitle>
          <AlertDescription>{run.errorMessage}</AlertDescription>
        </Alert>
      )}
      {run.issues.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>{t('Issues ({count})', { count: run.issues.length })}</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc pl-4 text-xs">
              {run.issues.map((issue) => (
                <li key={`${issue.externalId}-${issue.message}`}>
                  <strong>
                    [{issue.externalId}] {issue.name}:
                  </strong>{' '}
                  {issue.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}

function runStatusVariant(run: OdooSyncRun): 'destructive' | 'default' | 'secondary' {
  if (run.status === OdooSyncRunStatus.FAILED || run.failedCount > 0) return 'destructive';
  if (run.status === OdooSyncRunStatus.COMPLETED) return 'default';
  return 'secondary';
}

function SyncHistoryCard({ runs }: { runs: readonly OdooSyncRun[] }) {
  const { t, formatDateTime } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="group -mx-2 w-fit gap-2 px-2">
              <span className="text-sm font-semibold">{t('Sync history')}</span>
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                ({runs.length})
              </span>
              <ChevronDown
                data-icon="inline-end"
                className="transition-transform group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-2">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Mode')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead className="text-right">{t('Processed')}</TableHead>
                    <TableHead className="text-right">{t('Created')}</TableHead>
                    <TableHead className="text-right">{t('Updated')}</TableHead>
                    <TableHead className="text-right">{t('Errors')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="text-xs">{formatDateTime(run.createdAt)}</TableCell>
                      <TableCell className="text-xs">
                        {run.mode === OdooSyncMode.FULL ? t('Full catalog') : t('Selected')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={runStatusVariant(run)}>
                          {run.status === OdooSyncRunStatus.COMPLETED && run.failedCount > 0
                            ? t('Partial')
                            : t(ODOO_SYNC_RUN_STATUS_LABELS[run.status])}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {run.processedCount}/{run.totalCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{run.createdCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{run.updatedCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{run.failedCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function OdooSyncPanel({ workspaceId, connection, canManage }: OdooSyncPanelProps) {
  const { t } = useI18n();
  const isConnected = connection.status === OdooConnectionStatus.CONNECTED;
  const startSync = useStartOdooSync(workspaceId);

  const latestRun = connection.latestRun;
  const isRunning =
    latestRun?.status === OdooSyncRunStatus.QUEUED ||
    latestRun?.status === OdooSyncRunStatus.RUNNING;

  async function handleSyncFull() {
    try {
      await startSync.mutateAsync({ mode: OdooSyncMode.FULL });
      toast.success(t('Sync started'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('Something went wrong. Please try again.'),
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {latestRun && isRunning && <ActiveSyncCard run={latestRun} />}
      {latestRun && <SyncAlerts run={latestRun} />}

      {isConnected && canManage && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>{t(ODOO_COPY.syncTitle)}</CardTitle>
              <ConfirmDialog
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={startSync.isPending || isRunning}
                  >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    {t(ODOO_COPY.syncFullButton)}
                  </Button>
                }
                title={t(ODOO_COPY.syncFullConfirmTitle)}
                description={t(ODOO_COPY.syncFullConfirmDescription)}
                confirmLabel={t(ODOO_COPY.syncFullConfirmAction)}
                onConfirm={handleSyncFull}
              />
            </div>
          </CardHeader>
        </Card>
      )}

      {connection.recentRuns.length > 0 && <SyncHistoryCard runs={connection.recentRuns} />}
    </div>
  );
}
