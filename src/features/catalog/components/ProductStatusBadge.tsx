import { ProductStatus } from '@/api/schema';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { PRODUCT_STATUS_LABELS } from '../product-status';

type StatusBadgeVariant = 'success' | 'warning' | 'outline';

const BADGE_VARIANTS = {
  [ProductStatus.ACTIVE]: 'success',
  [ProductStatus.DRAFT]: 'warning',
  [ProductStatus.ARCHIVED]: 'outline',
} as const satisfies Record<ProductStatus, StatusBadgeVariant>;

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const { t } = useI18n();
  return (
    <Badge variant={BADGE_VARIANTS[status]}>
      <span data-dot className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {t(PRODUCT_STATUS_LABELS[status])}
    </Badge>
  );
}
