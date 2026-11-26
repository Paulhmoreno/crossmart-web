import { env } from '@/config/env';

export type AiProviderFamily =
  'openai' | 'anthropic' | 'gemini' | 'openai_compatible' | 'anthropic_compatible';

export type SalesAgentMode = 'DISABLED' | 'SUPERVISED' | 'AUTOMATIC';
export type InternalAgentKey = 'crossmart' | 'sales';

export interface AiCapabilities {
  structuredOutput: boolean;
  jsonSchema: boolean;
  streaming: boolean;
  toolCalling: boolean;
  vision: boolean;
  modelsEndpoint: boolean;
}

export interface AiConnectionView {
  id: string;
  name: string;
  provider: AiProviderFamily;
  baseUrl: string | null;
  defaultModel: string;
  availableModels: string[];
  hasApiKey: boolean;
  status: 'CONNECTED' | 'ERROR' | 'DISABLED';
  isDefault: boolean;
  capabilities: AiCapabilities;
  usedByAgents: string[];
  lastError: string | null;
  lastTestedAt: string | null;
}

export interface ChatwootInbox {
  id: number;
  name: string;
  channelType: string;
}

export interface ChatwootConnectionView {
  id: string;
  name: string;
  baseUrl: string;
  accountId: number | null;
  accountName: string | null;
  inboxes: ChatwootInbox[];
  hasApiAccessToken: boolean;
  hasAgentBotToken: boolean;
  hasWebhookSecret: boolean;
  webhookUrl: string;
  status: 'CONNECTED' | 'ERROR' | 'DISABLED';
  lastError: string | null;
  lastTestedAt: string | null;
}

export interface SalesCommercialPolicy {
  businessName?: string | null;
  tone?: string | null;
  paymentNotes?: string | null;
  deliveryNotes?: string | null;
  warrantyNotes?: string | null;
  handoffNotes?: string | null;
}

export interface AgentConfigView {
  agentKey: InternalAgentKey;
  aiConnectionId: string | null;
  model: string | null;
  chatwootConnectionId: string | null;
  authorizedInboxIds: number[];
  commercialPolicy: SalesCommercialPolicy;
  salesMode: SalesAgentMode;
  updatedAt: string | null;
}

export interface SalesConversationSummary {
  id: string;
  source: string;
  externalRef: string | null;
  title: string;
  handoffRequested: boolean;
  handoffReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesMessageView {
  id: string;
  role: string;
  text: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SalesConversationDetail extends SalesConversationSummary {
  messages: SalesMessageView[];
}

const HTTP_NO_CONTENT = 204;

async function apiJson<Result>(url: string, init?: RequestInit): Promise<Result> {
  const res = await fetch(`${env.apiUrl}${url}`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (res.status === HTTP_NO_CONTENT) return undefined as Result;
  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    const msg =
      typeof data.message === 'string'
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join(', ')
          : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as Result;
}

export const commercialAgentsApi = {
  // AI Connections
  listAiConnections: (wsId: string) =>
    apiJson<AiConnectionView[]>(`/api/v1/workspaces/${wsId}/ai/connections`),
  createAiConnection: (wsId: string, body: Record<string, unknown>) =>
    apiJson<AiConnectionView>(`/api/v1/workspaces/${wsId}/ai/connections`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateAiConnection: (wsId: string, id: string, body: Record<string, unknown>) =>
    apiJson<AiConnectionView>(`/api/v1/workspaces/${wsId}/ai/connections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteAiConnection: (wsId: string, id: string) =>
    apiJson<void>(`/api/v1/workspaces/${wsId}/ai/connections/${id}`, { method: 'DELETE' }),
  testAiConnection: (wsId: string, body: Record<string, unknown>) =>
    apiJson<{
      ok: boolean;
      resolvedModel: string | null;
      latencyMs: number;
      capabilities: AiCapabilities;
      error: string | null;
    }>(`/api/v1/workspaces/${wsId}/ai/connections/test`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listAiModels: (wsId: string, body: Record<string, unknown>) =>
    apiJson<{ supported: boolean; models: Array<{ id: string }>; error: string | null }>(
      `/api/v1/workspaces/${wsId}/ai/connections/models`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  // Chatwoot
  listChatwoot: (wsId: string) =>
    apiJson<ChatwootConnectionView[]>(`/api/v1/workspaces/${wsId}/connectors/chatwoot`),
  testChatwoot: (wsId: string, body: Record<string, unknown>) =>
    apiJson<{
      ok: boolean;
      accounts: Array<{ id: number; name: string }>;
      selectedAccountId: number | null;
      inboxes: ChatwootInbox[];
      error: string | null;
    }>(`/api/v1/workspaces/${wsId}/connectors/chatwoot/test`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createChatwoot: (wsId: string, body: Record<string, unknown>) =>
    apiJson<ChatwootConnectionView>(`/api/v1/workspaces/${wsId}/connectors/chatwoot`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateChatwoot: (wsId: string, id: string, body: Record<string, unknown>) =>
    apiJson<ChatwootConnectionView>(`/api/v1/workspaces/${wsId}/connectors/chatwoot/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  refreshChatwootInboxes: (wsId: string, id: string) =>
    apiJson<ChatwootConnectionView>(
      `/api/v1/workspaces/${wsId}/connectors/chatwoot/${id}/refresh-inboxes`,
      { method: 'POST' },
    ),
  deleteChatwoot: (wsId: string, id: string) =>
    apiJson<void>(`/api/v1/workspaces/${wsId}/connectors/chatwoot/${id}`, { method: 'DELETE' }),

  // Internal Agents & Sales Simulator
  listAgentConfigs: (wsId: string) =>
    apiJson<AgentConfigView[]>(`/api/v1/workspaces/${wsId}/internal-agents`),
  updateAgentConfig: (wsId: string, agentKey: InternalAgentKey, body: Record<string, unknown>) =>
    apiJson<AgentConfigView>(`/api/v1/workspaces/${wsId}/internal-agents/${agentKey}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  stopSalesAgent: (wsId: string) =>
    apiJson<AgentConfigView>(`/api/v1/workspaces/${wsId}/internal-agents/sales/stop`, {
      method: 'POST',
    }),
  listSalesConversations: (wsId: string) =>
    apiJson<SalesConversationSummary[]>(`/api/v1/workspaces/${wsId}/sales-agent/conversations`),
  createSalesConversation: (wsId: string, title?: string) =>
    apiJson<SalesConversationDetail>(`/api/v1/workspaces/${wsId}/sales-agent/conversations`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  getSalesConversation: (wsId: string, id: string) =>
    apiJson<SalesConversationDetail>(`/api/v1/workspaces/${wsId}/sales-agent/conversations/${id}`),
  sendSimulatedBuyerMessage: (wsId: string, id: string, text: string) =>
    apiJson<SalesConversationDetail>(
      `/api/v1/workspaces/${wsId}/sales-agent/conversations/${id}/messages`,
      { method: 'POST', body: JSON.stringify({ text }) },
    ),
  deleteSalesConversation: (wsId: string, id: string) =>
    apiJson<void>(`/api/v1/workspaces/${wsId}/sales-agent/conversations/${id}`, {
      method: 'DELETE',
    }),
};
