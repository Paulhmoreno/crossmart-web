import { useId } from 'react';
import type { AgentWorkerActionRisk } from '@/api/schema';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/lib/i18n';
import { AGENT_WORKER_RISK_COPY } from '../agent-worker.constants';

interface RiskConfirmationProps {
  risks: readonly AgentWorkerActionRisk[];
  confirmed: boolean;
  disabled: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
}

/** "I understand this deletes and changes prices": required before risky changes go ahead. */
export function RiskConfirmation({
  risks,
  confirmed,
  disabled,
  onConfirmedChange,
}: RiskConfirmationProps) {
  const { locale, t } = useI18n();
  const checkboxId = useId();
  if (!risks.length) return null;
  const consequences = new Intl.ListFormat(locale, { type: 'conjunction' }).format(
    risks.map((risk) => t(AGENT_WORKER_RISK_COPY[risk].consequence)),
  );
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
      <Checkbox
        id={checkboxId}
        checked={confirmed}
        disabled={disabled}
        onCheckedChange={(checked) => onConfirmedChange(checked === true)}
        className="mt-0.5"
      />
      <label htmlFor={checkboxId} className="text-sm leading-snug">
        {t('I understand this {consequences}', { consequences })}
      </label>
    </div>
  );
}
