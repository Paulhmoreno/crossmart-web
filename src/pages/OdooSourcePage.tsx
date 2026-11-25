import { WorkspacePermission } from '@/api/schema';
import { ErrorState } from '@/components/feedback/ErrorState';
import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { ListSkeleton } from '@/components/lists/ListSkeleton';
import { OdooConnectionForm, OdooSyncPanel, useOdooConnection } from '@/features/odoo';
import { hasPermission, type Workspace } from '@/features/workspaces';

function OdooSourceContent({ workspace }: { workspace: Workspace }) {
  const canManage = hasPermission(workspace, WorkspacePermission.channels_manage);
  const query = useOdooConnection(workspace.id);

  if (query.isError) {
    return (
      <ErrorState
        title="No se pudo cargar la configuración de Odoo"
        error={query.error}
        onRetry={query.refetch}
      />
    );
  }

  if (query.isPending) {
    return <ListSkeleton label="Cargando conexión con Odoo" />;
  }

  const connection = query.data.connection;

  return (
    <div className="flex flex-col gap-6">
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
