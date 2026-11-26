import { History } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { CatalogSourceKind, StockLevel } from '@/api/schema';
import { OdooSourceBadge } from '@/features/odoo/components/OdooSourceBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toProductRoute } from '@/config/routes';
import { ProductThumbnail } from '@/features/catalog';
import { useI18n } from '@/lib/i18n';
import type { InventoryItem } from '../inventory.types';
import { variantLabel } from '../stock-adjustment';
import { AdjustStockPopover } from './AdjustStockPopover';
import { StockLevelBadge } from './StockLevelBadge';

const NO_VALUE = '—';
const NUMBER_CELL = 'text-right tabular-nums';
/** Columns that take only the width they need, so the product name gets the rest. */
const FIT_CELL = 'w-px whitespace-nowrap';

interface InventoryTableProps {
  workspaceId: string;
  items: InventoryItem[];
  /** A new filter is loading; the current rows stay, dimmed. */
  isRefreshing?: boolean;
  onOpenHistory: (item: InventoryItem) => void;
  /** Whether the member may adjust stock; without it rows only open their history. */
  canAdjust: boolean;
}

export function InventoryTable({
  workspaceId,
  items,
  isRefreshing = false,
  onOpenHistory,
  canAdjust,
}: InventoryTableProps) {
  const { t } = useI18n();
  return (
    <div
      className={cn('rounded-lg border transition-opacity', isRefreshing && 'opacity-60')}
      aria-busy={isRefreshing}
    >
      <Table stickyHeader>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Product')}</TableHead>
            <TableHead className="hidden lg:table-cell">{t('SKU')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('Status')}</TableHead>
            <TableHead className={cn(NUMBER_CELL, 'hidden sm:table-cell')}>
              {t('On hand')}
            </TableHead>
            <TableHead className={cn(NUMBER_CELL, 'hidden sm:table-cell')}>
              {t('Reserved')}
            </TableHead>
            <TableHead className={cn(NUMBER_CELL, FIT_CELL)}>{t('Available')}</TableHead>
            <TableHead className={FIT_CELL}>
              <span className="sr-only">{t('Actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <InventoryRow
              key={item.inventoryItemId}
              workspaceId={workspaceId}
              item={item}
              onOpenHistory={onOpenHistory}
              canAdjust={canAdjust}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface InventoryRowProps {
  workspaceId: string;
  item: InventoryItem;
  onOpenHistory: (item: InventoryItem) => void;
  canAdjust: boolean;
}

function InventoryRow({ workspaceId, item, onOpenHistory, canAdjust }: InventoryRowProps) {
  const quantity = (value: number) => (item.tracked ? value.toLocaleString() : NO_VALUE);
  const isOut = item.stockLevel === StockLevel.out_of_stock;
  const isOdooManaged = item.sourceKind === CatalogSourceKind.ODOO;

  return (
    <TableRow>
      <TableCell className="w-full max-w-0 lg:w-auto lg:max-w-none">
        <ProductCell item={item} />
      </TableCell>
      <TableCell className="hidden font-mono text-xs lg:table-cell">
        {item.sku ?? NO_VALUE}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <StockLevelBadge level={item.stockLevel} />
      </TableCell>
      <TableCell className={cn(NUMBER_CELL, 'hidden sm:table-cell')}>
        {quantity(item.onHand)}
      </TableCell>
      <TableCell className={cn(NUMBER_CELL, 'hidden text-muted-foreground sm:table-cell')}>
        {quantity(item.reserved)}
      </TableCell>
      <TableCell className={cn(NUMBER_CELL, FIT_CELL, 'font-medium', isOut && 'text-destructive')}>
        {quantity(item.available)}
      </TableCell>
      <TableCell className={FIT_CELL}>
        <div className="flex items-center justify-end gap-1">
          {!isOdooManaged && item.tracked && canAdjust && (
            <AdjustStockPopover workspaceId={workspaceId} item={item} compact />
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Stock history of ${item.sku ?? item.productTitle}`}
            onClick={() => onOpenHistory(item)}
          >
            <History />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Product, variant and, on narrow screens, the columns that do not fit. */
function ProductCell({ item }: { item: InventoryItem }) {
  const variant = variantLabel(item);
  return (
    <Link
      to={toProductRoute(item.productId)}
      className="group/product flex items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ProductThumbnail url={item.imageUrl} alt="" />
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium group-hover/product:underline">
            {item.productTitle}
          </span>
          {item.sourceKind === CatalogSourceKind.ODOO && (
            <OdooSourceBadge className="h-4 px-1.5 text-[10px]" />
          )}
        </span>
        {variant && <span className="truncate text-xs text-muted-foreground">{variant}</span>}
        <span className="truncate font-mono text-xs text-muted-foreground lg:hidden">
          {item.sku ?? 'No SKU'}
        </span>
        {item.tracked && (
          <span className="truncate text-xs text-muted-foreground tabular-nums sm:hidden">
            {item.onHand.toLocaleString()} on hand · {item.reserved.toLocaleString()} reserved
          </span>
        )}
        <span className="mt-1 md:hidden">
          <StockLevelBadge level={item.stockLevel} />
        </span>
      </span>
    </Link>
  );
}
