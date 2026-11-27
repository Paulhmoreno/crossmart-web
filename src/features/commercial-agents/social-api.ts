import { env } from '@/config/env';

export interface TryPostChannelView {
  id: string;
  name: string;
  platform: string;
  username?: string | null;
  avatarUrl?: string | null;
  status?: string;
}

export interface TryPostConnectionView {
  id: string;
  displayName: string;
  baseUrl: string;
  isSelfHosted: boolean;
  secretMasked: string | null;
  status: string;
  statusReason: string | null;
  remoteWorkspaceName: string | null;
  channels: TryPostChannelView[];
  capabilities: Record<string, boolean>;
  lastTestedAt: string | null;
  lastSyncedAt: string | null;
  updatedAt: string;
}

export interface SocialOperationalNodeView {
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'error' | 'unconfigured';
  summary: string;
  details: Record<string, unknown>;
}

export interface SocialContentItemView {
  id: string;
  kind: string;
  title: string;
  objective: string | null;
  pillar: string | null;
  caption: string;
  productionMode: string;
  productionSpec: Record<string, unknown>;
  status: string;
  contentVersion: number;
  approvedVersion: number | null;
  trypostIdeaId: string | null;
  trypostPostId: string | null;
  targetChannelIds: string[];
  scheduledFor: string | null;
  updatedAt: string;
}

export interface CreativeProfileView {
  id: string;
  name: string;
  objective: string | null;
  instructions: string;
  references: string[];
  restrictions: string[];
  status: string;
  version: number;
}

export interface SocialBudgetPolicyView {
  autonomyMode: 'MANUAL' | 'SUPERVISED' | 'AUTOMATIC';
  paused: boolean;
  autoPublishAuthorized: boolean;
  monthlyLimitUsd: string | number;
  perTaskLimitUsd: string | number;
  maxRegenerationsPerItem: number;
  spentThisMonthUsd: string | number;
  planningFrequency: string;
  timezone: string;
}

export interface SocialAgentEventView {
  id: string;
  eventType: string;
  summary: string;
  severity: string;
  createdAt: string;
}

export interface SocialOverviewResponse {
  agentKey: 'social';
  nodes: SocialOperationalNodeView[];
  policy: SocialBudgetPolicyView;
  trypost: TryPostConnectionView | null;
  opportunities: {
    totalProducts: number;
    inStockProducts: number;
    topCategories: string[];
    opportunities: Array<{
      type: string;
      title: string;
      rationale: string;
      suggestedPillar: string;
      price?: number | null;
      availableStock?: number | null;
      verifiableMarginPct?: number | null;
    }>;
  };
  profiles: CreativeProfileView[];
  items: SocialContentItemView[];
  events: SocialAgentEventView[];
}

async function jsonReq<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const socialMarketingApi = {
  getTryPost: (wsId: string) =>
    jsonReq<{ connection: TryPostConnectionView | null }>(
      `/api/v1/workspaces/${wsId}/connectors/trypost`,
    ),
  testTryPost: (wsId: string, body: { baseUrl?: string; apiKey?: string }) =>
    jsonReq<{ ok: boolean; error: string | null; channels: TryPostChannelView[] }>(
      `/api/v1/workspaces/${wsId}/connectors/trypost/test`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  upsertTryPost: (wsId: string, body: { displayName?: string; baseUrl?: string; apiKey?: string }) =>
    jsonReq<TryPostConnectionView>(`/api/v1/workspaces/${wsId}/connectors/trypost`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  disconnectTryPost: (wsId: string) =>
    jsonReq<TryPostConnectionView>(`/api/v1/workspaces/${wsId}/connectors/trypost`, {
      method: 'DELETE',
    }),
  getTryPostRemoteOverview: (wsId: string) =>
    jsonReq<{
      connected: boolean;
      ideas: Array<Record<string, unknown>>;
      posts: Array<Record<string, unknown>>;
      analytics: Record<string, unknown> | null;
    }>(`/api/v1/workspaces/${wsId}/connectors/trypost/overview`),
  getOverview: (wsId: string) =>
    jsonReq<SocialOverviewResponse>(`/api/v1/workspaces/${wsId}/social-agent/overview`),
  chatSupervisor: (
    wsId: string,
    body: { message: string; history?: Array<{ role: 'user' | 'assistant'; text: string }> },
  ) =>
    jsonReq<{ reply: string; opportunitiesUsed: number }>(
      `/api/v1/workspaces/${wsId}/social-agent/supervisor/chat`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  updatePolicy: (wsId: string, body: Record<string, unknown>) =>
    jsonReq<SocialBudgetPolicyView>(`/api/v1/workspaces/${wsId}/social-agent/policy`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  createItem: (wsId: string, body: Record<string, unknown>) =>
    jsonReq<SocialContentItemView>(`/api/v1/workspaces/${wsId}/social-agent/items`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  approveItem: (wsId: string, itemId: string) =>
    jsonReq<SocialContentItemView>(
      `/api/v1/workspaces/${wsId}/social-agent/items/${itemId}/approve`,
      { method: 'POST' },
    ),
  rejectItem: (wsId: string, itemId: string, reason?: string) =>
    jsonReq<SocialContentItemView>(
      `/api/v1/workspaces/${wsId}/social-agent/items/${itemId}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) },
    ),
  pushToTryPost: (
    wsId: string,
    itemId: string,
    body: { mode: 'idea' | 'draft' | 'scheduled'; channelIds?: string[]; scheduledAt?: string },
  ) =>
    jsonReq<SocialContentItemView>(
      `/api/v1/workspaces/${wsId}/social-agent/items/${itemId}/trypost`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  composeSvg: (
    wsId: string,
    body: {
      headline: string;
      subheadline?: string;
      priceLabel?: string | null;
      ctaLabel?: string;
      aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
      backgroundHex?: string;
      accentHex?: string;
    },
  ) =>
    jsonReq<{ svg: string; width: number; height: number; aspectRatio: string }>(
      `/api/v1/workspaces/${wsId}/social-agent/compose-svg`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  createProfile: (wsId: string, body: { name: string; objective?: string; instructions: string }) =>
    jsonReq<CreativeProfileView>(`/api/v1/workspaces/${wsId}/social-agent/profiles`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  archiveProfile: (wsId: string, profileId: string) =>
    jsonReq<CreativeProfileView>(`/api/v1/workspaces/${wsId}/social-agent/profiles/${profileId}`, {
      method: 'DELETE',
    }),
};
