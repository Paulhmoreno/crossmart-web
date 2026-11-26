import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface StockLabelProps {
  totalAvailable: number | null;
  variantCount: number;
}

export function StockLabel({ totalAvailable, variantCount }: StockLabelProps) {
  const { formatNumber, t, tp } = useI18n();
  const variants = tp(variantCount, '{count} variant', '{count} variants');
  if (totalAvailable === null) {
    return (
      <span className="text-muted-foreground">
        {t('Not tracked')} · {variants}
      </span>
    );
  }
  const stockText =
    totalAvailable < 0
      ? t('Oversold by {count}', { count: formatNumber(Math.abs(totalAvailable)) })
      : t('{count} in stock', { count: formatNumber(totalAvailable) });
  return (
    <span className={cn('tabular-nums', totalAvailable <= 0 && 'text-destructive')}>
      {stockText} <span className="text-muted-foreground">· {variants}</span>
    </span>
  );
}
