import type { ReactNode } from 'react';
import { FormProvider } from 'react-hook-form';
import { Eye } from 'lucide-react';
import { CatalogSourceKind } from '@/api/schema';
import { FormError } from '@/components/feedback/FormError';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Workspace } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';
import { EDITOR_FEEDBACK } from '../../catalog.constants';
import type { Product } from '../../catalog.types';
import type { AfterCreate } from '../save-intent';
import { useProductEditorForm } from '../useProductEditorForm';
import { CreateBar } from './CreateBar';
import { DeleteProductSection } from './DeleteProductSection';
import { ProductEditorLayout } from './ProductEditorLayout';
import { SaveBar } from './SaveBar';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';

const PRODUCT_FORM_ID = 'product-form';

interface ProductEditorProps {
  workspace: Workspace;
  /** Absent when creating a product. */
  product?: Product;
  /** Extra cards for the side column. */
  aside?: ReactNode;
  /** Where the product is listed, or the stores a new one is published to. */
  channels?: ReactNode;
  /** For roles that may not edit products: fields disabled, no save or delete. */
  readOnly?: boolean;
  /** For a new product: adds it to the stores chosen once it is saved. */
  afterCreate?: AfterCreate;
  /** Whether "Save & publish" adds the new product to any store. */
  publishes?: boolean;
}

/** Says why the fields cannot be changed, as the Pricing tab does for its own read-only form. */
function ReadOnlyNotice() {
  const { t } = useI18n();
  return (
    <Alert className="mb-6">
      <Eye />
      <AlertTitle>{t(EDITOR_FEEDBACK.readOnlyTitle)}</AlertTitle>
      <AlertDescription>{t(EDITOR_FEEDBACK.readOnly)}</AlertDescription>
    </Alert>
  );
}

type Editor = ReturnType<typeof useProductEditorForm>;

/** Publish or draft for a new product; save or discard changes to a saved one. */
function EditorSaveBar({
  editor,
  isNew,
  publishes,
}: {
  editor: Editor;
  isNew: boolean;
  publishes: boolean;
}) {
  const { t } = useI18n();
  const { isDirty, isSubmitting } = editor.form.formState;
  const isBusy = editor.pendingUploads > 0;
  if (isNew) {
    return (
      <CreateBar
        publishes={publishes}
        isSaving={isSubmitting}
        isBusy={isBusy}
        onSave={editor.submitAs}
      />
    );
  }
  if (!isDirty) return null;
  return (
    <SaveBar
      label={t(EDITOR_FEEDBACK.unsaved)}
      isSaving={isSubmitting}
      isBusy={isBusy}
      onDiscard={() => editor.form.reset()}
    />
  );
}

/** Create and edit a product: the essentials first, the rest under More details. */
export function ProductEditor({
  workspace,
  product,
  readOnly = false,
  ...props
}: ProductEditorProps) {
  const { afterCreate, publishes = false } = props;
  const editor = useProductEditorForm(workspace.id, product, { readOnly, afterCreate });
  const { isDirty, isSubmitting } = editor.form.formState;
  const isOdooManaged = product?.sourceKind === CatalogSourceKind.ODOO;
  const protectedMediaUrls = new Set(
    (product?.media ?? []).filter((item) => item.sourceManaged).map((item) => item.url),
  );
  return (
    <FormProvider {...editor.form}>
      {/* Room below the last section, so the floating save bar never covers it. */}
      <div className="pb-20">
        <form id={PRODUCT_FORM_ID} onSubmit={(event) => void editor.submit(event)} noValidate>
          {!readOnly && <EditorSaveBar editor={editor} isNew={!product} publishes={publishes} />}
          <UnsavedChangesGuard when={isDirty && !isSubmitting} />
          {readOnly && <ReadOnlyNotice />}
          <FormError error={editor.saveError} className="mb-6" />
          <ProductEditorLayout
            workspaceId={workspace.id}
            productId={product?.id}
            currency={workspace.currency}
            hasOptions={editor.hasOptions}
            onPendingUploadsChange={editor.setPendingUploads}
            aside={props.aside}
            channels={props.channels}
            readOnly={readOnly}
            isOdooManaged={isOdooManaged}
            protectedMediaUrls={protectedMediaUrls}
          />
        </form>
        {product && !readOnly && !isOdooManaged && (
          <div className="mt-6">
            <DeleteProductSection
              workspaceId={workspace.id}
              productId={product.id}
              title={product.title}
            />
          </div>
        )}
      </div>
    </FormProvider>
  );
}
