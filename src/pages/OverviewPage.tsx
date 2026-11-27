import { History, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { WorkspacePermission } from '@/api/schema';
import { ContentLoader } from '@/components/feedback/ContentLoader';
import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { NeedsAttention } from '@/features/attention';
import { useSession } from '@/features/auth';
import { useOdooConnection } from '@/features/odoo';
import { useHasOrders } from '@/features/orders';
import { GettingStarted, SalesEmptyState, useOnboarding } from '@/features/overview';
import { SalesOverview } from '@/features/sales';
import { hasPermission, useCurrentWorkspace, type Workspace } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';

/**
 * What needs the seller first, then the first steps while setup is unfinished, then sales.
 * Stock value lives on Products › Stock, and listing problems in the list at the top.
 */
function OverviewContent({ workspace }: { workspace: Workspace }) {
  const { state: onboarding, isComplete } = useOnboarding(workspace.id);
  const hasOrders = useHasOrders(workspace.id);
  if (isComplete === undefined || hasOrders === undefined) return <ContentLoader />;
  return (
    <>
      <NeedsAttention workspaceId={workspace.id} />
      {!isComplete && <GettingStarted {...onboarding} />}
      {hasOrders ? <SalesOverview workspaceId={workspace.id} /> : <SalesEmptyState />}
    </>
  );
}

function HomeActions() {
  const { t } = useI18n();
  const { workspace } = useCurrentWorkspace();
  const odooQuery = useOdooConnection(workspace?.id ?? '');
  const isOdooExclusive = Boolean(odooQuery.data?.connection);
  const canCreateNative =
    Boolean(workspace) &&
    !isOdooExclusive &&
    hasPermission(workspace!, WorkspacePermission.products_edit);

  return (
    <>
      <Button variant="outline" asChild>
        <Link to={ROUTES.activity}>
          <History data-icon="inline-start" />
          {t('Activity')}
        </Link>
      </Button>
      {canCreateNative && (
        <Button asChild>
          <Link to={ROUTES.newProduct}>
            <Plus data-icon="inline-start" />
            {t('Add product')}
          </Link>
        </Button>
      )}
    </>
  );
}

/** Home: what needs attention, the first steps, and sales. */
export function OverviewPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const firstName = session?.user.name.split(' ')[0];

  return (
    <Page
      name={t('Home')}
      title={firstName ? t('Welcome, {name}', { name: firstName }) : t('Home')}
      actions={<HomeActions />}
    >
      <WorkspaceGate>{(workspace) => <OverviewContent workspace={workspace} />}</WorkspaceGate>
    </Page>
  );
}
