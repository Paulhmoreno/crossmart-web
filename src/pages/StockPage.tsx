import { useState } from 'react';
import { ErrorState } from '@/components/feedback/ErrorState';
import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { ListSkeleton } from '@/components/lists/ListSkeleton';
import { TablePagination } from '@/components/lists/TablePagination';
import { useUrlPagination } from '@/hooks/usePagination';
import { Page } from '@/components/layout/Page';
import { ProductViewTabs } from '@/features/catalog';
import { StockValueTiles } from '@/features/inventory-report';
import {
  type InventoryItem,
  type InventoryListFilters,
  InventoryEmptyState,
  InventoryFilters,
  InventoryTable,
  StockHistorySheet,
  toStockLevelQuery,
  useInventory,
  useInventoryListFilters,
} from '@/features/inventory';
import { WorkspacePermission } from '@/api/schema';
import { useOdooConnection } from '@/features/odoo';
import { OdooCatalogStatusIndicator } from '@/features/odoo/components/OdooCatalogStatusIndicator';
import { hasPermission, type Workspace } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';

/** Products › Stock: what the stock is worth, the stock of every variant, and every change. */
export function StockPage() {
  return <WorkspaceGate>{(workspace) => <StockContent workspace={workspace} />}</WorkspaceGate>;
}

function StockContent({ workspace }: { workspace: Workspace }) {
  const { t } = useI18n();
  const filters = useInventoryListFilters();
  const odooQuery = useOdooConnection(workspace.id);
  const odooConnection = odooQuery.data?.connection ?? null;
  const isOdooExclusive = Boolean(odooConnection);

  return (
    <Page
      name={t('Stock')}
      title={t('Products')}
      actions={odooConnection ? <OdooCatalogStatusIndicator connection={odooConnection} /> : undefined}
    >
      <ProductViewTabs />
      {isOdooExclusive && (
        <p className="text-xs text-muted-foreground">
          {t('Products and stock are managed from Odoo.')}
        </p>
      )}
      <StockValueTiles workspaceId={workspace.id} />
      <InventoryFilters filters={filters} />
      <InventoryResults workspace={workspace} filters={filters} isOdooExclusive={isOdooExclusive} />
    </Page>
  );
}

interface InventoryResultsProps {
  workspace: Workspace;
  filters: InventoryListFilters;
  isOdooExclusive: boolean;
}

function InventoryResults({ workspace, filters, isOdooExclusive }: InventoryResultsProps) {
  const canAdjust = !isOdooExclusive && hasPermission(workspace, WorkspacePermission.inventory_edit);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const pagination = useUrlPagination();
  const inventory = useInventory(
    {
      workspaceId: workspace.id,
      search: filters.debouncedSearch,
      stockLevel: toStockLevelQuery(filters.stockLevel),
      sort: filters.sort.sort,
      direction: filters.sort.direction,
    },
    pagination,
  );
  // Show the row as it is now, so the history header follows adjustments made meanwhile.
  const openItem =
    inventory.items.find((item) => item.inventoryItemId === historyItem?.inventoryItemId) ??
    historyItem;

  if (inventory.isError) {
    return (
      <ErrorState
        title="Stock could not be loaded"
        error={inventory.error}
        onRetry={inventory.refetch}
      />
    );
  }
  if (inventory.isPending) return <ListSkeleton label="Loading stock" />;
  if (inventory.items.length === 0) {
    return (
      <InventoryEmptyState isFiltered={filters.isFiltered} onClearFilters={filters.clearAll} />
    );
  }
  return (
    <>
      <InventoryTable
        workspaceId={workspace.id}
        items={inventory.items}
        isRefreshing={inventory.isPlaceholderData}
        onOpenHistory={setHistoryItem}
        canAdjust={canAdjust}
      />
      <TablePagination
        pagination={pagination}
        total={inventory.total}
        pageCount={inventory.pageCount}
        noun="variant"
        isFetching={inventory.isPlaceholderData}
      />
      <StockHistorySheet
        workspaceId={workspace.id}
        item={openItem}
        onClose={() => setHistoryItem(null)}
        canAdjust={canAdjust}
      />
    </>
  );
}
