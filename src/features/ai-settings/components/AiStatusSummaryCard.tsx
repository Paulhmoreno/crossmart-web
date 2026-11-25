import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { AiConfigSource, AiConfigStatus } from '@/api/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AI_CONFIG_STATUS_LABELS, AI_PROVIDER_LABELS } from '../ai-settings.constants';
import type { AiCapabilities, AiConfig } from '../ai-settings.types';

const CAPABILITY_ITEMS: ReadonlyArray<{ key: keyof AiCapabilities; label: string }> = [
  { key: 'structuredOutput', label: 'Salida estructurada' },
  { key: 'jsonSchema', label: 'JSON Schema estricto' },
  { key: 'streaming', label: 'Streaming' },
  { key: 'toolCalling', label: 'Herramientas' },
  { key: 'modelsEndpoint', label: 'Listado /models' },
  { key: 'vision', label: 'Visión' },
];

function badgeVariant(config: AiConfig): 'default' | 'destructive' | 'secondary' {
  if (!config.configured) return 'secondary';
  if (config.status === AiConfigStatus.ERROR) return 'destructive';
  return 'default';
}

function sourceNote(source: AiConfigSource): string {
  if (source === AiConfigSource.workspace)
    return 'Configuración guardada cifrada en este workspace';
  if (source === AiConfigSource.environment) return 'Usando configuración del servidor (.env)';
  return 'Ningún proveedor configurado todavía';
}

export function CapabilityBadges({ capabilities }: { capabilities: AiCapabilities }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CAPABILITY_ITEMS.map(({ key, label }) => {
        const supported = capabilities[key];
        return (
          <Badge key={key} variant={supported ? 'secondary' : 'outline'} className="text-xs">
            {supported ? '✓ ' : '— '}
            {label}
          </Badge>
        );
      })}
    </div>
  );
}

/** Shows the workspace's active AI connection state, provider, model, capabilities, and last error. */
export function AiStatusSummaryCard({ config }: { config: AiConfig }) {
  const statusLabel = config.configured ? AI_CONFIG_STATUS_LABELS[config.status] : 'Sin configurar';

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" aria-hidden="true" />
            Estado de inteligencia artificial
          </CardTitle>
          <CardDescription>{sourceNote(config.source)}</CardDescription>
        </div>
        <Badge variant={badgeVariant(config)}>{statusLabel}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Proveedor activo</dt>
            <dd className="font-medium">
              {config.configured ? AI_PROVIDER_LABELS[config.provider] : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Modelo activo</dt>
            <dd className="font-mono text-xs font-medium">
              {config.configured ? config.model : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Última verificación</dt>
            <dd className="text-xs">
              {config.lastTestedAt ? new Date(config.lastTestedAt).toLocaleString('es-EC') : '—'}
            </dd>
          </div>
        </dl>

        {config.configured && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">Capacidades verificadas</p>
            <CapabilityBadges capabilities={config.capabilities} />
          </div>
        )}

        {config.lastError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertTitle>Último error registrado</AlertTitle>
            <AlertDescription>{config.lastError}</AlertDescription>
          </Alert>
        )}

        {config.configured && !config.lastError && config.status === AiConfigStatus.CONNECTED && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
            La API, el worker de generación y la consola del agente comparten esta configuración.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
