import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { WorkspaceGate } from '@/components/feedback/WorkspaceGate';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PAGE_PARENTS } from '@/config/navigation';
import { ROUTES } from '@/config/routes';
import { ProductEditor } from '@/features/catalog/editor';
import { PublishStoresCard, usePublishOnCreate } from '@/features/listings';
import { useOdooConnection } from '@/features/odoo';
import type { Workspace } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';

/** A new product with its stores ticked, published in one click (disabled when Odoo is master source). */
function NewProduct({ workspace }: { workspace: Workspace }) {
  const { t } = useI18n();
  const odooQuery = useOdooConnection(workspace.id);
  const { stores, afterCreate } = usePublishOnCreate(workspace);

  if (odooQuery.data?.connection) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">{t('Products and stock are managed from Odoo.')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t(
            'Native product creation is disabled while Odoo is configured as the master catalog source. Create products in Odoo and sync them to Crossmart.',
          )}
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.products}>
              <ArrowLeft data-icon="inline-start" />
              {t('Back to Products')}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <ProductEditor
      workspace={workspace}
      channels={<PublishStoresCard state={stores} />}
      afterCreate={afterCreate}
      publishes={stores.publishes}
    />
  );
}

export function NewProductPage() {
  const { t } = useI18n();
  return (
    <Page name={t('Add product')} parents={PAGE_PARENTS.products}>
      <WorkspaceGate>{(workspace) => <NewProduct workspace={workspace} />}</WorkspaceGate>
    </Page>
  );
}
