import { Link } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/config/routes';
import { useI18n } from '@/lib/i18n';
import { useProductActivity } from '../hooks/useProductActivity';
import { ActivityEventItem } from './ActivityEventItem';

const ALL_ACTIVITY_LABEL = 'All activity';

interface RecentActivityCardProps {
  workspaceId: string;
  productId: string;
}

/** The latest changes to one product, for its editor page. */
export function RecentActivityCard({ workspaceId, productId }: RecentActivityCardProps) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-sm font-semibold">{t('Recent activity')}</h2>
        </CardTitle>
        <CardAction>
          <Button variant="link" size="sm" className="h-auto px-0" asChild>
            <Link to={ROUTES.activity}>{t(ALL_ACTIVITY_LABEL)}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <RecentActivity workspaceId={workspaceId} productId={productId} />
      </CardContent>
    </Card>
  );
}

function RecentActivity({ workspaceId, productId }: RecentActivityCardProps) {
  const { t } = useI18n();
  const { data, isPending, error, refetch } = useProductActivity(workspaceId, productId);

  if (error) {
    return <ErrorState title="Activity could not be loaded" error={error} onRetry={refetch} />;
  }
  if (isPending) return <Skeleton className="h-24 w-full" />;
  if (data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('No changes recorded yet.')}</p>;
  }
  return (
    <ul className="-my-2 divide-y">
      {data.items.map((event) => (
        <ActivityEventItem key={event.id} event={event} pageSubjectId={productId} compact />
      ))}
    </ul>
  );
}
