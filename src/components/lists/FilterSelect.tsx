import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { findOptionValue } from '@/lib/enum';
import { useI18n } from '@/lib/i18n';
import { ANY_VALUE, type FilterOption } from './filter-options';

interface FilterSelectProps<Value extends string> {
  options: readonly FilterOption<Value>[];
  value: Value | undefined;
  onChange: (value: Value | undefined) => void;
  /** The first item, which clears the filter ("All statuses"). */
  anyLabel: string;
  label: string;
}

/** A menu that narrows a list to one value of a field, or clears it. */
export function FilterSelect<Value extends string>({
  options,
  value,
  onChange,
  anyLabel,
  label,
}: FilterSelectProps<Value>) {
  const { t } = useI18n();
  return (
    <Select
      value={value ?? ANY_VALUE}
      onValueChange={(next) => onChange(findOptionValue(options, next))}
    >
      <SelectTrigger className="w-full sm:w-48" aria-label={t(label)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY_VALUE}>{t(anyLabel)}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {t(option.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
