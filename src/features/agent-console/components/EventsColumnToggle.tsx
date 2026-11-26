import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import {
  AGENT_CONSOLE_COPY,
  AGENT_CONSOLE_TEST_IDS,
  EVENTS_COLUMN_ID,
} from '../agent-console.constants';

/** In the Events header: hides the column, so the map takes its width. */
export function HideEventsButton({ onHide }: { onHide: () => void }) {
  const { t } = useI18n();
  const label = t(AGENT_CONSOLE_COPY.hideEvents);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-expanded="true"
      aria-controls={EVENTS_COLUMN_ID}
      aria-label={label}
      title={label}
      data-testid={AGENT_CONSOLE_TEST_IDS.hideEvents}
      onClick={onHide}
    >
      <PanelRightClose />
    </Button>
  );
}

/**
 * The slim rail left when the Events column is hidden: it says how many events arrived unseen
 * and shows the column again.
 */
export function EventsRail({ unseen, onShow }: { unseen: number; onShow: () => void }) {
  const { t, tp } = useI18n();
  const label =
    unseen > 0
      ? tp(unseen, 'Show events, {count} new', 'Show events, {count} new')
      : t('Show events');
  return (
    <button
      type="button"
      aria-expanded="false"
      aria-controls={EVENTS_COLUMN_ID}
      aria-label={label}
      title={label}
      data-testid={AGENT_CONSOLE_TEST_IDS.showEvents}
      onClick={onShow}
      className="flex h-full w-11 flex-col items-center gap-3 rounded-xl border bg-background py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <PanelRightOpen className="size-4" aria-hidden="true" />
      <span className="[writing-mode:vertical-rl]">{t(AGENT_CONSOLE_COPY.eventsTitle)}</span>
      {unseen > 0 && (
        <span
          aria-hidden="true"
          className="rounded-full bg-brand px-1.5 text-[11px] leading-4 font-semibold text-white tabular-nums"
        >
          {unseen}
        </span>
      )}
    </button>
  );
}
