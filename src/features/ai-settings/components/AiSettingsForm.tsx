import { CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { AiConfigSource, AiProviderName } from '@/api/schema';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { FormError } from '@/components/feedback/FormError';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { AI_PROVIDER_LABELS } from '../ai-settings.constants';
import type { AiConfig, AiModelOption, TestAiConfigResult } from '../ai-settings.types';
import {
  useClearAiConfig,
  useListAiModels,
  useSaveAiConfig,
  useTestAiConfig,
} from '../hooks/useAiConfig';
import { AiStatusSummaryCard, CapabilityBadges } from './AiStatusSummaryCard';

interface AiSettingsFormProps {
  workspaceId: string;
  config: AiConfig;
}

function TestResultBanner({ result }: { result: TestAiConfigResult }) {
  if (!result.ok) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error al probar la conexión</AlertTitle>
        <AlertDescription>
          {result.error ?? 'No se pudo conectar con el proveedor.'}
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <output className="flex flex-col gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-950 dark:text-emerald-100">
      <div className="flex items-center gap-2 font-medium">
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
        Conexión verificada: {result.resolvedModel ?? 'modelo activo'} ({result.latencyMs} ms)
      </div>
      <CapabilityBadges capabilities={result.capabilities} />
    </output>
  );
}

interface ModelPickerProps {
  models: readonly AiModelOption[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
  disabled: boolean;
}

function DiscoveredModelPicker({ models, selectedModel, onSelect, disabled }: ModelPickerProps) {
  if (models.length === 0) return null;
  const knownValue = models.some((item) => item.id === selectedModel) ? selectedModel : '';
  return (
    <Select value={knownValue} onValueChange={onSelect} disabled={disabled}>
      <SelectTrigger aria-label="Modelos disponibles en el proveedor" className="w-full">
        <SelectValue placeholder={`Seleccionar entre ${models.length} modelos disponibles`} />
      </SelectTrigger>
      <SelectContent>
        {models.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Single-screen Spanish AI provider setup using Crossmart's native settings cards and controls. */
export function AiSettingsForm({ workspaceId, config }: AiSettingsFormProps) {
  const defaultProvider =
    config.source === AiConfigSource.none ? AiProviderName.openai_compatible : config.provider;
  const [provider, setProvider] = useState<AiProviderName>(defaultProvider);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl ?? '');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(config.configured ? config.model : '');
  const [discoveredModels, setDiscoveredModels] = useState<AiModelOption[]>([]);
  const [modelsNote, setModelsNote] = useState<string | null>(null);

  const saveConfig = useSaveAiConfig(workspaceId);
  const testConfig = useTestAiConfig(workspaceId);
  const listModels = useListAiModels(workspaceId);
  const clearConfig = useClearAiConfig(workspaceId);

  const isOpenAi = provider === AiProviderName.openai_compatible;
  const isBusy =
    saveConfig.isPending || testConfig.isPending || listModels.isPending || clearConfig.isPending;

  const canSubmit = model.trim().length > 0 && (!isOpenAi || baseUrl.trim().length > 0);

  function buildPayload() {
    const trimmedKey = apiKey.trim();
    return {
      provider,
      baseUrl: isOpenAi ? baseUrl.trim() : null,
      ...(trimmedKey ? { apiKey: trimmedKey } : {}),
      model: model.trim(),
    };
  }

  function handleProviderChange(next: string) {
    const nextProvider =
      next === AiProviderName.anthropic
        ? AiProviderName.anthropic
        : AiProviderName.openai_compatible;
    setProvider(nextProvider);
    setDiscoveredModels([]);
    setModelsNote(null);
    testConfig.reset();
    saveConfig.reset();
  }

  async function handleFetchModels() {
    setModelsNote(null);
    const trimmedKey = apiKey.trim();
    const res = await listModels.mutateAsync({
      provider,
      baseUrl: isOpenAi ? baseUrl.trim() : null,
      ...(trimmedKey ? { apiKey: trimmedKey } : {}),
    });
    if (res.error) {
      setDiscoveredModels([]);
      setModelsNote(res.error);
      return;
    }
    if (!res.supported) {
      setDiscoveredModels([]);
      setModelsNote(
        'Este servidor no expone /models. Puedes escribir el identificador del modelo manualmente.',
      );
      return;
    }
    setDiscoveredModels(res.models);
    setModelsNote(
      res.models.length > 0
        ? `Se encontraron ${res.models.length} modelos disponibles.`
        : 'El servidor respondió sin modelos listados; ingresa el identificador manualmente.',
    );
  }

  function handleTest() {
    if (!canSubmit) return;
    saveConfig.reset();
    testConfig.mutate(buildPayload());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    saveConfig.mutate(buildPayload(), {
      onSuccess: () => setApiKey(''),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <AiStatusSummaryCard config={config} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proveedor y modelo de inteligencia artificial</CardTitle>
          <CardDescription>
            Configura Anthropic o cualquier servidor compatible con OpenAI Chat Completions (OpenAI,
            OpenRouter, DeepSeek, Groq, servidores privados u Ollama). Las claves se cifran en el
            servidor y nunca se exponen en el navegador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FormError error={saveConfig.error ?? testConfig.error ?? listModels.error} />
            {testConfig.data && <TestResultBanner result={testConfig.data} />}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="ai-provider">Proveedor</FieldLabel>
                <Select value={provider} onValueChange={handleProviderChange} disabled={isBusy}>
                  <SelectTrigger id="ai-provider" className="w-full">
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AiProviderName.openai_compatible}>
                      {AI_PROVIDER_LABELS[AiProviderName.openai_compatible]}
                    </SelectItem>
                    <SelectItem value={AiProviderName.anthropic}>
                      {AI_PROVIDER_LABELS[AiProviderName.anthropic]}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {isOpenAi && (
                <Field>
                  <FieldLabel htmlFor="ai-base-url">URL base de la API</FieldLabel>
                  <Input
                    id="ai-base-url"
                    type="url"
                    value={baseUrl}
                    onChange={(event) => {
                      setBaseUrl(event.target.value);
                      testConfig.reset();
                    }}
                    placeholder="https://api.openai.com/v1"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isBusy}
                    required
                  />
                  <FieldDescription>
                    Usa HTTPS para servicios externos. HTTP está permitido únicamente para
                    servidores locales o privados configurados por un administrador.
                  </FieldDescription>
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="ai-api-key">API Key</FieldLabel>
                <Input
                  id="ai-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => {
                    setApiKey(event.target.value);
                    testConfig.reset();
                  }}
                  placeholder={
                    config.hasApiKey && config.provider === provider
                      ? 'Mantener API Key guardada (escribe una nueva para reemplazarla)'
                      : 'sk-...'
                  }
                  autoComplete="new-password"
                  spellCheck={false}
                  disabled={isBusy}
                />
                <FieldDescription>
                  Se almacena cifrada con EnvelopeEncryption y nunca vuelve al navegador.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="ai-model">Modelo</FieldLabel>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input
                      id="ai-model"
                      value={model}
                      onChange={(event) => {
                        setModel(event.target.value);
                        testConfig.reset();
                      }}
                      placeholder={isOpenAi ? 'gpt-4o-mini' : 'claude-sonnet-4-6'}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={isBusy}
                      required
                    />
                    {isOpenAi && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleFetchModels()}
                        disabled={isBusy || baseUrl.trim().length === 0}
                      >
                        {listModels.isPending ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <RefreshCw data-icon="inline-start" />
                        )}
                        Consultar modelos
                      </Button>
                    )}
                  </div>
                  <DiscoveredModelPicker
                    models={discoveredModels}
                    selectedModel={model}
                    onSelect={(nextModel) => {
                      setModel(nextModel);
                      testConfig.reset();
                    }}
                    disabled={isBusy}
                  />
                  {modelsNote && <p className="text-xs text-muted-foreground">{modelsNote}</p>}
                </div>
                <FieldDescription>
                  Siempre puedes escribir manualmente el identificador exacto del modelo.
                </FieldDescription>
              </Field>
            </FieldGroup>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div>
                {config.source === AiConfigSource.workspace && (
                  <ConfirmDialog
                    trigger={
                      <Button type="button" variant="outline" size="sm" disabled={isBusy}>
                        <Trash2 data-icon="inline-start" />
                        Limpiar configuración
                      </Button>
                    }
                    title="¿Eliminar la configuración de IA?"
                    description="Se borrará la API Key cifrada de este workspace. Las funciones de generación y la consola del agente quedarán inactivas hasta volver a configurar un proveedor."
                    confirmLabel="Eliminar configuración"
                    onConfirm={async () => {
                      await clearConfig.mutateAsync();
                    }}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTest}
                  disabled={isBusy || !canSubmit}
                >
                  {testConfig.isPending && <Spinner data-icon="inline-start" />}
                  Probar conexión
                </Button>
                <Button type="submit" disabled={isBusy || !canSubmit}>
                  {saveConfig.isPending && <Spinner data-icon="inline-start" />}
                  Guardar configuración
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
