import { useState } from 'react';
import { Link } from 'react-router';
import { ExternalLink, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { OdooConnectionStatus, OdooSyncMode, OdooSyncRunStatus } from '@/api/schema';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { type OdooConnection, useOdooPreview, useStartOdooSync } from '../hooks/useOdooSource';
import { ODOO_COPY, ODOO_SYNC_RUN_STATUS_LABELS } from '../odoo.constants';

const PERCENT_MAX = 100;

interface OdooSyncPanelProps {
  workspaceId: string;
  connection: OdooConnection;
  canManage: boolean;
}

export function OdooSyncPanel({ workspaceId, connection, canManage }: OdooSyncPanelProps) {
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
    if (selectedIds.length === 0) {
      toast.error('Selecciona al menos un producto de Odoo para sincronizar.');
      return;
    }
    try {
      await startSync.mutateAsync({
        mode: OdooSyncMode.SELECTED,
        filter: { templateIds: selectedIds },
      });
      toast.success(
        `Sincronización iniciada para ${selectedIds.length} producto(s) seleccionado(s).`,
      );
      setSelectedIds([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar la sincronización.');
    }
  }

  async function handleSyncFull() {
    try {
      await startSync.mutateAsync({ mode: OdooSyncMode.FULL });
      toast.success('Sincronización completa del catálogo de Odoo iniciada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar la sincronización.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Productos sincronizados"
          value={connection.syncedProductCount.toLocaleString('es-EC')}
        />
        <StatCard
          label="Última sincronización"
          value={
            connection.lastSyncedAt
              ? new Date(connection.lastSyncedAt).toLocaleString('es-EC')
              : 'Nunca'
          }
        />
        <StatCard label="Nuevos (últ. ejecución)" value={String(latestRun?.createdCount ?? 0)} />
        <StatCard
          label="Actualizados (últ. ejecución)"
          value={String(latestRun?.updatedCount ?? 0)}
        />
        <StatCard label="Errores (últ. ejecución)" value={String(latestRun?.failedCount ?? 0)} />
      </div>

      {latestRun && isRunning && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
              Progreso de sincronización ({ODOO_SYNC_RUN_STATUS_LABELS[latestRun.status]})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Progress value={progressPercent} />
            <p className="text-xs text-muted-foreground">
              Procesados: {latestRun.processedCount} de {latestRun.totalCount} · Nuevos:{' '}
              {latestRun.createdCount} · Actualizados: {latestRun.updatedCount} · Errores:{' '}
              {latestRun.failedCount}
            </p>
          </CardContent>
        </Card>
      )}

      {latestRun?.status === OdooSyncRunStatus.FAILED && latestRun.errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>La última sincronización falló</AlertTitle>
          <AlertDescription>{latestRun.errorMessage}</AlertDescription>
        </Alert>
      )}

      {latestRun && latestRun.issues.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>
            Incidencias en la última sincronización ({latestRun.issues.length})
          </AlertTitle>
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
              <div>
                <CardTitle>{ODOO_COPY.syncTitle}</CardTitle>
                <CardDescription className="mt-1">{ODOO_COPY.syncDescription}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void handleSyncSelected()}
                  disabled={selectedIds.length === 0 || startSync.isPending || isRunning}
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  {ODOO_COPY.syncSelectedButton} ({selectedIds.length})
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={startSync.isPending || isRunning}
                    >
                      {ODOO_COPY.syncFullButton}
                    </Button>
                  }
                  title={ODOO_COPY.syncFullConfirmTitle}
                  description={ODOO_COPY.syncFullConfirmDescription}
                  confirmLabel={ODOO_COPY.syncFullConfirmAction}
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
                placeholder={ODOO_COPY.searchPlaceholder}
                className="max-w-md flex-1"
              />
              <Button type="submit" variant="outline" disabled={previewQuery.isFetching}>
                <Search className="size-4" aria-hidden="true" />
                {ODOO_COPY.searchButton}
              </Button>
            </form>

            {previewQuery.isError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo consultar el catálogo de Odoo</AlertTitle>
                <AlertDescription>
                  {previewQuery.error instanceof Error
                    ? previewQuery.error.message
                    : 'Error al leer productos desde Odoo.'}
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>ID</TableHead>
                    <TableHead>Producto en Odoo</TableHead>
                    <TableHead>SKU / EAN</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Recursos</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewQuery.isPending ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Consultando productos en Odoo...
                      </TableCell>
                    </TableRow>
                  ) : (previewQuery.data?.items.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No se encontraron productos con ese criterio.
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
                              aria-label={`Seleccionar ${item.name}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.templateId}</TableCell>
                          <TableCell className="max-w-xs whitespace-normal">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {[item.brand, item.category].filter(Boolean).join(' · ') ||
                                'Sin categoría'}
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
                            {item.hasMainImage ? 'Foto principal' : 'Sin foto'}
                            {item.documentCount > 0 ? ` · ${item.documentCount} adj.` : ''}
                            {item.variantCount > 1 ? ` · ${item.variantCount} var.` : ''}
                          </TableCell>
                          <TableCell>
                            {item.alreadySynced && item.crossmartProductId ? (
                              <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2">
                                <Link to={toProductRoute(item.crossmartProductId)}>
                                  Sincronizado
                                  <ExternalLink className="size-3" aria-hidden="true" />
                                </Link>
                              </Button>
                            ) : (
                              <Badge variant="outline">Pendiente</Badge>
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
            <CardTitle className="text-base">Historial de sincronizaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Modo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Procesados</TableHead>
                    <TableHead className="text-right">Nuevos</TableHead>
                    <TableHead className="text-right">Actualizados</TableHead>
                    <TableHead className="text-right">Errores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connection.recentRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="text-xs">
                        {new Date(run.createdAt).toLocaleString('es-EC')}
                      </TableCell>
                      <TableCell className="text-xs">
                        {run.mode === OdooSyncMode.FULL ? 'Catálogo completo' : 'Selección'}
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
                            ? 'Con incidencias'
                            : ODOO_SYNC_RUN_STATUS_LABELS[run.status]}
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
