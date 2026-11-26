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
  agentBotReady: boolean;
  webhookAuthReady: boolean;
  operationalReady: boolean;
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

export interface SalesChannelContext {
  channelType?: string | null;
  channelSlug?: string | null;
  inboxId?: number | null;
  inboxName?: string | null;
  conversationId?: number | null;
  messageId?: number | string | null;
  contactId?: number | null;
  contactName?: string | null;
  listingId?: string | null;
  productRef?: string | null;
  sku?: string | null;
  platformMetadata?: Record<string, unknown>;
}

export interface SalesConversationSummary {
  id: string;
  source: 'supervisor' | 'simulator' | 'chatwoot' | string;
  externalRef: string | null;
  channelType: string | null;
  inboxId: number | null;
  inboxName: string | null;
  contactName: string | null;
  context: SalesChannelContext;
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

export interface SalesKnowledgeEntryView {
  id: string;
  category: string;
  scope: string;
  title: string;
  content: string;
  status: 'ACTIVE' | 'ARCHIVED';
  source: string;
  version: number;
  approvedAt: string;
  updatedAt: string;
}

export interface SalesLearningProposalView {
  id: string;
  category: string;
  scope: string;
  title: string;
  proposedContent: string;
  rationale: string | null;
  originType: string;
  originConversationId: string | null;
  originMessageId: string | null;
  targetEntryId: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedAt: string | null;
  createdAt: string;
}

export interface SalesEventView {
  id: string;
  type: string;
  channelType: string | null;
  conversationId: string | null;
  summary: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export type SalesNodeHealth = 'healthy' | 'warning' | 'error' | 'unconfigured';

export interface SalesOperationalNode {
  id: string;
  label: string;
  status: SalesNodeHealth;
  detail: string;
  meta: Record<string, unknown>;
}

export interface SalesOperationalOverview {
  nodes: SalesOperationalNode[];
  metrics: {
    authorizedProducts: number;
    inStockProducts: number;
    realConversations: number;
    repliesSent: number;
    handoffs: number;
    approvedKnowledge: number;
    pendingProposals: number;
    salesMode: SalesAgentMode;
  };
  events: SalesEventView[];
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
  getSalesOverview: (wsId: string) =>
    apiJson<SalesOperationalOverview>(`/api/v1/workspaces/${wsId}/sales-agent/overview`),
  listSalesEvents: (wsId: string) =>
    apiJson<SalesEventView[]>(`/api/v1/workspaces/${wsId}/sales-agent/events`),
  listSalesConversations: (wsId: string, source?: 'supervisor' | 'simulator' | 'chatwoot') =>
    apiJson<SalesConversationSummary[]>(
      `/api/v1/workspaces/${wsId}/sales-agent/conversations${source ? `?source=${source}` : ''}`,
    ),
  createSalesConversation: (
    wsId: string,
    body?: { source?: 'supervisor' | 'simulator'; title?: string; context?: SalesChannelContext },
  ) =>
    apiJson<SalesConversationDetail>(`/api/v1/workspaces/${wsId}/sales-agent/conversations`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),
  getSalesConversation: (wsId: string, id: string) =>
    apiJson<SalesConversationDetail>(`/api/v1/workspaces/${wsId}/sales-agent/conversations/${id}`),
  sendSalesMessage: (wsId: string, id: string, text: string, context?: SalesChannelContext) =>
    apiJson<SalesConversationDetail>(
      `/api/v1/workspaces/${wsId}/sales-agent/conversations/${id}/messages`,
      { method: 'POST', body: JSON.stringify({ text, ...(context ? { context } : {}) }) },
    ),
  deleteSalesConversation: (wsId: string, id: string) =>
    apiJson<void>(`/api/v1/workspaces/${wsId}/sales-agent/conversations/${id}`, {
      method: 'DELETE',
    }),
  listSalesKnowledge: (wsId: string) =>
    apiJson<SalesKnowledgeEntryView[]>(`/api/v1/workspaces/${wsId}/sales-agent/knowledge`),
  updateSalesKnowledge: (
    wsId: string,
    entryId: string,
    body: { category?: string; scope?: string; title?: string; content?: string },
  ) =>
    apiJson<SalesKnowledgeEntryView>(
      `/api/v1/workspaces/${wsId}/sales-agent/knowledge/${entryId}`,
      { method: 'PUT', body: JSON.stringify(body) },
    ),
  archiveSalesKnowledge: (wsId: string, entryId: string) =>
    apiJson<void>(`/api/v1/workspaces/${wsId}/sales-agent/knowledge/${entryId}`, {
      method: 'DELETE',
    }),
  listLearningProposals: (wsId: string) =>
    apiJson<SalesLearningProposalView[]>(
      `/api/v1/workspaces/${wsId}/sales-agent/learning-proposals`,
    ),
  createLearningProposal: (
    wsId: string,
    body: {
      category: string;
      scope?: string;
      title: string;
      proposedContent: string;
      rationale?: string;
      originType?: 'supervisor_chat' | 'simulation_feedback' | 'conversation_review';
      originConversationId?: string;
      originMessageId?: string;
    },
  ) =>
    apiJson<SalesLearningProposalView>(
      `/api/v1/workspaces/${wsId}/sales-agent/learning-proposals`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  approveLearningProposal: (
    wsId: string,
    proposalId: string,
    body?: { category?: string; scope?: string; title?: string; content?: string },
  ) =>
    apiJson<{ proposal: SalesLearningProposalView; entry: SalesKnowledgeEntryView }>(
      `/api/v1/workspaces/${wsId}/sales-agent/learning-proposals/${proposalId}/approve`,
      { method: 'POST', body: JSON.stringify(body ?? {}) },
    ),
  rejectLearningProposal: (wsId: string, proposalId: string) =>
    apiJson<SalesLearningProposalView>(
      `/api/v1/workspaces/${wsId}/sales-agent/learning-proposals/${proposalId}/reject`,
      { method: 'POST' },
    ),
};
