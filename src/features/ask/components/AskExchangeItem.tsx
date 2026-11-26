import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { ASK_COPY } from '../ask.constants';
import { type AskExchange, AskExchangeStatus } from '../ask.types';
import type { AskEscalation } from '../hooks/useAskEscalation';
import { AskAnswerView } from './AskAnswerView';
import { AskFailureNotice } from './AskFailureNotice';

interface AskExchangeItemProps {
  exchange: AskExchange;
  /** Given for the latest exchange only, whose answer may offer a person. */
  escalation?: AskEscalation;
}

function AskReply({ exchange, escalation }: AskExchangeItemProps) {
  const { t } = useI18n();
  switch (exchange.status) {
    case AskExchangeStatus.Pending:
      return (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Spinner aria-hidden />
          {t(ASK_COPY.thinking)}
        </p>
      );
    case AskExchangeStatus.Answered:
      return <AskAnswerView answer={exchange.answer} escalation={escalation} />;
    case AskExchangeStatus.Failed:
      return <AskFailureNotice failure={exchange.failure} message={exchange.message} />;
  }
}

/** One question, on the reading end of the panel, and its reply beneath it. */
export function AskExchangeItem({ exchange, escalation }: AskExchangeItemProps) {
  const { t } = useI18n();
  return (
    <li className="flex flex-col gap-3">
      <div className="ms-auto max-w-[85%] rounded-lg bg-muted px-3 py-2">
        <span className="sr-only">{t(ASK_COPY.you)}: </span>
        <p dir="auto" className="break-words whitespace-pre-line">
          {exchange.question}
        </p>
      </div>
      <div>
        <span className="sr-only">{t(ASK_COPY.assistant)}: </span>
        <AskReply exchange={exchange} escalation={escalation} />
      </div>
    </li>
  );
}
