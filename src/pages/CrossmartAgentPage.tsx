import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { WorkspacePermission } from '@/api/schema';
import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AgentConsole } from '@/features/agent-console';
import { AGENT_WORKER_COPY } from '@/features/agent-worker';
import { AgentConfigDialog } from '@/features/commercial-agents/AgentConfigDialog';
import {
  type AgentConfigView,
  commercialAgentsApi,
  type InternalAgentKey,
} from '@/features/commercial-agents/api';
import { SalesAgentWorkspace } from '@/features/commercial-agents/SalesAgentWorkspace';
import { AgentTabs } from '@/features/review';
import { hasPermission, useCurrentWorkspace } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';

const DEFAULT_AGENT_CONFIG: Record<InternalAgentKey, AgentConfigView> = {
  crossmart: {
    agentKey: 'crossmart',
    aiConnectionId: null,
    model: null,
    chatwootConnectionId: null,
    authorizedInboxIds: [],
    commercialPolicy: {},
    salesMode: 'DISABLED',
    updatedAt: null,
  },
  sales: {
    agentKey: 'sales',
    aiConnectionId: null,
    model: null,
    chatwootConnectionId: null,
    authorizedInboxIds: [],
    commercialPolicy: {},
    salesMode: 'DISABLED',
    updatedAt: null,
  },
};

/**
 * Agent workspace: opens directly into Crossmart Agent with a compact agent selector
 * (`Crossmart Agent` / `Sales Agent`) and a discrete gear icon for per-agent model & commercial settings.
 */
export function CrossmartAgentPage() {
  const { t } = useI18n();
  const { workspace } = useCurrentWorkspace();
  const [selectedAgent, setSelectedAgent] = useState<InternalAgentKey>('crossmart');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: configs = [] } = useQuery({
    queryKey: ['internal-agent-configs', workspace?.id],
    queryFn: () => commercialAgentsApi.listAgentConfigs(workspace!.id),
    enabled: Boolean(workspace?.id),
  });

  const activeConfig =
    configs.find((cfg) => cfg.agentKey === selectedAgent) ?? DEFAULT_AGENT_CONFIG[selectedAgent];
  const canManage = workspace
    ? hasPermission(workspace, WorkspacePermission.workspace_manage)
    : false;

  return (
    <Page name={t(AGENT_WORKER_COPY.name)} headerHidden>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Select
              value={selectedAgent}
              onValueChange={(value) => setSelectedAgent(value as InternalAgentKey)}
            >
              <SelectTrigger aria-label={t('Active agent')} className="h-8 w-48 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crossmart">{t('Crossmart Agent')}</SelectItem>
                <SelectItem value="sales">{t('Sales Agent')}</SelectItem>
              </SelectContent>
            </Select>

            {canManage && workspace && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                onClick={() => setSettingsOpen(true)}
                aria-label={t('Agent settings')}
                title={t('Agent settings')}
              >
                <Settings className="size-4" />
              </Button>
            )}
          </div>

          {selectedAgent === 'crossmart' && <AgentTabs workspace={workspace} />}
        </div>

        <div className="min-h-0 flex-1">
          <WorkspaceGate>
            {(current) =>
              selectedAgent === 'crossmart' ? (
                <AgentConsole workspaceId={current.id} />
              ) : (
                <SalesAgentWorkspace workspaceId={current.id} config={activeConfig} />
              )
            }
          </WorkspaceGate>
        </div>

        {workspace && settingsOpen && (
          <AgentConfigDialog
            key={`${selectedAgent}:${activeConfig.updatedAt ?? 'init'}`}
            workspaceId={workspace.id}
            agentKey={selectedAgent}
            config={activeConfig}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
          />
        )}
      </div>
    </Page>
  );
}
