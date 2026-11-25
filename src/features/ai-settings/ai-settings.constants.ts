import { AiConfigStatus, AiProviderName } from '@/api/schema';

export const AI_STATUS_ENDPOINT = '/api/v1/workspaces/{workspaceId}/ai/status';
export const AI_CONFIG_ENDPOINT = '/api/v1/workspaces/{workspaceId}/ai/config';
export const AI_CONFIG_TEST_ENDPOINT = '/api/v1/workspaces/{workspaceId}/ai/config/test';
export const AI_CONFIG_MODELS_ENDPOINT = '/api/v1/workspaces/{workspaceId}/ai/config/models';

export const AI_PROVIDER_LABELS: Record<AiProviderName, string> = {
  [AiProviderName.openai_compatible]: 'OpenAI Compatible',
  [AiProviderName.anthropic]: 'Anthropic',
};

export const AI_CONFIG_STATUS_LABELS: Record<AiConfigStatus, string> = {
  [AiConfigStatus.CONNECTED]: 'Conectado',
  [AiConfigStatus.ERROR]: 'Error',
  [AiConfigStatus.DISABLED]: 'Sin configurar',
};

export const AI_SETTINGS_FEEDBACK = {
  saved: 'Configuración de inteligencia artificial guardada',
  cleared: 'Configuración de inteligencia artificial eliminada',
} as const;
