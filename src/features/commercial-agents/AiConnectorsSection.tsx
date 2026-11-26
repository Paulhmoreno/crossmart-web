import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ChannelConnectionStatus } from '@/api/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { ChannelLogo as ChannelLogoInfo } from '@/features/channels/channels.constants';
import { ChannelLogo } from '@/features/channels/components/ChannelLogo';
import { ConnectionStatusBadge } from '@/features/channels/components/ConnectionStatusBadge';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type AiConnectionView, type AiProviderFamily, commercialAgentsApi } from './api';
import claudeCompatibleLogo from './assets/logos/claude-compatible.svg';
import claudeLogo from './assets/logos/claude.svg';
import geminiLogo from './assets/logos/gemini.svg';
import openaiCompatibleLogo from './assets/logos/openai-compatible.svg';
import openaiLogo from './assets/logos/openai.svg';

interface ProviderFamilyMeta {
  family: AiProviderFamily;
  title: string;
  description: string;
  logo: ChannelLogoInfo;
  needsBaseUrl: boolean;
  defaultBaseUrl: string;
}

const AI_FAMILIES: readonly ProviderFamilyMeta[] = [
  {
    family: 'openai',
    title: 'OpenAI (GPT)',
    description: 'Official OpenAI API for GPT models and tool calling.',
    logo: { src: openaiLogo, tint: 'currentColor' },
    needsBaseUrl: false,
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    family: 'anthropic',
    title: 'Claude (Anthropic)',
    description: 'Official Anthropic Messages API for Claude models.',
    logo: { src: claudeLogo, tint: '#D97757' },
    needsBaseUrl: false,
    defaultBaseUrl: '',
  },
  {
    family: 'gemini',
    title: 'Gemini (Google)',
    description: 'Official Google Gemini API with model discovery and tools.',
    logo: { src: geminiLogo },
    needsBaseUrl: false,
    defaultBaseUrl: '',
  },
  {
    family: 'openai_compatible',
    title: 'OpenAI-compatible',
    description: 'Custom OpenAI-compatible servers, gateways, or local endpoints.',
    logo: { src: openaiCompatibleLogo },
    needsBaseUrl: true,
    defaultBaseUrl: '',
  },
  {
    family: 'anthropic_compatible',
    title: 'Claude-compatible',
    description: 'Anthropic Messages-compatible gateways and self-hosted proxies.',
    logo: { src: claudeCompatibleLogo },
    needsBaseUrl: true,
    defaultBaseUrl: '',
  },
];

function familyHeadlineStatus(
  familyConns: readonly AiConnectionView[],
): ChannelConnectionStatus | 'DISABLED' | null {
  if (familyConns.length === 0) return null;
  if (familyConns.some((conn) => conn.status === 'ERROR')) return ChannelConnectionStatus.ERROR;
  if (familyConns.some((conn) => conn.status === 'CONNECTED')) {
    return ChannelConnectionStatus.CONNECTED;
  }
  return 'DISABLED';
}

function connectionDotClass(status: AiConnectionView['status']): string {
  if (status === 'CONNECTED') return 'bg-emerald-500';
  if (status === 'ERROR') return 'bg-destructive';
  return 'bg-muted-foreground/50';
}

interface AiConnectionDialogProps {
  workspaceId: string;
  family: ProviderFamilyMeta;
  editing: AiConnectionView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AiConnectionDialog({
  workspaceId,
  family,
  editing,
  open,
  onOpenChange,
}: AiConnectionDialogProps) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState(editing?.name ?? family.title);
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl ?? family.defaultBaseUrl);
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState(editing?.defaultModel ?? '');
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? false);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>(
    editing?.availableModels ?? [],
  );
  const [testNote, setTestNote] = useState<string | null>(null);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['ai-connections', workspaceId] });
    void qc.invalidateQueries({ queryKey: ['internal-agent-configs', workspaceId] });
  };

  const discover = useMutation({
    mutationFn: () =>
      commercialAgentsApi.listAiModels(workspaceId, {
        connectionId: editing?.id ?? null,
        provider: family.family,
        baseUrl: family.needsBaseUrl ? baseUrl.trim() : null,
        apiKey: apiKey.trim() || null,
      }),
    onSuccess: (res) => {
      if (res.supported && res.models.length > 0) {
        const ids = res.models.map((item) => item.id);
        setDiscoveredModels(ids);
        if (!defaultModel.trim()) setDefaultModel(ids[0] ?? '');
        toast.success(t('Models loaded from provider'));
      } else {
        toast.info(res.error || t('Enter the model identifier manually.'));
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const test = useMutation({
    mutationFn: () =>
      commercialAgentsApi.testAiConnection(workspaceId, {
        connectionId: editing?.id ?? null,
        provider: family.family,
        baseUrl: family.needsBaseUrl ? baseUrl.trim() : null,
        apiKey: apiKey.trim() || null,
        model: defaultModel.trim(),
      }),
    onSuccess: (res) => {
      if (res.ok) {
        setTestNote(
          `${t('Connected')} (${res.resolvedModel ?? defaultModel} · ${res.latencyMs}ms)`,
        );
        toast.success(t('Connection test succeeded'));
        invalidate();
      } else {
        setTestNote(res.error ?? t('Connection test failed'));
        toast.error(res.error ?? t('Connection test failed'));
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim() || family.title,
        provider: family.family,
        baseUrl: family.needsBaseUrl ? baseUrl.trim() : null,
        apiKey: apiKey.trim() || null,
        defaultModel: defaultModel.trim(),
        availableModels: discoveredModels,
        isDefault,
      };
      return editing
        ? commercialAgentsApi.updateAiConnection(workspaceId, editing.id, payload)
        : commercialAgentsApi.createAiConnection(workspaceId, payload);
    },
    onSuccess: () => {
      toast.success(t('AI connection saved'));
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: () => commercialAgentsApi.deleteAiConnection(workspaceId, editing!.id),
    onSuccess: () => {
      toast.success(t('AI connection deleted'));
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t('Edit AI connection')
              : t('Connect {provider}', { provider: t(family.title) })}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="ai-conn-name">{t('Connection name')}</FieldLabel>
            <Input
              id="ai-conn-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          {family.needsBaseUrl && (
            <Field>
              <FieldLabel htmlFor="ai-conn-url">{t('Base URL')}</FieldLabel>
              <Input
                id="ai-conn-url"
                placeholder="https://api.example.com/v1"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
              />
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="ai-conn-key">{t('API key')}</FieldLabel>
            <Input
              id="ai-conn-key"
              type="password"
              autoComplete="off"
              placeholder={editing?.hasApiKey ? t('Leave blank to keep stored key') : 'sk-...'}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </Field>

          <Field>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="ai-conn-model">{t('Default model')}</FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={discover.isPending}
                onClick={() => discover.mutate()}
              >
                <RefreshCw className="size-3.5" />
                {t('Load models')}
              </Button>
            </div>
            <Input
              id="ai-conn-model"
              list="ai-discovered-models"
              value={defaultModel}
              onChange={(event) => setDefaultModel(event.target.value)}
              placeholder={t('Enter model identifier')}
            />
            {discoveredModels.length > 0 && (
              <datalist id="ai-discovered-models">
                {discoveredModels.map((modelId) => (
                  <option key={modelId} value={modelId} />
                ))}
              </datalist>
            )}
          </Field>

          <Field orientation="horizontal">
            <Switch id="ai-conn-default" checked={isDefault} onCheckedChange={setIsDefault} />
            <FieldLabel htmlFor="ai-conn-default" className="font-normal">
              {t('Use as default workspace AI connection')}
            </FieldLabel>
          </Field>

          {testNote && <p className="text-xs text-muted-foreground">{testNote}</p>}
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={test.isPending || !defaultModel.trim()}
              onClick={() => test.mutate()}
            >
              {t('Test connection')}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                <Trash2 className="size-3.5" />
                {t('Delete')}
              </Button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={save.isPending || !defaultModel.trim()}
            onClick={() => save.mutate()}
          >
            {t('Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** AI provider family cards (5 families), matching native Crossmart store cards. */
export function AiConnectorsSection({
  workspaceId,
  canManage,
}: {
  workspaceId: string;
  canManage: boolean;
}) {
  const { t, tp } = useI18n();
  const [dialogState, setDialogState] = useState<{
    family: ProviderFamilyMeta;
    editing: AiConnectionView | null;
  } | null>(null);

  const { data: connections = [] } = useQuery({
    queryKey: ['ai-connections', workspaceId],
    queryFn: () => commercialAgentsApi.listAiConnections(workspaceId),
  });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AI_FAMILIES.map((family) => {
          const familyConns = connections.filter((conn) => conn.provider === family.family);
          const status = familyHeadlineStatus(familyConns);

          return (
            <Card key={family.family}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <ChannelLogo logo={family.logo} />
                  {status === 'DISABLED' ? (
                    <Badge variant="outline">{t('Disabled')}</Badge>
                  ) : status ? (
                    <ConnectionStatusBadge status={status} />
                  ) : (
                    <Badge variant="outline">{t('Available')}</Badge>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <h2 className="font-medium">{t(family.title)}</h2>
                  <p className="text-sm text-muted-foreground">{t(family.description)}</p>
                </div>

                {familyConns.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm text-muted-foreground">
                      {tp(familyConns.length, '1 connection', '{count} connections')}
                    </p>
                    {familyConns.map((conn) => (
                      <div
                        key={conn.id}
                        className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex min-w-0 items-center gap-2 truncate">
                          <span
                            className={cn(
                              'size-1.5 shrink-0 rounded-full',
                              connectionDotClass(conn.status),
                            )}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 truncate">
                            <span className="font-medium">{conn.name}</span>
                            <span className="text-muted-foreground"> · {conn.defaultModel}</span>
                            {conn.isDefault && (
                              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                                {t('Default')}
                              </Badge>
                            )}
                            {conn.usedByAgents.length > 0 && (
                              <span className="ml-1.5 text-muted-foreground">
                                ({conn.usedByAgents.join(', ')})
                              </span>
                            )}
                          </div>
                        </div>
                        {canManage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 shrink-0 px-2"
                            onClick={() => setDialogState({ family, editing: conn })}
                          >
                            <Settings2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="mt-auto">
                {canManage ? (
                  <Button
                    type="button"
                    variant={familyConns.length > 0 ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => setDialogState({ family, editing: null })}
                  >
                    <Plus data-icon="inline-start" />
                    {familyConns.length > 0 ? t('Add another') : t('Connect')}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('Ask a workspace admin to connect it.')}
                  </p>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {dialogState && (
        <AiConnectionDialog
          key={dialogState.editing?.id ?? dialogState.family.family}
          workspaceId={workspaceId}
          family={dialogState.family}
          editing={dialogState.editing}
          open
          onOpenChange={(open) => {
            if (!open) setDialogState(null);
          }}
        />
      )}
    </>
  );
}
