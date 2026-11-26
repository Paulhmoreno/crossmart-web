import { useI18n } from '@/lib/i18n';
import { MERCADOLIBRE_SITE_LABELS } from '../channels.constants';
import type { MercadoLibreSettings } from '../channels.types';
import { AccountDetail } from './AccountDetail';

/** Seller details read from Mercado Libre on connect. */
export function MercadoLibreAccountDetails({
  mercadoLibre,
}: {
  mercadoLibre: MercadoLibreSettings;
}) {
  const { t } = useI18n();
  const itemModel = mercadoLibre.userProductSeller
    ? t('User Products (price per variant)')
    : t('Single item with variations');

  return (
    <>
      <AccountDetail label={t('Country')}>
        {t(MERCADOLIBRE_SITE_LABELS[mercadoLibre.siteId])}
      </AccountDetail>
      <AccountDetail label={t('Currency')}>{mercadoLibre.currencyCode}</AccountDetail>
      <AccountDetail label={t('Item model')}>{itemModel}</AccountDetail>
      {mercadoLibre.permalink && (
        <AccountDetail label={t('Seller profile')}>
          <a
            href={mercadoLibre.permalink}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {mercadoLibre.nickname}
          </a>
        </AccountDetail>
      )}
    </>
  );
}
