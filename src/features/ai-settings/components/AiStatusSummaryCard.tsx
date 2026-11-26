import { AlertCircle, Sparkles } from 'lucide-react';
import { AiConfigStatus } from '@/api/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import { AI_CONFIG_STATUS_LABELS, AI_PROVIDER_LABELS } from '../ai-settings.constants';
import type { AiCapabilities, AiConfig } from '../ai-settings.types';

const CAPABILITY_ITEMS: ReadonlyArray<{ key: keyof AiCapabilities; label: string }> = [
  { key: 'structuredOutput', label: 'Structured output' },
  { key: 'jsonSchema', label: 'Strict JSON Schema' },
  { key: 'streaming', label: 'Streaming' },
  { key: 'toolCalling', label: 'Tool calling' },
  { key: 'modelsEndpoint', label: '/models list' },
  { key: 'vision', label: 'Vision' },
];

function badgeVariant(config: AiConfig): 'default' | 'destructive' | 'secondary' {
  if (!config.configured) return 'secondary';
  if (config.status === AiConfigStatus.ERROR) return 'destructive';
  return 'default';
}

export function CapabilityBadges({ capabilities }: { capabilities: AiCapabilities }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5">
      {CAPABILITY_ITEMS.map(({ key, label }) => {
        const supported = capabilities[key];
        return (
          <Badge key={key} variant={supported ? 'secondary' : 'outline'} className="text-xs">
            {supported ? '✓ ' : '— '}
            {t(label)}
          </Badge>
        );
      })}
    </div>
  );
}

/** Shows the workspace's active AI connection state, provider, model, capabilities, and last error. */
export function AiStatusSummaryCard({ config }: { config: AiConfig }) {
  const { t, formatDateTime } = useI18n();
  const statusLabel = config.configured
    ? t(AI_CONFIG_STATUS_LABELS[config.status])
    : t('Not configured');

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4" aria-hidden="true" />
          {t('AI status')}
        </CardTitle>
        <Badge variant={badgeVariant(config)}>{statusLabel}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">{t('Active provider')}</dt>
            <dd className="font-medium">
              {config.configured ? AI_PROVIDER_LABELS[config.provider] : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('Active model')}</dt>
            <dd className="font-mono text-xs font-medium">
              {config.configured ? config.model : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('Last verified')}</dt>
            <dd className="text-xs">
              {config.lastTestedAt ? formatDateTime(config.lastTestedAt) : '—'}
            </dd>
          </div>
        </dl>

        {config.configured && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">{t('Verified capabilities')}</p>
            <CapabilityBadges capabilities={config.capabilities} />
          </div>
        )}

        {config.lastError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertTitle>{t('Last error')}</AlertTitle>
            <AlertDescription>{config.lastError}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
