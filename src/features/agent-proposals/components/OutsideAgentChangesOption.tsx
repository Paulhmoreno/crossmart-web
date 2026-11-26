import type { OutsideAgentChanges } from '@/api/schema';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { useI18n } from '@/lib/i18n';
import { OUTSIDE_AGENT_CHANGES_COPY } from '../agent-proposals.constants';

const INPUT_ID_PREFIX = 'outside-agent-changes-';

/** One choice of the setting, with what it means. */
export function OutsideAgentChangesOption({ value }: { value: OutsideAgentChanges }) {
  const { t } = useI18n();
  const id = `${INPUT_ID_PREFIX}${value}`;
  const copy = OUTSIDE_AGENT_CHANGES_COPY.options[value];
  return (
    <FieldLabel htmlFor={id}>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>{t(copy.label)}</FieldTitle>
          <FieldDescription>{t(copy.description)}</FieldDescription>
        </FieldContent>
        <RadioGroupItem value={value} id={id} />
      </Field>
    </FieldLabel>
  );
}
