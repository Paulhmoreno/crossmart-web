import { useState, type FormEvent } from 'react';
import { CheckCircle2, ChevronDown, Plug, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { OdooConnectionStatus, OdooStockField } from '@/api/schema';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  type OdooConnection,
  type OdooTestResult,
  useDisconnectOdooConnection,
  useTestOdooConnection,
  useUpsertOdooConnection,
} from '../hooks/useOdooSource';
import {
  ODOO_CONNECTION_STATUS_LABELS,
  ODOO_COPY,
  ODOO_STOCK_FIELD_LABELS,
} from '../odoo.constants';

const AUTO_VALUE = '__auto__';

interface OdooConnectionFormProps {
  workspaceId: string;
  connection: OdooConnection | null;
  canManage: boolean;
}

export function OdooConnectionForm({
  workspaceId,
  connection,
  canManage,
}: OdooConnectionFormProps) {
  const [url, setUrl] = useState(connection?.url ?? '');
  const [database, setDatabase] = useState(connection?.database ?? '');
  const [username, setUsername] = useState(connection?.username ?? '');
  const [apiKey, setApiKey] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [warehouseId, setWarehouseId] = useState<string>(
    connection?.settings.warehouseId ? String(connection.settings.warehouseId) : AUTO_VALUE,
  );
  const [pricelistId, setPricelistId] = useState<string>(
    connection?.settings.pricelistId ? String(connection.settings.pricelistId) : AUTO_VALUE,
  );
  const [stockField, setStockField] = useState<OdooStockField>(
    connection?.settings.stockField ?? OdooStockField.free_qty,
  );
  const [brandField, setBrandField] = useState(connection?.settings.brandField ?? '');
  const [customFieldsText, setCustomFieldsText] = useState(
    (connection?.settings.customFields ?? []).join(', '),
  );
  const [syncInterval, setSyncInterval] = useState(
    connection?.settings.syncIntervalMinutes ? String(connection.settings.syncIntervalMinutes) : '',
  );
  const [filterSaleOnly, setFilterSaleOnly] = useState(
    connection?.settings.filterSaleOnly ?? false,
  );
  const [testResult, setTestResult] = useState<OdooTestResult | null>(null);

  const testMutation = useTestOdooConnection(workspaceId);
  const upsertMutation = useUpsertOdooConnection(workspaceId);
  const disconnectMutation = useDisconnectOdooConnection(workspaceId);

  const isConnected = connection?.status === OdooConnectionStatus.CONNECTED;
  const discovered = testResult?.discovered ?? connection?.discovered ?? null;

  function buildAdvancedSettings() {
    const customFields = customFieldsText
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);
    const parsedInterval = syncInterval.trim() ? Number(syncInterval.trim()) : null;
    return {
      warehouseId: warehouseId === AUTO_VALUE ? null : Number(warehouseId),
      pricelistId: pricelistId === AUTO_VALUE ? null : Number(pricelistId),
      stockField,
      brandField: brandField.trim() || null,
      customFields,
      filterSaleOnly,
      syncIntervalMinutes:
        parsedInterval && Number.isFinite(parsedInterval) ? parsedInterval : null,
    };
  }

  async function handleTest() {
    setTestResult(null);
    try {
      const result = await testMutation.mutateAsync({
        url: url.trim() || undefined,
        database: database.trim() || undefined,
        username: username.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
      });
      setTestResult(result);
      if (result.ok && result.discovered) {
        if (!brandField && result.discovered.brandField) {
          setBrandField(result.discovered.brandField);
        }
        toast.success(
          `Conexión verificada: Odoo ${result.discovered.serverVersion} (${result.discovered.productCount} productos activos)`,
        );
      } else {
        toast.error(result.error ?? 'No se pudo conectar con Odoo.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al probar la conexión.');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!url.trim() || !database.trim() || !username.trim()) {
      toast.error('Completa URL, base de datos y usuario de Odoo.');
      return;
    }
    if (!connection?.hasCredentials && !apiKey.trim()) {
      toast.error('Ingresa la clave API de Odoo para conectar.');
      return;
    }
    try {
      const saved = await upsertMutation.mutateAsync({
        url: url.trim(),
        database: database.trim(),
        username: username.trim(),
        apiKey: apiKey.trim() || undefined,
        settings: buildAdvancedSettings(),
      });
      setApiKey('');
      setTestResult(null);
      toast.success(
        isConnected
          ? `Credenciales y configuración de ${saved.displayName} actualizadas.`
          : `Conectado correctamente a ${saved.displayName}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la conexión.');
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectMutation.mutateAsync();
      setApiKey('');
      setTestResult(null);
      toast.success('Odoo desconectado. Los productos importados se conservaron en Crossmart.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo desconectar Odoo.');
    }
  }

  const statusBadgeVariant =
    connection?.status === OdooConnectionStatus.CONNECTED
      ? 'default'
      : connection?.status === OdooConnectionStatus.ERROR
        ? 'destructive'
        : 'secondary';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{ODOO_COPY.connectionTitle}</CardTitle>
            <CardDescription className="mt-1">{ODOO_COPY.connectionDescription}</CardDescription>
          </div>
          {connection && (
            <Badge variant={statusBadgeVariant}>
              {ODOO_CONNECTION_STATUS_LABELS[connection.status]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {connection?.status === OdooConnectionStatus.ERROR && connection.statusReason && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error en la conexión</AlertTitle>
            <AlertDescription>{connection.statusReason}</AlertDescription>
          </Alert>
        )}

        {testResult && (
          <Alert variant={testResult.ok ? 'default' : 'destructive'} className="mb-4">
            {testResult.ok && <CheckCircle2 className="size-4" />}
            <AlertTitle>
              {testResult.ok ? 'Conexión exitosa (solo lectura)' : 'Error de conexión'}
            </AlertTitle>
            <AlertDescription>
              {testResult.ok && testResult.discovered
                ? `Odoo ${testResult.discovered.serverVersion} · Empresa: ${testResult.discovered.companyName ?? database} · Moneda: ${testResult.discovered.currency} · ${testResult.discovered.productCount} productos activos · Almacenes: ${testResult.discovered.warehouses.length} · Tarifas: ${testResult.discovered.pricelists.length}.`
                : (testResult.error ?? 'Verifica las credenciales ingresadas.')}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <fieldset disabled={!canManage} className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="odoo-url">{ODOO_COPY.urlLabel}</FieldLabel>
              <Input
                id="odoo-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={ODOO_COPY.urlPlaceholder}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="odoo-db">{ODOO_COPY.databaseLabel}</FieldLabel>
              <Input
                id="odoo-db"
                value={database}
                onChange={(event) => setDatabase(event.target.value)}
                placeholder={ODOO_COPY.databasePlaceholder}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="odoo-username">{ODOO_COPY.usernameLabel}</FieldLabel>
              <Input
                id="odoo-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={ODOO_COPY.usernamePlaceholder}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="odoo-api-key">{ODOO_COPY.apiKeyLabel}</FieldLabel>
              <Input
                id="odoo-api-key"
                type="password"
                autoComplete="new-password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  connection?.hasCredentials
                    ? ODOO_COPY.apiKeyStoredPlaceholder
                    : ODOO_COPY.apiKeyPlaceholder
                }
              />
            </Field>
          </fieldset>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="-ml-2 w-fit gap-1.5">
                <span>{ODOO_COPY.advancedToggle}</span>
                <ChevronDown
                  className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 rounded-lg border p-4">
              <fieldset disabled={!canManage} className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="odoo-warehouse">{ODOO_COPY.warehouseLabel}</FieldLabel>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger id="odoo-warehouse">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_VALUE}>{ODOO_COPY.warehouseDefault}</SelectItem>
                      {(discovered?.warehouses ?? []).map((warehouse) => (
                        <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                          {warehouse.name} ({warehouse.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="odoo-pricelist">{ODOO_COPY.pricelistLabel}</FieldLabel>
                  <Select value={pricelistId} onValueChange={setPricelistId}>
                    <SelectTrigger id="odoo-pricelist">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_VALUE}>{ODOO_COPY.pricelistDefault}</SelectItem>
                      {(discovered?.pricelists ?? []).map((pricelist) => (
                        <SelectItem key={pricelist.id} value={String(pricelist.id)}>
                          {pricelist.name}
                          {pricelist.currency ? ` (${pricelist.currency})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="odoo-stock-field">{ODOO_COPY.stockFieldLabel}</FieldLabel>
                  <Select
                    value={stockField}
                    onValueChange={(value) => setStockField(value as OdooStockField)}
                  >
                    <SelectTrigger id="odoo-stock-field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(OdooStockField).map((field) => (
                        <SelectItem key={field} value={field}>
                          {ODOO_STOCK_FIELD_LABELS[field]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="odoo-brand-field">{ODOO_COPY.brandFieldLabel}</FieldLabel>
                  <Input
                    id="odoo-brand-field"
                    value={brandField}
                    onChange={(event) => setBrandField(event.target.value)}
                    placeholder="Auto (ej. brand_id)"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="odoo-custom-fields">
                    {ODOO_COPY.customFieldsLabel}
                  </FieldLabel>
                  <Input
                    id="odoo-custom-fields"
                    value={customFieldsText}
                    onChange={(event) => setCustomFieldsText(event.target.value)}
                    placeholder="x_dimensiones, x_garantia"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="odoo-sync-interval">
                    {ODOO_COPY.syncIntervalLabel}
                  </FieldLabel>
                  <Input
                    id="odoo-sync-interval"
                    type="number"
                    min={5}
                    max={1440}
                    value={syncInterval}
                    onChange={(event) => setSyncInterval(event.target.value)}
                    placeholder="Manual"
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field orientation="horizontal">
                    <Switch
                      id="odoo-sale-only"
                      checked={filterSaleOnly}
                      onCheckedChange={setFilterSaleOnly}
                    />
                    <FieldLabel htmlFor="odoo-sale-only" className="font-normal">
                      {ODOO_COPY.saleOnlyLabel}
                    </FieldLabel>
                  </Field>
                  <FieldDescription className="mt-1 text-xs">
                    El mapeo estándar (SKU, EAN, marca, categoría, precio, stock, variantes e
                    imágenes/documentos) se detecta automáticamente.
                  </FieldDescription>
                </div>
              </fieldset>
            </CollapsibleContent>
          </Collapsible>

          {canManage && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleTest()}
                  disabled={testMutation.isPending}
                >
                  <RefreshCw
                    className={`size-4 ${testMutation.isPending ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  {testMutation.isPending ? ODOO_COPY.testingButton : ODOO_COPY.testButton}
                </Button>

                <Button type="submit" disabled={upsertMutation.isPending}>
                  <Plug className="size-4" aria-hidden="true" />
                  {upsertMutation.isPending
                    ? ODOO_COPY.savingButton
                    : isConnected
                      ? ODOO_COPY.updateButton
                      : ODOO_COPY.connectButton}
                </Button>
              </div>

              {isConnected && (
                <ConfirmDialog
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      disabled={disconnectMutation.isPending}
                    >
                      <Unplug className="size-4" aria-hidden="true" />
                      {ODOO_COPY.disconnectButton}
                    </Button>
                  }
                  title={ODOO_COPY.disconnectTitle}
                  description={ODOO_COPY.disconnectDescription}
                  confirmLabel={ODOO_COPY.disconnectConfirm}
                  onConfirm={handleDisconnect}
                />
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
