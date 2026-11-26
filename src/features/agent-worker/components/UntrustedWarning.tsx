import { ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { AGENT_WORKER_COPY } from '../agent-worker.constants';

/** Shown on a change made after reading text that looked like instructions to an AI. */
export function UntrustedWarning() {
  const { t } = useI18n();
  return (
    <p className="flex items-start gap-1.5 rounded-md bg-warning/12 px-2 py-1.5 text-xs text-warning">
      <ShieldAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      {t(AGENT_WORKER_COPY.untrustedWarning)}
    </p>
  );
}
