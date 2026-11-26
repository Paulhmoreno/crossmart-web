import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES, toStoreRoute } from '@/config/routes';
import { formatMoney } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { toSharePercent } from '../sales-format';
import { RankedBar } from './RankedBar';
import type { SalesReport } from '../sales.types';

/** Each store's share of the period's sales, largest first. */
export function StoreSalesCard({ report }: { report: SalesReport }) {
  const { t, tp } = useI18n();
  const total = Number(report.current.sales);
  const stores = [...report.stores].sort(
    (first, second) => Number(second.sales) - Number(first.sales),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Sales by store')}</CardTitle>
        <CardDescription>{t('Where this period’s orders came from.')}</CardDescription>
      </CardHeader>
      <CardContent>
        {stores.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            <Link to={ROUTES.stores} className="font-medium text-foreground underline">
              {t('Connect a store')}
            </Link>{' '}
            {t('to see its sales here.')}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {stores.map((store) => {
              const share = toSharePercent(Number(store.sales), total);
              return (
                <li key={store.connectionId} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <Link
                      to={toStoreRoute(store.connectionId)}
                      className="truncate font-medium hover:underline"
                    >
                      {store.displayName}
                    </Link>
                    <span className="shrink-0 tabular-nums">
                      {formatMoney(store.sales, report.currencyCode)}
                      <span className="ml-2 text-muted-foreground">{share}%</span>
                    </span>
                  </div>
                  <RankedBar share={share} />
                  <p className="text-xs text-muted-foreground">
                    {tp(store.orders, '{count} order', '{count} orders')}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
