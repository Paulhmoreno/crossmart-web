import { CircleAlert, RotateCw } from 'lucide-react';
import { toApiErrorMessage } from '@/api/api-error';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

interface ErrorStateProps {
  title: string;
  error: unknown;
  onRetry?: () => unknown;
}

/** A failed load, said plainly, with a way to try again. Never shown as an empty list. */
export function ErrorState({ title, error, onRetry }: ErrorStateProps) {
  const { t } = useI18n();
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>{t(title)}</AlertTitle>
      <AlertDescription>{toApiErrorMessage(error)}</AlertDescription>
      {onRetry && (
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => void onRetry()}>
            <RotateCw data-icon="inline-start" />
            {t('Try again')}
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
