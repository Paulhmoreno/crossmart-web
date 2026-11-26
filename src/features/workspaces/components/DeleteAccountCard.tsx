import { UserX } from 'lucide-react';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import { useDeleteAccount } from '../hooks/useDeletion';

/** Deletes the user's account and the workspaces only they use; their session ends with it. */
export function DeleteAccountCard({ email }: { email: string }) {
  const remove = useDeleteAccount();
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Delete your account')}</CardTitle>
        <CardDescription>
          {t(
            'Deletes {email} and every workspace only you use, with all its data. Workspaces you share stay with their other members. If you own a workspace others use, delete it or ask to be removed first.',
            { email },
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {remove.error && (
          <Alert variant="destructive">
            <AlertDescription>{remove.error.message}</AlertDescription>
          </Alert>
        )}
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive" className="self-start">
              <UserX data-icon="inline-start" />
              {t('Delete account')}
            </Button>
          }
          title={t('Delete your account?')}
          description={t(
            'Your account and the workspaces only you use are deleted now, with all their data. This cannot be undone.',
          )}
          confirmLabel={t('Delete account')}
          onConfirm={() => remove.mutateAsync()}
        />
      </CardContent>
    </Card>
  );
}
