import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { ASK_COPY, ASK_SUGGESTED_QUESTIONS } from '../ask.constants';

interface AskSuggestionsProps {
  disabled: boolean;
  onAsk: (question: string) => void;
}

/** A few questions to start from, before the first one is asked. */
export function AskSuggestions({ disabled, onAsk }: AskSuggestionsProps) {
  const { t } = useI18n();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-xs font-medium text-muted-foreground">
        {t(ASK_COPY.suggestionsLabel)}
      </h3>
      <ul className="flex flex-col items-start gap-1.5">
        {ASK_SUGGESTED_QUESTIONS.map((question) => {
          const localized = t(question);
          return (
            <li key={question}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-auto py-1.5 text-start whitespace-normal"
                disabled={disabled}
                onClick={() => onAsk(localized)}
              >
                {localized}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
