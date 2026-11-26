import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { Page } from '@/components/layout/Page';
import { AgentTabs, REVIEW_COPY, ReviewInbox } from '@/features/review';
import { useCurrentWorkspace } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';

/** Agent › Review: AI suggestions and outside agents' proposals waiting for the seller. */
export function AgentReviewPage() {
  const { t } = useI18n();
  const { workspace } = useCurrentWorkspace();
  return (
    <Page name={t(REVIEW_COPY.pageName)} title={t(REVIEW_COPY.agentTitle)}>
      <AgentTabs workspace={workspace} />
      <WorkspaceGate>{(current) => <ReviewInbox workspace={current} />}</WorkspaceGate>
    </Page>
  );
}
