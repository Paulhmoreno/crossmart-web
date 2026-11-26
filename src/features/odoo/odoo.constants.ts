import {
  OdooConnectionStatus,
  OdooStockField,
  OdooSyncRunStatus,
  ProductDocumentKind,
} from '@/api/schema';

export const ODOO_COPY = {
  pageTitle: 'Odoo 18',
  sourceBadge: 'Source: Odoo',
  connectionTitle: 'Odoo connection',
  urlLabel: 'Odoo URL',
  urlPlaceholder: 'https://erp.example.com',
  databaseLabel: 'Database',
  databasePlaceholder: 'database_name',
  usernameLabel: 'Username',
  usernamePlaceholder: 'user@example.com',
  apiKeyLabel: 'API key',
  apiKeyPlaceholder: 'Enter your Odoo API key',
  apiKeyStoredPlaceholder: 'Leave blank to keep stored key',
  testButton: 'Test connection',
  testingButton: 'Testing...',
  connectButton: 'Connect',
  updateButton: 'Update credentials',
  savingButton: 'Saving...',
  disconnectButton: 'Disconnect',
  disconnectTitle: 'Disconnect Odoo?',
  disconnectDescription:
    'Stored credentials will be removed. Imported products and commercial content will remain in Crossmart.',
  disconnectConfirm: 'Disconnect',
  advancedToggle: 'Advanced options',
  warehouseLabel: 'Warehouse',
  warehouseDefault: 'Default (Odoo)',
  pricelistLabel: 'Pricelist',
  pricelistDefault: 'Default (Odoo)',
  stockFieldLabel: 'Stock field',
  brandFieldLabel: 'Brand field',
  customFieldsLabel: 'Additional custom fields (comma-separated)',
  syncIntervalLabel: 'Auto-sync interval (minutes)',
  saleOnlyLabel: 'Sync only sellable products',
  syncTitle: 'Catalog synchronization',
  searchPlaceholder: 'Search Odoo by name, SKU, or barcode...',
  searchButton: 'Search Odoo',
  syncSelectedButton: 'Sync selected',
  syncFullButton: 'Sync full catalog',
  syncFullConfirmTitle: 'Sync full Odoo catalog?',
  syncFullConfirmDescription:
    'All eligible products will be imported or updated. Existing commercial edits in Crossmart will be preserved.',
  syncFullConfirmAction: 'Start full sync',
  documentsTitle: 'Odoo source & documents',
  documentsEmpty: 'No attached technical documents in Odoo.',
  downloadButton: 'Download',
} as const;

export const ODOO_CONNECTION_STATUS_LABELS: Record<OdooConnectionStatus, string> = {
  [OdooConnectionStatus.CONNECTED]: 'Connected',
  [OdooConnectionStatus.ERROR]: 'Error',
  [OdooConnectionStatus.DISCONNECTED]: 'Disconnected',
};

export const ODOO_SYNC_RUN_STATUS_LABELS: Record<OdooSyncRunStatus, string> = {
  [OdooSyncRunStatus.QUEUED]: 'Queued',
  [OdooSyncRunStatus.RUNNING]: 'Syncing',
  [OdooSyncRunStatus.COMPLETED]: 'Completed',
  [OdooSyncRunStatus.FAILED]: 'Failed',
};

export const ODOO_STOCK_FIELD_LABELS: Record<OdooStockField, string> = {
  [OdooStockField.free_qty]: 'Available stock (free_qty)',
  [OdooStockField.qty_available]: 'On hand (qty_available)',
};

export const PRODUCT_DOCUMENT_KIND_LABELS: Record<ProductDocumentKind, string> = {
  [ProductDocumentKind.DATASHEET]: 'Datasheet',
  [ProductDocumentKind.MANUAL]: 'Manual',
  [ProductDocumentKind.INTERNAL]: 'Internal document',
  [ProductDocumentKind.OTHER]: 'Other file',
};
