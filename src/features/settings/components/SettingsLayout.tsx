import { Navigate, Outlet, useLocation } from 'react-router';
import { Page } from '@/components/layout/Page';
import { RouteTabs } from '@/components/navigation/RouteTabs';
import { PAGE_PARENTS } from '@/config/navigation';
import { isBillingEnabled, useBillingAccess } from '@/features/billing';
import { useCurrentWorkspace } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';
import { isPathWithin } from '@/lib/path-match';
import { visibleSettingsTabs } from '../settings-tabs';
import { SETTINGS_COPY } from '../settings.constants';

/** Settings as one page: a tab per section the role can use, each with its own address. */
export function SettingsLayout() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const { workspace } = useCurrentWorkspace();
  const { data: billingAccess } = useBillingAccess(workspace?.id);
  const rawTabs = visibleSettingsTabs(workspace, {
    billingEnabled: isBillingEnabled(billingAccess),
  });
  const tabs = rawTabs.map((tab) => ({ ...tab, label: t(tab.label) }));
  const active = tabs.find((tab) => isPathWithin(pathname, tab.to));

  return (
    <Page
      name={active?.label ?? t(SETTINGS_COPY.pageName)}
      title={t(SETTINGS_COPY.pageName)}
      parents={PAGE_PARENTS.settings}
    >
      <RouteTabs tabs={tabs} label={t(SETTINGS_COPY.tabsLabel)} />
      <Outlet />
    </Page>
  );
}

/** `/settings` opens on the first tab this role can use. */
export function SettingsIndexRedirect() {
  const { workspace } = useCurrentWorkspace();
  const { data: billingAccess } = useBillingAccess(workspace?.id);
  const [first] = visibleSettingsTabs(workspace, {
    billingEnabled: isBillingEnabled(billingAccess),
  });
  if (!workspace || !first) return null;
  return <Navigate to={first.to} replace />;
}
