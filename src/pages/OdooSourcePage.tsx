import { WorkspacePermission } from '@/api/schema';
import { ErrorState } from '@/components/feedback/ErrorState';
import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { ListSkeleton } from '@/components/lists/ListSkeleton';
import { OdooConnectionForm, OdooSyncPanel, useOdooConnection } from '@/features/odoo';
import { hasPermission, type Workspace } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';

function OdooSourceContent({ workspace }: { workspace: Workspace }) {
  const { t } = useI18n();
  const canManage = hasPermission(workspace, WorkspacePermission.channels_manage);
  const query = useOdooConnection(workspace.id);

  if (query.isError) {
    return (
      <ErrorState title={t('Could not be loaded')} error={query.error} onRetry={query.refetch} />
    );
  }

  if (query.isPending) {
    return <ListSkeleton label={t('Loading...')} />;
  }

  const connection = query.data.connection;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <OdooConnectionForm
        key={`${connection?.id ?? 'new'}-${connection?.connectedAt ?? ''}-${connection?.status ?? ''}`}
        workspaceId={workspace.id}
        connection={connection}
        canManage={canManage}
      />
      {connection && (
        <OdooSyncPanel workspaceId={workspace.id} connection={connection} canManage={canManage} />
      )}
    </div>
  );
}

export function OdooSourcePage() {
  return (
    <WorkspaceGate>{(workspace) => <OdooSourceContent workspace={workspace} />}</WorkspaceGate>
  );
}
