import { WorkspacePermission } from '@/api/schema';
import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { Page } from '@/components/layout/Page';
import { ChannelGrid, useConnectRedirectToast } from '@/features/channels';
import { AiConnectorsSection } from '@/features/commercial-agents/AiConnectorsSection';
import { ChatwootConnectorSection } from '@/features/commercial-agents/ChatwootConnectorSection';
import { OdooConnectorCard } from '@/features/commercial-agents/OdooConnectorCard';
import { StoreSetupDialog, useStoreSetupParam } from '@/features/store-setup';
import { hasPermission } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';

function ConnectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b pb-2 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Connectors: unified view organized in four discrete sections (Sources, Stores, AI, Communication)
 * preserving the native channel cards, dimensions, dialogs, and OAuth return flows.
 */
export function StoresPage() {
  const { t } = useI18n();
  useConnectRedirectToast();
  const setup = useStoreSetupParam();

  return (
    <Page name={t('Connectors')}>
      <WorkspaceGate>
        {(workspace) => {
          const canManageChannels = hasPermission(workspace, WorkspacePermission.channels_manage);
          const canManageWorkspace = hasPermission(workspace, WorkspacePermission.workspace_manage);
          return (
            <div className="flex flex-col gap-8">
              <ConnectorSection title={t('Sources')}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <OdooConnectorCard workspaceId={workspace.id} />
                </div>
              </ConnectorSection>

              <ConnectorSection title={t('Stores')}>
                <ChannelGrid workspace={workspace} />
              </ConnectorSection>

              <ConnectorSection title={t('AI')}>
                <AiConnectorsSection workspaceId={workspace.id} canManage={canManageWorkspace} />
              </ConnectorSection>

              <ConnectorSection title={t('Communication')}>
                <ChatwootConnectorSection
                  workspaceId={workspace.id}
                  canManage={canManageChannels}
                />
              </ConnectorSection>

              {setup.request && canManageChannels && (
                <StoreSetupDialog
                  workspaceId={workspace.id}
                  request={setup.request}
                  onDone={setup.close}
                />
              )}
            </div>
          );
        }}
      </WorkspaceGate>
    </Page>
  );
}
