import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  OdooConnectionStatus,
  OdooStockField,
  OdooSyncMode,
  OdooSyncRunStatus,
} from '@/api/schema';
import { I18nProvider, Locale, setLocale } from '@/lib/i18n';
import type { OdooConnection } from '../hooks/useOdooSource';
import { OdooSyncPanel } from './OdooSyncPanel';

const CONNECTION: OdooConnection = {
  id: 'odoo-conn-1',
  displayName: 'Odoo',
  url: 'https://erp.example.com',
  database: 'demo_db',
  username: 'readonly@example.com',
  hasCredentials: true,
  status: OdooConnectionStatus.CONNECTED,
  statusReason: null,
  settings: {
    warehouseId: null,
    pricelistId: null,
    stockField: OdooStockField.free_qty,
    brandField: null,
    customFields: [],
    syncIntervalMinutes: 30,
    filterSaleOnly: true,
  },
  discovered: null,
  syncedProductCount: 120,
  lastTestedAt: '2026-11-25T10:00:00.000Z',
  lastSyncedAt: '2026-11-25T10:00:00.000Z',
  connectedAt: '2026-11-20T10:00:00.000Z',
  disconnectedAt: null,
  latestRun: {
    id: 'run-1',
    connectionId: 'odoo-conn-1',
    mode: OdooSyncMode.FULL,
    status: OdooSyncRunStatus.COMPLETED,
    totalCount: 120,
    processedCount: 120,
    createdCount: 5,
    updatedCount: 115,
    skippedCount: 0,
    failedCount: 0,
    errorMessage: null,
    issues: [],
    createdAt: '2026-11-25T10:00:00.000Z',
    startedAt: '2026-11-25T10:00:01.000Z',
    finishedAt: '2026-11-25T10:01:00.000Z',
  },
  recentRuns: [
    {
      id: 'run-1',
      connectionId: 'odoo-conn-1',
      mode: OdooSyncMode.FULL,
      status: OdooSyncRunStatus.COMPLETED,
      totalCount: 120,
      processedCount: 120,
      createdCount: 5,
      updatedCount: 115,
      skippedCount: 0,
      failedCount: 0,
      errorMessage: null,
      issues: [],
      createdAt: '2026-11-25T10:00:00.000Z',
      startedAt: '2026-11-25T10:00:01.000Z',
      finishedAt: '2026-11-25T10:01:00.000Z',
    },
  ],
};

function renderPanel() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <OdooSyncPanel workspaceId="ws-1" connection={CONNECTION} canManage />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

describe('OdooSyncPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setLocale(Locale.En);
  });

  it('shows full catalog sync without stats cards or product browser and collapses sync history by default', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByRole('button', { name: 'Sync full catalog' })).toBeInTheDocument();
    expect(screen.queryByText('Synced products')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sync selected/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Search Odoo/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    const historyToggle = screen.getByRole('button', { name: /Sync history/i });
    expect(historyToggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(historyToggle);
    expect(historyToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Full catalog')).toBeInTheDocument();
  });
});
