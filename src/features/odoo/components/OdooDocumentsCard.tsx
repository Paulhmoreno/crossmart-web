import { Download, FileText } from 'lucide-react';
import { env } from '@/config/env';
import type { Product } from '@/features/catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import { ODOO_COPY, PRODUCT_DOCUMENT_KIND_LABELS } from '../odoo.constants';

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

function formatBytes(byteSize: number | null): string {
  if (byteSize === null || byteSize <= 0) return '';
  if (byteSize >= BYTES_PER_MB) return `${(byteSize / BYTES_PER_MB).toFixed(1)} MB`;
  if (byteSize >= BYTES_PER_KB) return `${Math.round(byteSize / BYTES_PER_KB)} KB`;
  return `${byteSize} B`;
}

function readMetadataText(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readMetadataList(metadata: Record<string, unknown> | null, key: string): string[] {
  const value = metadata?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

interface OdooDocumentsCardProps {
  workspaceId: string;
  product: Product;
}

export function OdooDocumentsCard({ workspaceId, product }: OdooDocumentsCardProps) {
  const { t, formatDateTime } = useI18n();
  const metadata = product.sourceMetadata as Record<string, unknown> | null;
  const originalName = readMetadataText(metadata, 'originalName');
  const originalCategory = readMetadataText(metadata, 'originalCategory');
  const originalBrand = readMetadataText(metadata, 'originalBrand');
  const currency = readMetadataText(metadata, 'currency');
  const taxes = readMetadataList(metadata, 'taxes');
  const lastSyncedAt = readMetadataText(metadata, 'lastSyncedAt');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="size-4" aria-hidden="true" />
          {t(ODOO_COPY.documentsTitle)}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div>
            <dt className="text-muted-foreground">{t('Odoo ID')}</dt>
            <dd className="font-mono font-medium">{product.sourceExternalId ?? '—'}</dd>
          </div>
          {currency && (
            <div>
              <dt className="text-muted-foreground">{t('ERP currency')}</dt>
              <dd className="font-medium">{currency}</dd>
            </div>
          )}
          {originalName && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">{t('Original name')}</dt>
              <dd className="font-medium">{originalName}</dd>
            </div>
          )}
          {originalBrand && (
            <div>
              <dt className="text-muted-foreground">{t('Source brand')}</dt>
              <dd className="font-medium">{originalBrand}</dd>
            </div>
          )}
          {originalCategory && (
            <div>
              <dt className="text-muted-foreground">{t('ERP category')}</dt>
              <dd className="font-medium">{originalCategory}</dd>
            </div>
          )}
          {taxes.length > 0 && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">{t('ERP taxes')}</dt>
              <dd className="font-medium">{taxes.join(', ')}</dd>
            </div>
          )}
          {lastSyncedAt && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">{t('Last synced')}</dt>
              <dd className="font-medium">{formatDateTime(lastSyncedAt)}</dd>
            </div>
          )}
        </dl>

        <div className="border-t pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium">
              {t('Attached documents ({count})', { count: product.documents.length })}
            </span>
          </div>
          {product.documents.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t(ODOO_COPY.documentsEmpty)}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {product.documents.map((doc) => {
                const downloadUrl = `${env.apiUrl}/api/v1/workspaces/${workspaceId}/products/${product.id}/documents/${doc.id}/download`;
                return (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium" title={doc.name}>
                        {doc.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px]">
                          {t(PRODUCT_DOCUMENT_KIND_LABELS[doc.kind])}
                        </Badge>
                        {doc.byteSize ? <span>{formatBytes(doc.byteSize)}</span> : null}
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={downloadUrl} target="_blank" rel="noreferrer">
                        <Download className="size-3.5" aria-hidden="true" />
                        {t(ODOO_COPY.downloadButton)}
                      </a>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
