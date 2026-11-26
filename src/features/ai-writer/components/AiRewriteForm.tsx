import { useId, useState } from 'react';
import { FormError } from '@/components/feedback/FormError';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import { AI_WRITER_COPY, INSTRUCTION_MAX_LENGTH, QUICK_INSTRUCTIONS } from '../ai-writer.constants';

interface AiRewriteFormProps {
  isWriting: boolean;
  error: Error | null;
  onSubmit: (instruction: string) => void;
}

/** An optional instruction, typed or picked, then Rewrite. */
export function AiRewriteForm({ isWriting, error, onSubmit }: AiRewriteFormProps) {
  const { t } = useI18n();
  const [instruction, setInstruction] = useState('');
  const inputId = useId();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSubmit(instruction);
      }}
    >
      <Field>
        <FieldLabel htmlFor={inputId}>{t(AI_WRITER_COPY.instructionLabel)}</FieldLabel>
        <Textarea
          id={inputId}
          rows={2}
          maxLength={INSTRUCTION_MAX_LENGTH}
          placeholder={t(AI_WRITER_COPY.instructionPlaceholder)}
          value={instruction}
          disabled={isWriting}
          onChange={(event) => setInstruction(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_INSTRUCTIONS.map((quick) => (
          <Button
            key={quick}
            type="button"
            variant="secondary"
            size="xs"
            disabled={isWriting}
            onClick={() => onSubmit(quick)}
          >
            {t(quick)}
          </Button>
        ))}
      </div>
      <FormError error={error} />
      <Button type="submit" size="sm" className="self-end" disabled={isWriting}>
        {isWriting && <Spinner data-icon="inline-start" />}
        {isWriting ? t(AI_WRITER_COPY.writing) : t(AI_WRITER_COPY.submit)}
      </Button>
    </form>
  );
}
