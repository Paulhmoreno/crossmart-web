import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { parseEnum } from '@/lib/enum';
import { useI18n } from '@/lib/i18n';
import { AGENT_CONSOLE_COPY, EVENT_FILTERS, EventFilter } from '../agent-console.constants';

interface EventFilterBarProps {
  value: EventFilter;
  onChange: (filter: EventFilter) => void;
}

/** All, Agent, Stores, Orders or Errors. */
export function EventFilterBar({ value, onChange }: EventFilterBarProps) {
  const { t } = useI18n();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={value}
      onValueChange={(next) => {
        const filter = parseEnum(EventFilter, next);
        if (filter) onChange(filter);
      }}
      aria-label={t(AGENT_CONSOLE_COPY.filterLabel)}
      className="w-full"
    >
      {EVENT_FILTERS.map(({ value: filter, label }) => (
        <ToggleGroupItem key={filter} value={filter} className="flex-1 px-1.5 text-xs">
          {t(label)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
