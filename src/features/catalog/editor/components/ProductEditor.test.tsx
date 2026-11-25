import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import {
  CatalogSourceKind,
  OutOfStockPolicy,
  OutsideAgentChanges,
  ProductStatus,
  WorkspaceRole,
} from '@/api/schema';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { useChannelConnections } from '@/features/channels/hooks/useChannelConnections';
import type { Workspace } from '@/features/workspaces';
import type * as MediaQueryHooks from '@/hooks/useMediaQuery';
import { CREATE_BAR_COPY, EDITOR_FEEDBACK, MORE_DETAILS_COPY } from '../../catalog.constants';
import type { Product } from '../../catalog.types';
import { ProductEditor } from './ProductEditor';

vi.mock('@/features/channels/hooks/useChannelConnections', () => ({
  useChannelConnections: vi.fn<typeof useChannelConnections>(
    () =>
      ({
        data: [],
      }) as unknown as ReturnType<typeof useChannelConnections>,
  ),
}));

// jsdom has no media queries; lay the editor out as on a desktop.
vi.mock('@/hooks/useMediaQuery', async (importOriginal) => ({
  ...(await importOriginal<typeof MediaQueryHooks>()),
  useMediaQuery: () => true,
}));

const WORKSPACE: Workspace = {
  id: 'ws-1',
  organizationId: 'org-1',
  name: 'Default',
  displayName: 'Demo Seller',
  slug: 'default',
  currency: 'USD',
  timeZone: null,
  sandbox: null,
  outsideAgentChanges: OutsideAgentChanges.require_approval,
  role: WorkspaceRole.VIEWER,
  customRole: null,
  permissions: [],
};

function renderEditor(readOnly: boolean, publishes = false, product?: Product) {
  // The unsaved-changes guard needs a data router.
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <TooltipProvider>
          <ProductEditor
            workspace={WORKSPACE}
            product={product}
            readOnly={readOnly}
            publishes={publishes}
          />
        </TooltipProvider>
      ),
    },
  ]);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const ODOO_PRODUCT: Product = {
  id: 'prod-odoo-1',
  handle: 'sample-erp-widget',
  title: 'Sample ERP Widget',
  descriptionHtml: '<p>Sample product description</p>',
  vendor: 'Sample Brand',
  productType: 'Accessories',
  tags: ['sample'],
  status: ProductStatus.ACTIVE,
  condition: null,
  optionNames: [],
  sourceKind: CatalogSourceKind.ODOO,
  sourceConnectionId: 'conn-1',
  sourceExternalId: '1001',
  sourceMetadata: null,
  documents: [],
  variants: [
    {
      id: 'var-1',
      position: 0,
      sku: 'ERP-SKU-001',
      barcode: '0000000000001',
      optionValues: [],
      price: '12.00',
      compareAtPrice: null,
      cost: '4.50',
      weightGrams: null,
      requiresShipping: true,
      taxable: true,
      outOfStockPolicy: OutOfStockPolicy.STOP_SELLING,
      tracked: true,
      available: 5,
      sourceExternalId: '1001',
    },
  ],
  media: [
    {
      id: 'med-1',
      position: 0,
      url: 'http://localhost:3300/media/sample.webp',
      altText: 'Sample ERP Widget',
      sourceManaged: true,
    },
  ],
  createdAt: '2026-11-25T00:00:00Z',
  updatedAt: '2026-11-25T00:00:00Z',
};

describe('ProductEditor', () => {
  it('lets members who may edit change the fields', () => {
    renderEditor(false);

    expect(screen.getByLabelText('Title')).toBeEnabled();
    expect(screen.queryByText(EDITOR_FEEDBACK.readOnly)).not.toBeInTheDocument();
  });

  it('shows a read-only form, with the reason and no save bar, to other roles', () => {
    renderEditor(true);

    expect(screen.getByText(EDITOR_FEEDBACK.readOnly)).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Add photos/ })).toBeDisabled();
    expect(screen.queryByText(CREATE_BAR_COPY.newProduct)).not.toBeInTheDocument();
  });

  it('starts a new item as one, unconditioned, with the rest folded away', () => {
    renderEditor(false);

    expect(screen.getByLabelText('Quantity')).toHaveValue('1');
    expect(screen.getByRole('combobox', { name: 'Condition' })).toHaveTextContent('Not set');
    expect(screen.queryByLabelText('SKU')).not.toBeInTheDocument();
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('opens More details on request', async () => {
    renderEditor(false);

    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(MORE_DETAILS_COPY.title) }),
    );
    expect(screen.getByLabelText('SKU')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).not.toHaveAttribute('placeholder');
  });

  it('offers to publish or keep a draft', () => {
    renderEditor(false, true);

    expect(screen.getByRole('button', { name: CREATE_BAR_COPY.publish })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: CREATE_BAR_COPY.draft })).toBeInTheDocument();
  });

  it('disables ERP-managed fields for Odoo products while keeping commercial fields editable', () => {
    renderEditor(false, false, ODOO_PRODUCT);

    expect(screen.getByLabelText('Title')).toBeEnabled();
    expect(screen.getByLabelText('Price')).toBeDisabled();
    expect(screen.getByLabelText('Quantity')).toBeDisabled();
    expect(screen.getByLabelText('SKU')).toBeDisabled();
    expect(screen.getByLabelText('Barcode')).toBeDisabled();
    expect(screen.getByLabelText('Track stock')).toBeDisabled();
  });
});
