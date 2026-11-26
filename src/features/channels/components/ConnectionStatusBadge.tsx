import { ChannelConnectionStatus } from '@/api/schema';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { CONNECTION_STATUS_LABELS } from '../channels.constants';

type ConnectionBadgeVariant = 'success' | 'warning' | 'destructive' | 'outline';

const BADGE_VARIANTS = {
  [ChannelConnectionStatus.CONNECTED]: 'success',
  [ChannelConnectionStatus.NEEDS_REAUTH]: 'warning',
  [ChannelConnectionStatus.ERROR]: 'destructive',
  [ChannelConnectionStatus.DISCONNECTED]: 'outline',
} as const satisfies Record<ChannelConnectionStatus, ConnectionBadgeVariant>;

export function ConnectionStatusBadge({ status }: { status: ChannelConnectionStatus }) {
  const { t } = useI18n();
  return (
    <Badge variant={BADGE_VARIANTS[status]}>
      <span data-dot className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {t(CONNECTION_STATUS_LABELS[status])}
    </Badge>
  );
}
