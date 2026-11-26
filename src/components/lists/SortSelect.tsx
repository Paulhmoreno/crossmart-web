import { ArrowDownUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import type { SortOption } from './sort-options';

interface SortSelectProps<Field extends string> {
  options: readonly SortOption<Field>[];
  value: string;
  onChange: (value: string) => void;
}

/** How a list is sorted, as one menu of named orders ("Title A–Z", "Recently updated"). */
export function SortSelect<Field extends string>({
  options,
  value,
  onChange,
}: SortSelectProps<Field>) {
  const { t } = useI18n();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-48" aria-label={t('Sort by')}>
        <ArrowDownUp aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {t(option.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
