import { useState, type FormEvent } from 'react';
import { CheckCircle2, ChevronDown, Plug, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { OdooConnectionStatus, OdooStockField } from '@/api/schema';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/lib/i18n';
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
  const { t, formatNumber } = useI18n();
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
          `${t('Connection verified')}: Odoo ${result.discovered.serverVersion} (${formatNumber(result.discovered.productCount)})`,
        );
      } else {
        toast.error(result.error ?? t('Connection failed'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('Connection failed'));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!url.trim() || !database.trim() || !username.trim()) {
      toast.error(t('Enter Odoo URL, database, and username.'));
      return;
    }
    if (!connection?.hasCredentials && !apiKey.trim()) {
      toast.error(t('Enter your Odoo API key'));
      return;
    }
    try {
      await upsertMutation.mutateAsync({
        url: url.trim(),
        database: database.trim(),
        username: username.trim(),
        apiKey: apiKey.trim() || undefined,
        settings: buildAdvancedSettings(),
      });
      setApiKey('');
      setTestResult(null);
      toast.success(isConnected ? t('Odoo credentials updated') : t('Odoo connected'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('Something went wrong. Please try again.'),
      );
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectMutation.mutateAsync();
      setApiKey('');
      setTestResult(null);
      toast.success(t('Odoo disconnected'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('Something went wrong. Please try again.'),
      );
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
          <CardTitle>{t(ODOO_COPY.connectionTitle)}</CardTitle>
          {connection && (
            <Badge variant={statusBadgeVariant}>
              {t(ODOO_CONNECTION_STATUS_LABELS[connection.status])}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {connection?.status === OdooConnectionStatus.ERROR && connection.statusReason && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>{t('Connection failed')}</AlertTitle>
            <AlertDescription>{connection.statusReason}</AlertDescription>
          </Alert>
        )}

        {testResult && (
          <Alert variant={testResult.ok ? 'default' : 'destructive'} className="mb-4">
            {testResult.ok && <CheckCircle2 className="size-4" />}
            <AlertTitle>
              {testResult.ok ? t('Connection verified') : t('Connection failed')}
            </AlertTitle>
            <AlertDescription>
              {testResult.ok && testResult.discovered
                ? `Odoo ${testResult.discovered.serverVersion} · ${testResult.discovered.companyName ?? database} · ${testResult.discovered.currency} · ${formatNumber(testResult.discovered.productCount)}`
                : (testResult.error ?? t('Something went wrong. Please try again.'))}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <fieldset disabled={!canManage} className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="odoo-url">{t(ODOO_COPY.urlLabel)}</FieldLabel>
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
              <FieldLabel htmlFor="odoo-db">{t(ODOO_COPY.databaseLabel)}</FieldLabel>
              <Input
                id="odoo-db"
                value={database}
                onChange={(event) => setDatabase(event.target.value)}
                placeholder={ODOO_COPY.databasePlaceholder}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="odoo-username">{t(ODOO_COPY.usernameLabel)}</FieldLabel>
              <Input
                id="odoo-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={ODOO_COPY.usernamePlaceholder}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="odoo-api-key">{t(ODOO_COPY.apiKeyLabel)}</FieldLabel>
              <Input
                id="odoo-api-key"
                type="password"
                autoComplete="new-password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  connection?.hasCredentials
                    ? t(ODOO_COPY.apiKeyStoredPlaceholder)
                    : t(ODOO_COPY.apiKeyPlaceholder)
                }
              />
            </Field>
          </fieldset>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="-ml-2 w-fit gap-1.5">
                <span>{t(ODOO_COPY.advancedToggle)}</span>
                <ChevronDown
                  className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 rounded-lg border p-4">
              <fieldset disabled={!canManage} className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="odoo-warehouse">{t(ODOO_COPY.warehouseLabel)}</FieldLabel>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger id="odoo-warehouse">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_VALUE}>{t(ODOO_COPY.warehouseDefault)}</SelectItem>
                      {(discovered?.warehouses ?? []).map((warehouse) => (
                        <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                          {warehouse.name} ({warehouse.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="odoo-pricelist">{t(ODOO_COPY.pricelistLabel)}</FieldLabel>
                  <Select value={pricelistId} onValueChange={setPricelistId}>
                    <SelectTrigger id="odoo-pricelist">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_VALUE}>{t(ODOO_COPY.pricelistDefault)}</SelectItem>
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
                  <FieldLabel htmlFor="odoo-stock-field">{t(ODOO_COPY.stockFieldLabel)}</FieldLabel>
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
                          {t(ODOO_STOCK_FIELD_LABELS[field])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="odoo-brand-field">{t(ODOO_COPY.brandFieldLabel)}</FieldLabel>
                  <Input
                    id="odoo-brand-field"
                    value={brandField}
                    onChange={(event) => setBrandField(event.target.value)}
                    placeholder="brand_id"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="odoo-custom-fields">
                    {t(ODOO_COPY.customFieldsLabel)}
                  </FieldLabel>
                  <Input
                    id="odoo-custom-fields"
                    value={customFieldsText}
                    onChange={(event) => setCustomFieldsText(event.target.value)}
                    placeholder="x_field_1, x_field_2"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="odoo-sync-interval">
                    {t(ODOO_COPY.syncIntervalLabel)}
                  </FieldLabel>
                  <Input
                    id="odoo-sync-interval"
                    type="number"
                    min={5}
                    max={1440}
                    value={syncInterval}
                    onChange={(event) => setSyncInterval(event.target.value)}
                    placeholder={t('Manual')}
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
                      {t(ODOO_COPY.saleOnlyLabel)}
                    </FieldLabel>
                  </Field>
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
                  {testMutation.isPending ? t(ODOO_COPY.testingButton) : t(ODOO_COPY.testButton)}
                </Button>

                <Button type="submit" disabled={upsertMutation.isPending}>
                  <Plug className="size-4" aria-hidden="true" />
                  {upsertMutation.isPending
                    ? t(ODOO_COPY.savingButton)
                    : isConnected
                      ? t(ODOO_COPY.updateButton)
                      : t(ODOO_COPY.connectButton)}
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
                      {t(ODOO_COPY.disconnectButton)}
                    </Button>
                  }
                  title={t(ODOO_COPY.disconnectTitle)}
                  description={t(ODOO_COPY.disconnectDescription)}
                  confirmLabel={t(ODOO_COPY.disconnectConfirm)}
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
