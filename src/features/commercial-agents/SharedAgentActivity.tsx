import { AlertCircle, CircleCheck, CircleMinus, CircleX, SendHorizontal, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { SafeMarkdown } from './SafeMarkdown';
import type { AgentStreamState, AgentToolRunView } from './useAgentStream';

function ToolStatusIcon({ tool }: { tool: AgentToolRunView }) {
  if (tool.status === 'running') {
    return <Spinner className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  if (tool.status === 'failed' || tool.isError) {
    return <CircleX className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />;
  }
  if (tool.status === 'cancelled') {
    return <CircleMinus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />;
  }
  return <CircleCheck className="size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />;
}

const OUTCOME_PATTERNS: Array<{ re: RegExp; key: string }> = [
  { re: /^(\d+)\s+account\(s\)$/i, key: '{count} account(s)' },
  { re: /^(\d+)\s+post\(s\)$/i, key: '{count} post(s)' },
  { re: /^(\d+)\s+idea\(s\)$/i, key: '{count} idea(s)' },
  { re: /^(\d+)\s+slot\(s\)$/i, key: '{count} slot(s)' },
  { re: /^(\d+)\s+rule\(s\)$/i, key: '{count} rule(s)' },
  { re: /^(\d+)\s+match\(es\)$/i, key: '{count} match(es)' },
  { re: /^(\d+)\s+piece\(s\)$/i, key: '{count} piece(s)' },
  { re: /^(\d+)\s+product\(s\) with photos$/i, key: '{count} product(s) with photos' },
  { re: /^(\d+)\s+conversation\(s\)$/i, key: '{count} conversation(s)' },
];

const SECOND_GROUP = 2;

function localizeToolOutcome(
  outcome: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const stockMatch = /^(\d+)\/(\d+)\s+in stock$/i.exec(outcome);
  if (stockMatch) {
    return t('{inStock}/{total} in stock', {
      inStock: stockMatch[1] ?? '0',
      total: stockMatch[SECOND_GROUP] ?? '0',
    });
  }
  for (const item of OUTCOME_PATTERNS) {
    const match = item.re.exec(outcome);
    if (match) return t(item.key, { count: match[1] ?? '0' });
  }
  return t(outcome);
}

/**
 * Compact tool-execution list visually aligned with Crossmart Agent's `ActionList` / `ActionRow`.
 * Renders dynamically from backend tool metadata without hardcoding any connector or tool name.
 */
export function SharedToolRunList({ toolRuns }: { toolRuns: readonly AgentToolRunView[] }) {
  const { t } = useI18n();
  if (!toolRuns.length) return null;
  return (
    <ul className="flex flex-col gap-0.5" aria-label={t('Executed actions')}>
      {toolRuns.map((tool) => {
        const isFailure = tool.status === 'failed' || Boolean(tool.isError);
        return (
          <li
            key={tool.id}
            className={cn(
              'flex items-start gap-2 rounded-md px-2 py-1 text-xs',
              isFailure ? 'bg-destructive/5 text-destructive' : 'text-muted-foreground',
            )}
          >
            <span className="mt-px">
              <ToolStatusIcon tool={tool} />
            </span>
            <span className="min-w-0 break-words">
              <span>{t(tool.title)}</span>
              {tool.outcome ? <span> · {localizeToolOutcome(tool.outcome, t)}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Shared live execution indicator for all Crossmart agent Supervisors.
 * Driven strictly by real backend SSE states (never simulated).
 */
export function SharedLiveActivity({ stream }: { stream: AgentStreamState }) {
  const { t } = useI18n();

  const phaseLabel = (() => {
    if (stream.isCancelling || stream.phase === 'cancelling') return t('Cancelling...');
    if (stream.phase === 'running_tool' && stream.phaseDetail) {
      return `${t('Running')}: ${t(stream.phaseDetail)}`;
    }
    if (stream.phase === 'awaiting_approval') return t('Awaiting approval...');
    if (stream.phase === 'waiting_provider') return t('Waiting for AI provider...');
    return t('Working...');
  })();

  if (!stream.isBusy && !stream.errorMessage && stream.toolRuns.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {stream.toolRuns.length > 0 && <SharedToolRunList toolRuns={stream.toolRuns} />}

      {stream.streamingText && (
        <div className="flex flex-col items-start gap-1">
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground">
            <SafeMarkdown text={stream.streamingText} />
          </div>
        </div>
      )}

      {stream.isBusy && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-1 text-xs text-muted-foreground"
        >
          <Spinner className="size-3.5 shrink-0" />
          <span className="truncate">{phaseLabel}</span>
        </div>
      )}

      {!stream.isBusy && stream.errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{stream.errorMessage}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Shared Supervisor composer matching `agent-worker/components/Composer.tsx`:
 * shows Send when idle and Stop (Square) while a turn is actively running.
 */
export function SharedSupervisorComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  isBusy,
  isCancelling,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isBusy: boolean;
  isCancelling?: boolean;
  placeholder: string;
}) {
  const { t } = useI18n();
  const canSend = !isBusy && value.trim().length > 0;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
      className="flex gap-2 border-t p-2.5"
    >
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 text-sm"
        disabled={isBusy}
      />
      {isBusy ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3"
          disabled={isCancelling}
          onClick={onStop}
          aria-label={t('Stop')}
          title={t('Stop')}
        >
          <Square className="size-3.5 fill-current" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="sm"
          className="h-9 px-3"
          disabled={!canSend}
          aria-label={t('Send')}
        >
          <SendHorizontal className="size-4" />
        </Button>
      )}
    </form>
  );
}
