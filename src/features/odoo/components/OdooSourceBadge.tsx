import { Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { ODOO_COPY } from '../odoo.constants';

/** Discreet indicator showing that a product originates from Odoo ERP. */
export function OdooSourceBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Badge variant="secondary" className={className}>
      <Database className="size-3" aria-hidden="true" />
      {t(ODOO_COPY.sourceBadge)}
    </Badge>
  );
}
