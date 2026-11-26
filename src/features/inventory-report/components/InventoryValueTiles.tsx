import { Link } from 'react-router';
import { StockLevel } from '@/api/schema';
import { toStockRoute } from '@/config/routes';
import { formatMoney } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { NO_VALUE } from '../inventory-report.constants';
import type { InventoryReport } from '../inventory-report.types';
import { MetricTile } from './MetricTile';

/**
 * Stock at cost, unless no variant in stock has a cost: a zero there would be invented, so the
 * tile shows a dash and says how many variants lack one.
 */
function costedValue(value: InventoryReport['value'], currencyCode: string): string {
  const noCostAtAll = value.variantsWithoutCost > 0 && Number(value.atCost) === 0;
  return noCostAtAll ? NO_VALUE : formatMoney(value.atCost, currencyCode);
}

/** What the stock on hand is worth, and how much of it is about to run out. */
export function InventoryValueTiles({ report }: { report: InventoryReport }) {
  const { formatNumber, t, tp } = useI18n();
  const { value, stockLevels, currencyCode } = report;
  const short = stockLevels.lowStock + stockLevels.outOfStock;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <MetricTile
        label={t('Stock value at cost')}
        value={costedValue(value, currencyCode)}
        detail={
          value.variantsWithoutCost > 0
            ? tp(
                value.variantsWithoutCost,
                '{count} variant in stock without a cost',
                '{count} variants in stock without a cost',
              )
            : t('Every variant in stock has a cost')
        }
      />
      <MetricTile
        label={t('Stock value at price')}
        value={formatMoney(value.atPrice, currencyCode)}
        detail={t('What the stock on hand sells for')}
      />
      <MetricTile
        label={t('Units on hand')}
        value={formatNumber(value.unitsOnHand)}
        detail={t('Available plus held for open orders')}
      />
      <MetricTile
        label={t('Low or out of stock')}
        value={formatNumber(short)}
        detail={
          <Link
            to={toStockRoute(StockLevel.low_stock)}
            className="underline-offset-2 hover:underline"
          >
            {t('{out} out · {low} with {threshold} or fewer left', {
              out: formatNumber(stockLevels.outOfStock),
              low: formatNumber(stockLevels.lowStock),
              threshold: formatNumber(report.lowStockThreshold),
            })}
          </Link>
        }
      />
    </div>
  );
}
