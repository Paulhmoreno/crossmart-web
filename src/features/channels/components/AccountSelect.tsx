import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import type { SelectAccountPrompt } from '../channels.constants';

interface AccountSelectProps {
  id: string;
  prompt: SelectAccountPrompt;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

/** An account picked from a fixed list, such as the eBay marketplace to sell on. */
export function AccountSelect({ id, prompt, value, onChange, disabled }: AccountSelectProps) {
  const { t } = useI18n();
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled} required>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={t(prompt.placeholder)} />
      </SelectTrigger>
      <SelectContent>
        {prompt.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {t(option.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
