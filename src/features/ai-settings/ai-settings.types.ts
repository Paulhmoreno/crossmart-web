import type { components } from '@/api/schema';

export type AiConfig = components['schemas']['AiConfigDto'];
export type AiCapabilities = components['schemas']['AiCapabilitiesDto'];
export type SaveAiConfigBody = components['schemas']['SaveAiConfigDto'];
export type TestAiConfigBody = components['schemas']['TestAiConfigDto'];
export type TestAiConfigResult = components['schemas']['TestAiConfigResultDto'];
export type ListAiModelsBody = components['schemas']['ListAiModelsDto'];
export type ListAiModelsResult = components['schemas']['ListAiModelsResultDto'];
export type AiModelOption = components['schemas']['AiModelOptionDto'];
