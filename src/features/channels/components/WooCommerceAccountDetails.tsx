import { useI18n } from '@/lib/i18n';
import { WOOCOMMERCE_PUBLISH_STATUS_LABELS } from '../channels.constants';
import type { WooCommerceSettings } from '../channels.types';
import { AccountDetail } from './AccountDetail';

/** Store details read from WooCommerce, aligned with Shopify/eBay account details. */
export function WooCommerceAccountDetails({ woocommerce }: { woocommerce: WooCommerceSettings }) {
  const { t } = useI18n();
  const mediaStatus = woocommerce.hasWordPressMediaAuth
    ? t('WordPress Media enabled')
    : t('Public HTTPS URLs only');

  return (
    <>
      <AccountDetail label={t('Storefront')}>
        <a
          href={woocommerce.storeUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          {woocommerce.storeUrl}
        </a>
      </AccountDetail>
      <AccountDetail label={t('Currency')}>{woocommerce.currencyCode}</AccountDetail>
      <AccountDetail label={t('Remote products')}>
        {woocommerce.remoteProductCount ?? '—'}
      </AccountDetail>
      <AccountDetail label={t('Publish status')}>
        {t(WOOCOMMERCE_PUBLISH_STATUS_LABELS[woocommerce.defaultStatus])}
      </AccountDetail>
      <AccountDetail label={t('Photo uploads')}>{mediaStatus}</AccountDetail>
    </>
  );
}
