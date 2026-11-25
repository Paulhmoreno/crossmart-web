import { WOOCOMMERCE_PUBLISH_STATUS_LABELS } from '../channels.constants';
import type { WooCommerceSettings } from '../channels.types';
import { AccountDetail } from './AccountDetail';

/** Store details read from WooCommerce and WordPress media upload readiness. */
export function WooCommerceAccountDetails({ woocommerce }: { woocommerce: WooCommerceSettings }) {
  const taxNote = woocommerce.pricesIncludeTax ? 'impuestos incluidos' : 'sin impuestos incluidos';
  const mediaStatus = woocommerce.hasWordPressMediaAuth
    ? `WordPress Media habilitado (${woocommerce.wpUsername ?? 'usuario configurado'})`
    : 'Solo URLs públicas HTTPS (sin contraseña de aplicación)';
  return (
    <>
      <AccountDetail label="URL de la tienda">
        <a
          href={woocommerce.storeUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          {woocommerce.storeUrl}
        </a>
      </AccountDetail>
      <AccountDetail label="Moneda">
        {woocommerce.currencyCode} ({taxNote})
      </AccountDetail>
      <AccountDetail label="Productos remotos detectados">
        {woocommerce.remoteProductCount ?? '—'}
      </AccountDetail>
      <AccountDetail label="Estado inicial al publicar">
        {WOOCOMMERCE_PUBLISH_STATUS_LABELS[woocommerce.defaultStatus]}
      </AccountDetail>
      <AccountDetail label="Subida de fotografías">{mediaStatus}</AccountDetail>
      <AccountDetail label="Unidades">
        {woocommerce.weightUnit} · {woocommerce.dimensionUnit}
      </AccountDetail>
    </>
  );
}
