import { useMutation } from '@tanstack/react-query';
import { api, fetchClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { useInvalidateEndpoints } from '@/hooks/useInvalidateEndpoints';
import {
  AI_CONFIG_ENDPOINT,
  AI_CONFIG_MODELS_ENDPOINT,
  AI_CONFIG_TEST_ENDPOINT,
  AI_SETTINGS_FEEDBACK,
  AI_STATUS_ENDPOINT,
} from '../ai-settings.constants';
import type {
  AiConfig,
  ListAiModelsBody,
  ListAiModelsResult,
  SaveAiConfigBody,
  TestAiConfigBody,
  TestAiConfigResult,
} from '../ai-settings.types';

const AI_ENDPOINTS = [AI_CONFIG_ENDPOINT, AI_STATUS_ENDPOINT] as const;

export function useAiConfig(workspaceId: string | undefined) {
  return api.useQuery(
    'get',
    AI_CONFIG_ENDPOINT,
    { params: { path: { workspaceId: workspaceId ?? '' } } },
    { enabled: Boolean(workspaceId) },
  );
}

export function useSaveAiConfig(workspaceId: string) {
  const refresh = useInvalidateEndpoints(AI_ENDPOINTS);
  return useMutation<AiConfig, Error, SaveAiConfigBody>({
    meta: { inlineError: true, successMessage: AI_SETTINGS_FEEDBACK.saved },
    mutationFn: (body) =>
      unwrap(
        fetchClient.PUT(AI_CONFIG_ENDPOINT, {
          params: { path: { workspaceId } },
          body,
        }),
      ),
    onSuccess: refresh,
  });
}

export function useTestAiConfig(workspaceId: string) {
  const refresh = useInvalidateEndpoints(AI_ENDPOINTS);
  return useMutation<TestAiConfigResult, Error, TestAiConfigBody>({
    meta: { inlineError: true },
    mutationFn: (body) =>
      unwrap(
        fetchClient.POST(AI_CONFIG_TEST_ENDPOINT, {
          params: { path: { workspaceId } },
          body,
        }),
      ),
    onSuccess: refresh,
  });
}

export function useListAiModels(workspaceId: string) {
  return useMutation<ListAiModelsResult, Error, ListAiModelsBody>({
    meta: { inlineError: true },
    mutationFn: (body) =>
      unwrap(
        fetchClient.POST(AI_CONFIG_MODELS_ENDPOINT, {
          params: { path: { workspaceId } },
          body,
        }),
      ),
  });
}

export function useClearAiConfig(workspaceId: string) {
  const refresh = useInvalidateEndpoints(AI_ENDPOINTS);
  return useMutation<AiConfig, Error, void>({
    meta: { successMessage: AI_SETTINGS_FEEDBACK.cleared },
    mutationFn: () =>
      unwrap(
        fetchClient.DELETE(AI_CONFIG_ENDPOINT, {
          params: { path: { workspaceId } },
        }),
      ),
    onSuccess: refresh,
  });
}
