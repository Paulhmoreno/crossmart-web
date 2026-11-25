import { ErrorState } from '@/components/feedback/ErrorState';
import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { ListSkeleton } from '@/components/lists/ListSkeleton';
import { AiSettingsForm, useAiConfig } from '@/features/ai-settings';
import type { Workspace } from '@/features/workspaces';

function AiSettingsContent({ workspace }: { workspace: Workspace }) {
  const query = useAiConfig(workspace.id);

  if (query.isError) {
    return (
      <ErrorState
        title="No se pudo cargar la configuración de inteligencia artificial"
        error={query.error}
        onRetry={query.refetch}
      />
    );
  }

  if (query.isPending) {
    return <ListSkeleton label="Cargando configuración de inteligencia artificial" />;
  }

  const config = query.data;
  return (
    <AiSettingsForm
      key={`${config.source}-${config.provider}-${config.baseUrl ?? ''}-${config.model}-${config.updatedAt ?? ''}`}
      workspaceId={workspace.id}
      config={config}
    />
  );
}

export function AiSettingsPage() {
  return (
    <WorkspaceGate>{(workspace) => <AiSettingsContent workspace={workspace} />}</WorkspaceGate>
  );
}
