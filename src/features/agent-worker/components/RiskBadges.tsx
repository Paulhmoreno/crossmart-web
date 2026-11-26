import { TriangleAlert } from 'lucide-react';
import type { AgentWorkerActionRisk } from '@/api/schema';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { AGENT_WORKER_RISK_COPY } from '../agent-worker.constants';

/** Why a change needs extra care: it deletes, changes prices, or touches many items. */
export function RiskBadges({ risks }: { risks: readonly AgentWorkerActionRisk[] }) {
  const { t } = useI18n();
  if (!risks.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {risks.map((risk) => (
        <Badge key={risk} variant="destructive">
          <TriangleAlert data-icon="inline-start" aria-hidden="true" />
          {t(AGENT_WORKER_RISK_COPY[risk].label)}
        </Badge>
      ))}
    </span>
  );
}
