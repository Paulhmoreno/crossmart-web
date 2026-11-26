import { KeyRound } from 'lucide-react';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { roleLabel } from '@/features/workspaces';
import { ActionsTableHead } from '@/components/lists/ActionsTableHead';
import { formatDate } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { type ApiKey, useApiKeys, useRevokeApiKey } from '../hooks/useApiKeys';

export function ApiKeysTable({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n();
  const { data: apiKeys, isPending, error, refetch } = useApiKeys(workspaceId);

  if (error) {
    return <ErrorState title="API keys could not be loaded" error={error} onRetry={refetch} />;
  }
  if (isPending) return <Skeleton className="h-32 w-full" />;
  if (apiKeys.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <KeyRound />
          </EmptyMedia>
          <EmptyTitle>{t('No API keys yet')}</EmptyTitle>
          <EmptyDescription>
            {t('Create a key to let an AI agent or a script read and edit your catalog.')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Name')}</TableHead>
            <TableHead>{t('Key')}</TableHead>
            <TableHead>{t('Access')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('Last used')}</TableHead>
            <ActionsTableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((apiKey) => (
            <TableRow key={apiKey.id}>
              <TableCell className="font-medium">{apiKey.name}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {apiKey.prefix}…
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{t(roleLabel(apiKey))}</Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {formatDate(apiKey.lastUsedAt, t('Never'))}
              </TableCell>
              <TableCell className="text-right">
                <RevokeButton workspaceId={workspaceId} apiKey={apiKey} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RevokeButton({ workspaceId, apiKey }: { workspaceId: string; apiKey: ApiKey }) {
  const { t } = useI18n();
  const revoke = useRevokeApiKey(workspaceId);

  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="destructive"
          size="sm"
          aria-label={t('Revoke {name}', { name: apiKey.name })}
        >
          {t('Revoke')}
        </Button>
      }
      title={t('Revoke {name}?', { name: apiKey.name })}
      description={t('Anything using this key stops working right away. This cannot be undone.')}
      confirmLabel={t('Revoke key')}
      onConfirm={() => revoke.mutateAsync(apiKey.id)}
    />
  );
}
