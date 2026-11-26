import { Navigate } from 'react-router';
import { SubscriptionAccessState, WorkspacePermission } from '@/api/schema';
import { PermissionGate } from '@/components/feedback/PermissionGate';
import { ROUTES } from '@/config/routes';
import { BILLING_COPY, BillingOverview, useBillingAccess } from '@/features/billing';
import { useI18n } from '@/lib/i18n';

function BillingSection({
  workspaceId,
  organizationId,
}: {
  workspaceId: string;
  organizationId: string;
}) {
  const { data: access } = useBillingAccess(workspaceId);
  if (access?.state === SubscriptionAccessState.unrestricted) {
    return <Navigate to={ROUTES.settings} replace />;
  }
  return <BillingOverview organizationId={organizationId} />;
}

/** Settings › Billing: the plan, its billing and usage. */
export function BillingPage() {
  const { t } = useI18n();
  return (
    <PermissionGate permission={WorkspacePermission.billing_view} denied={t(BILLING_COPY.noAccess)}>
      {(workspace) => (
        <BillingSection workspaceId={workspace.id} organizationId={workspace.organizationId} />
      )}
    </PermissionGate>
  );
}
