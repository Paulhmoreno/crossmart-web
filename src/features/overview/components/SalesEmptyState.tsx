import { ChartNoAxesColumn } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useI18n } from '@/lib/i18n';
import { SALES_EMPTY_COPY } from '../overview.constants';

/** Stands in for the sales totals and charts until the first order arrives. */
export function SalesEmptyState() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="sales-heading" className="flex flex-col gap-4">
      <h2 id="sales-heading" className="font-heading text-lg font-semibold">
        {t('Sales')}
      </h2>
      <Empty className="border py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChartNoAxesColumn />
          </EmptyMedia>
          <EmptyTitle>{t(SALES_EMPTY_COPY.title)}</EmptyTitle>
          <EmptyDescription>{t(SALES_EMPTY_COPY.description)}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </section>
  );
}
