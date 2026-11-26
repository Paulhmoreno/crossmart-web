import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useI18n } from '@/lib/i18n';

export interface FilterTab<Value extends string> {
  value: Value;
  label: string;
}

interface FilterTabsProps<Value extends string> {
  tabs: readonly FilterTab<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  /** Rows per tab, shown next to its label. Absent while they load. */
  counts?: Partial<Record<Value, number>>;
  label: string;
}

/** A list's main filter as a row of tabs, each with how many rows it holds. */
export function FilterTabs<Value extends string>({
  tabs,
  value,
  onChange,
  counts,
  label,
}: FilterTabsProps<Value>) {
  const { formatNumber, t } = useI18n();
  const isTab = (candidate: string): candidate is Value =>
    tabs.some((tab) => tab.value === candidate);
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      // A single toggle group reports '' when the active tab is pressed again; keep it.
      onValueChange={(next) => isTab(next) && onChange(next)}
      aria-label={t(label)}
      className="flex-wrap"
    >
      {tabs.map((tab) => (
        <ToggleGroupItem key={tab.value} value={tab.value} className="gap-1.5 px-3">
          {t(tab.label)}
          {counts?.[tab.value] !== undefined && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatNumber(counts[tab.value] ?? 0)}
            </span>
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
