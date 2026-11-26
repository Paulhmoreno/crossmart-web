import { ErrorState } from '@/components/feedback/ErrorState';
import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { ListSkeleton } from '@/components/lists/ListSkeleton';
import { AiSettingsForm, useAiConfig } from '@/features/ai-settings';
import type { Workspace } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';

function AiSettingsContent({ workspace }: { workspace: Workspace }) {
  const { t } = useI18n();
  const query = useAiConfig(workspace.id);

  if (query.isError) {
    return (
      <ErrorState title={t('Could not be loaded')} error={query.error} onRetry={query.refetch} />
    );
  }

  if (query.isPending) {
    return <ListSkeleton label={t('Loading...')} />;
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
