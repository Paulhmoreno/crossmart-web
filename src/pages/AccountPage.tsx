import { Page } from '@/components/layout/Page';
import { DeleteAccountCard, useMe } from '@/features/workspaces';
import { AccountPreferencesCard } from '@/features/workspaces/components/AccountPreferencesCard';
import { useI18n } from '@/lib/i18n';

/** The signed-in person's profile: individual preferences and account closure. */
export function AccountPage() {
  const { data: me } = useMe();
  const { t } = useI18n();
  return (
    <Page name={t('Profile')}>
      <div className="flex max-w-2xl flex-col gap-6">
        <AccountPreferencesCard />
        {me && <DeleteAccountCard email={me.email} />}
      </div>
    </Page>
  );
}
