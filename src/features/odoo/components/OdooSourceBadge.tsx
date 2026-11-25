import { Database, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ODOO_COPY } from '../odoo.constants';

export function OdooSourceBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={className}>
      <Database className="size-3" aria-hidden="true" />
      {ODOO_COPY.sourceBadge}
    </Badge>
  );
}

export function OdooFieldLockNote() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Lock className="size-3 shrink-0" aria-hidden="true" />
      {ODOO_COPY.managedFieldNote}
    </span>
  );
}
