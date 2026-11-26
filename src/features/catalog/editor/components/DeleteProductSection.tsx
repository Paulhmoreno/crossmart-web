import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { useI18n } from '@/lib/i18n';
import { useDeleteProduct } from '../../hooks/useProductMutations';

interface DeleteProductSectionProps {
  workspaceId: string;
  productId: string;
  title: string;
}

export function DeleteProductSection({ workspaceId, productId, title }: DeleteProductSectionProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const deleteProduct = useDeleteProduct(workspaceId, productId);

  async function confirmDelete() {
    await deleteProduct.mutateAsync();
    await navigate(ROUTES.products, { replace: true });
  }

  return (
    <div className="flex justify-end border-t pt-6">
      <ConfirmDialog
        trigger={
          <Button type="button" variant="destructive">
            <Trash2 data-icon="inline-start" />
            {t('Delete product')}
          </Button>
        }
        title={t('Delete {title}?', { title })}
        description={t(
          'Its variants, images and stock history are deleted too, and it is archived in every store that lists it. This cannot be undone.',
        )}
        confirmLabel={t('Delete product')}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
