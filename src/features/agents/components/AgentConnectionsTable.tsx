import { Bot } from 'lucide-react';
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
import { formatDate } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { asksToWrite, hasVerifiedName } from '../agent-authorization';
import {
  type AgentConnection,
  useAgentConnections,
  useDisconnectAgent,
} from '../hooks/useAgentConnections';
import { UnverifiedNameBadge } from './UnverifiedNameBadge';

export function AgentConnectionsTable({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n();
  const { data: connections, isPending, error, refetch } = useAgentConnections(workspaceId);

  if (error) {
    return (
      <ErrorState title="Connected agents could not be loaded" error={error} onRetry={refetch} />
    );
  }
  if (isPending) return <Skeleton className="h-32 w-full" />;
  if (connections.length === 0) return <NoAgents />;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Agent')}</TableHead>
            <TableHead>{t('Access')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('Connected by')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('Connected')}</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {connections.map((connection) => (
            <TableRow key={connection.id}>
              <TableCell className="font-medium">
                <AgentName connection={connection} />
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {asksToWrite(connection.scopes) ? t('Read and change') : t('Read only')}
                </Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {connection.userName}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {formatDate(connection.connectedAt)}
              </TableCell>
              <TableCell className="text-right">
                <DisconnectButton workspaceId={workspaceId} connection={connection} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** The agent's name, marked when it is only what the agent calls itself. */
function AgentName({ connection }: { connection: AgentConnection }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <bdi>{connection.clientName}</bdi>
      {!hasVerifiedName({ registration: connection.clientRegistration }) && <UnverifiedNameBadge />}
    </span>
  );
}

function NoAgents() {
  const { t } = useI18n();
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bot />
        </EmptyMedia>
        <EmptyTitle>{t('No agents connected')}</EmptyTitle>
        <EmptyDescription>
          {t(
            'Add Crossmart as a connector in Claude, ChatGPT or another AI assistant and sign in. It shows up here.',
          )}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

interface DisconnectButtonProps {
  workspaceId: string;
  connection: AgentConnection;
}

function DisconnectButton({ workspaceId, connection }: DisconnectButtonProps) {
  const { t } = useI18n();
  const disconnect = useDisconnectAgent(workspaceId);
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="destructive"
          size="sm"
          aria-label={t('Disconnect {name}', { name: connection.clientName })}
        >
          {t('Disconnect')}
        </Button>
      }
      title={t('Disconnect {name}?', { name: connection.clientName })}
      description={t(
        'It stops working with this workspace right away. To use it again, connect it again from the agent.',
      )}
      confirmLabel={t('Disconnect')}
      onConfirm={() => disconnect.mutateAsync(connection.id)}
    />
  );
}
