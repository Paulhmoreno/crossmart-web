import { useState } from 'react';
import { Link } from 'react-router';
import { ExternalLink, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { OdooConnectionStatus, OdooSyncMode, OdooSyncRunStatus } from '@/api/schema';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toProductRoute } from '@/config/routes';
import { useI18n } from '@/lib/i18n';
import { type OdooConnection, useOdooPreview, useStartOdooSync } from '../hooks/useOdooSource';
import { ODOO_COPY, ODOO_SYNC_RUN_STATUS_LABELS } from '../odoo.constants';

const PERCENT_MAX = 100;

interface OdooSyncPanelProps {
  workspaceId: string;
  connection: OdooConnection;
  canManage: boolean;
}

export function OdooSyncPanel({ workspaceId, connection, canManage }: OdooSyncPanelProps) {
  const { t, formatDateTime, formatNumber } = useI18n();
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const isConnected = connection.status === OdooConnectionStatus.CONNECTED;
  const previewQuery = useOdooPreview(workspaceId, submittedSearch, isConnected && canManage);
  const startSync = useStartOdooSync(workspaceId);

  const latestRun = connection.latestRun;
  const isRunning =
    latestRun?.status === OdooSyncRunStatus.QUEUED ||
    latestRun?.status === OdooSyncRunStatus.RUNNING;
  const progressPercent =
    latestRun && latestRun.totalCount > 0
      ? Math.round((latestRun.processedCount / latestRun.totalCount) * PERCENT_MAX)
      : 0;

  function toggleTemplate(templateId: number) {
    setSelectedIds((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId],
    );
  }

  async function handleSyncSelected() {
    if (selectedIds.length === 0) return;
    try {
      await startSync.mutateAsync({
        mode: OdooSyncMode.SELECTED,
        filter: { templateIds: selectedIds },
      });
      toast.success(t('Sync started'));
      setSelectedIds([]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('Something went wrong. Please try again.'),
      );
    }
  }

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label={t('Synced products')}
          value={formatNumber(connection.syncedProductCount)}
        />
        <StatCard
          label={t('Last synced')}
          value={connection.lastSyncedAt ? formatDateTime(connection.lastSyncedAt) : t('Never')}
        />
        <StatCard label={t('Created')} value={formatNumber(latestRun?.createdCount ?? 0)} />
        <StatCard label={t('Updated')} value={formatNumber(latestRun?.updatedCount ?? 0)} />
        <StatCard label={t('Errors')} value={formatNumber(latestRun?.failedCount ?? 0)} />
      </div>

      {latestRun && isRunning && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
              {t('Syncing')} ({t(ODOO_SYNC_RUN_STATUS_LABELS[latestRun.status])})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Progress value={progressPercent} />
            <p className="text-xs text-muted-foreground">
              {t('Processed')}: {latestRun.processedCount}/{latestRun.totalCount} · {t('Created')}:{' '}
              {latestRun.createdCount} · {t('Updated')}: {latestRun.updatedCount} · {t('Errors')}:{' '}
              {latestRun.failedCount}
            </p>
          </CardContent>
        </Card>
      )}

      {latestRun?.status === OdooSyncRunStatus.FAILED && latestRun.errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>{t('Failed')}</AlertTitle>
          <AlertDescription>{latestRun.errorMessage}</AlertDescription>
        </Alert>
      )}

      {latestRun && latestRun.issues.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>{t('Issues ({count})', { count: latestRun.issues.length })}</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc pl-4 text-xs">
              {latestRun.issues.map((issue) => (
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

      {isConnected && canManage && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>{t(ODOO_COPY.syncTitle)}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void handleSyncSelected()}
                  disabled={selectedIds.length === 0 || startSync.isPending || isRunning}
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  {t(ODOO_COPY.syncSelectedButton)} ({selectedIds.length})
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={startSync.isPending || isRunning}
                    >
                      {t(ODOO_COPY.syncFullButton)}
                    </Button>
                  }
                  title={t(ODOO_COPY.syncFullConfirmTitle)}
                  description={t(ODOO_COPY.syncFullConfirmDescription)}
                  confirmLabel={t(ODOO_COPY.syncFullConfirmAction)}
                  onConfirm={handleSyncFull}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmittedSearch(searchInput);
              }}
            >
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t(ODOO_COPY.searchPlaceholder)}
                className="max-w-md flex-1"
              />
              <Button type="submit" variant="outline" disabled={previewQuery.isFetching}>
                <Search className="size-4" aria-hidden="true" />
                {t(ODOO_COPY.searchButton)}
              </Button>
            </form>

            {previewQuery.isError && (
              <Alert variant="destructive">
                <AlertTitle>{t('Could not be loaded')}</AlertTitle>
                <AlertDescription>
                  {previewQuery.error instanceof Error
                    ? previewQuery.error.message
                    : t('Something went wrong. Please try again.')}
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>ID</TableHead>
                    <TableHead>{t('Product')}</TableHead>
                    <TableHead>SKU / EAN</TableHead>
                    <TableHead className="text-right">{t('Price')}</TableHead>
                    <TableHead className="text-right">{t('Stock')}</TableHead>
                    <TableHead>{t('Media')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewQuery.isPending ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        {t('Loading...')}
                      </TableCell>
                    </TableRow>
                  ) : (previewQuery.data?.items.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        {t('No matching products found in Odoo.')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewQuery.data?.items.map((item) => {
                      const checked = selectedIds.includes(item.templateId);
                      return (
                        <TableRow key={item.templateId}>
                          <TableCell>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleTemplate(item.templateId)}
                              aria-label={item.name}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.templateId}</TableCell>
                          <TableCell className="max-w-xs whitespace-normal">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {[item.brand, item.category].filter(Boolean).join(' · ') || '—'}
                            </p>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <div>SKU: {item.sku ?? '—'}</div>
                            <div className="text-muted-foreground">EAN: {item.barcode ?? '—'}</div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            ${item.listPrice}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.qtyAvailable}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.hasMainImage ? t('Main image') : t('No photo')}
                            {item.documentCount > 0 ? ` · ${item.documentCount}` : ''}
                            {item.variantCount > 1 ? ` · ${item.variantCount} var.` : ''}
                          </TableCell>
                          <TableCell>
                            {item.alreadySynced && item.crossmartProductId ? (
                              <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2">
                                <Link to={toProductRoute(item.crossmartProductId)}>
                                  {t('Synced')}
                                  <ExternalLink className="size-3" aria-hidden="true" />
                                </Link>
                              </Button>
                            ) : (
                              <Badge variant="outline">{t('Pending')}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {connection.recentRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('Sync history')}</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {connection.recentRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="text-xs">{formatDateTime(run.createdAt)}</TableCell>
                      <TableCell className="text-xs">
                        {run.mode === OdooSyncMode.FULL ? t('Full catalog') : t('Selected')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            run.status === OdooSyncRunStatus.FAILED || run.failedCount > 0
                              ? 'destructive'
                              : run.status === OdooSyncRunStatus.COMPLETED
                                ? 'default'
                                : 'secondary'
                          }
                        >
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
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
