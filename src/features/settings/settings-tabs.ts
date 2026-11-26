import { hasPermission, type Workspace } from '@/features/workspaces';
import { SETTINGS_TABS, SettingsTab, type SettingsTabInfo } from './settings.constants';

export interface VisibleSettingsTabsOptions {
  /** Whether commercial billing is active on this instance; false hides the Billing tab. */
  billingEnabled?: boolean;
}

/** The tabs this workspace's role can use; all of them while the workspace is unknown. */
export function visibleSettingsTabs(
  workspace: Workspace | undefined,
  options: VisibleSettingsTabsOptions = {},
): SettingsTabInfo[] {
  const { billingEnabled = true } = options;
  const available = billingEnabled
    ? SETTINGS_TABS
    : SETTINGS_TABS.filter((tab) => tab.tab !== SettingsTab.Billing);
  if (!workspace) return [...available];
  return available.filter(
    (tab) => !tab.anyOf || tab.anyOf.some((permission) => hasPermission(workspace, permission)),
  );
}
