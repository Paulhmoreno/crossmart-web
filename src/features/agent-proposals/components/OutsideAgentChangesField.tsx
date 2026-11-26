import { OutsideAgentChanges } from '@/api/schema';
import { FieldDescription, FieldLegend, FieldSet } from '@/components/ui/field';
import { RadioGroup } from '@/components/ui/radio-group';
import { parseEnum } from '@/lib/enum';
import { useI18n } from '@/lib/i18n';
import { OUTSIDE_AGENT_CHANGES_COPY as COPY } from '../agent-proposals.constants';
import { OutsideAgentChangesOption } from './OutsideAgentChangesOption';

const CHOICES = [OutsideAgentChanges.require_approval, OutsideAgentChanges.apply_directly];

interface OutsideAgentChangesFieldProps {
  value: OutsideAgentChanges;
  onChange: (value: OutsideAgentChanges) => void;
}

/**
 * Whether changes by AI agents connected over MCP wait for approval (the default) or apply at
 * once. Changing it is recorded in the activity log.
 */
export function OutsideAgentChangesField({ value, onChange }: OutsideAgentChangesFieldProps) {
  const { t } = useI18n();
  return (
    <FieldSet>
      <FieldLegend variant="label">{t(COPY.title)}</FieldLegend>
      <FieldDescription>{t(COPY.description)}</FieldDescription>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(parseEnum(OutsideAgentChanges, next) ?? value)}
        aria-label={t(COPY.title)}
      >
        {CHOICES.map((choice) => (
          <OutsideAgentChangesOption key={choice} value={choice} />
        ))}
      </RadioGroup>
    </FieldSet>
  );
}
