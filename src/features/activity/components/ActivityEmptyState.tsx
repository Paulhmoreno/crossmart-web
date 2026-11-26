import { History, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useI18n } from '@/lib/i18n';

interface ActivityEmptyStateProps {
  isFiltered: boolean;
  onClearFilters: () => void;
}

export function ActivityEmptyState({ isFiltered, onClearFilters }: ActivityEmptyStateProps) {
  const { t } = useI18n();
  if (isFiltered) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>{t('No matching activity')}</EmptyTitle>
          <EmptyDescription>{t('Nothing here matches these filters.')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onClearFilters}>
            {t('Clear filters')}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <History />
        </EmptyMedia>
        <EmptyTitle>{t('No activity yet')}</EmptyTitle>
        <EmptyDescription>
          {t('Changes to products, saved views and API keys show up here, with who made them.')}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
