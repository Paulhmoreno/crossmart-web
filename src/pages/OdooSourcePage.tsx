import { ChannelConnectionStatus, OdooConnectionStatus, WorkspacePermission } from '@/api/schema';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Page } from '@/components/layout/Page';
import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { ListSkeleton } from '@/components/lists/ListSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PAGE_PARENTS } from '@/config/navigation';
import { ConnectionStatusBadge } from '@/features/channels/components/ConnectionStatusBadge';
import { OdooConnectionForm, OdooSyncPanel, useOdooConnection } from '@/features/odoo';
import { OdooOperationsCard } from '@/features/odoo/components/OdooOperationsCard';
import { hasPermission, type Workspace } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';

function mapOdooBadgeStatus(
  status: OdooConnectionStatus | undefined,
): ChannelConnectionStatus | null {
  if (status === OdooConnectionStatus.CONNECTED) return ChannelConnectionStatus.CONNECTED;
  if (status === OdooConnectionStatus.ERROR) return ChannelConnectionStatus.ERROR;
  return null;
}

function OdooSourceContent({ workspace }: { workspace: Workspace }) {
  const { t } = useI18n();
  const canManage = hasPermission(workspace, WorkspacePermission.channels_manage);
  const query = useOdooConnection(workspace.id);
  const connection = query.data?.connection ?? null;
  const badgeStatus = mapOdooBadgeStatus(connection?.status);

  return (
    <Page
      name="Odoo"
      parents={PAGE_PARENTS.stores}
      title={
        <>
          <span>Odoo</span>
          {badgeStatus && <ConnectionStatusBadge status={badgeStatus} />}
        </>
      }
      description={connection?.url}
    >
      {query.isError ? (
        <ErrorState title={t('Could not be loaded')} error={query.error} onRetry={query.refetch} />
      ) : query.isPending ? (
        <ListSkeleton label={t('Loading...')} />
      ) : (
        <div className="flex max-w-3xl flex-col gap-6">
          {connection ? (
            <Tabs defaultValue="connection" className="gap-4">
              <TabsList variant="line" className="w-full justify-start border-b">
                <TabsTrigger value="connection">{t('Connection')}</TabsTrigger>
                <TabsTrigger value="sync">{t('Synchronization')}</TabsTrigger>
                <TabsTrigger value="operations">{t('Operations')}</TabsTrigger>
              </TabsList>
              <TabsContent value="connection">
                <OdooConnectionForm
                  key={`${connection.id}-${connection.connectedAt ?? ''}-${connection.status ?? ''}`}
                  workspaceId={workspace.id}
                  connection={connection}
                  canManage={canManage}
                />
              </TabsContent>
              <TabsContent value="sync">
                <OdooSyncPanel
                  workspaceId={workspace.id}
                  connection={connection}
                  canManage={canManage}
                />
              </TabsContent>
              <TabsContent value="operations">
                <OdooOperationsCard workspaceId={workspace.id} />
              </TabsContent>
            </Tabs>
          ) : (
            <OdooConnectionForm
              key="new"
              workspaceId={workspace.id}
              connection={null}
              canManage={canManage}
            />
          )}
        </div>
      )}
    </Page>
  );
}

export function OdooSourcePage() {
  return (
    <WorkspaceGate>{(workspace) => <OdooSourceContent workspace={workspace} />}</WorkspaceGate>
  );
}
