import { RouteTabs, type RouteTab } from '@/components/navigation/RouteTabs';
import { ROUTES } from '@/config/routes';
import type { Workspace } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';
import { usePendingReviewCounts } from '../hooks/usePendingReviewCounts';
import { REVIEW_COPY } from '../review.constants';

function CountBadge({ count }: { count: number }) {
  const { tp } = useI18n();
  if (count === 0) return null;
  return (
    <span className="rounded-full bg-brand px-1.5 text-[11px] leading-4 font-semibold text-white tabular-nums">
      {count}
      <span className="sr-only">
        {' '}
        {tp(count, '1 waiting for review', '{count} waiting for review')}
      </span>
    </span>
  );
}

/** Crossmart Agent's two views: the chat with its live map, and what waits for review. */
export function AgentTabs({ workspace }: { workspace: Workspace | undefined }) {
  const { t } = useI18n();
  const { total } = usePendingReviewCounts(workspace);
  const tabs: RouteTab[] = [
    { label: t(REVIEW_COPY.agentTab), to: ROUTES.agent, exact: true },
    { label: t(REVIEW_COPY.pageName), to: ROUTES.agentReview, badge: <CountBadge count={total} /> },
  ];
  return <RouteTabs tabs={tabs} label={t(REVIEW_COPY.tabsLabel)} />;
}
