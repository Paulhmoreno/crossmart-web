import { ChannelType, FalabellaCountry, WooCommercePublishStatus } from '@/api/schema';
import { CredentialFieldKind } from './channels.constants';
import { isComplete, toSellerCredentials } from './credentials-form';

const FILLED = {
  sellerId: ' SC478FA ',
  userId: 'me@shop.cl',
  apiKey: ' key ',
  country: FalabellaCountry.fape,
};

const WOO_FILLED = {
  storeUrl: ' https://tienda.ejemplo.com ',
  consumerKey: ' ck_test_123 ',
  consumerSecret: ' cs_test_456 ',
};

describe('credentials form', () => {
  it('sends the values trimmed, with the country as Falabella names it', () => {
    expect(toSellerCredentials(FILLED)).toEqual({
      sellerId: 'SC478FA',
      userId: 'me@shop.cl',
      apiKey: 'key',
      country: FalabellaCountry.fape,
    });
  });

  it('sends nothing until every value is there and the country is known', () => {
    expect(toSellerCredentials({ ...FILLED, apiKey: '  ' })).toBeNull();
    expect(toSellerCredentials({ ...FILLED, country: 'famx' })).toBeNull();
  });

  it('builds WooCommerce credentials with optional WordPress media auth and draft status', () => {
    expect(toSellerCredentials(WOO_FILLED, ChannelType.woocommerce)).toEqual({
      storeUrl: 'https://tienda.ejemplo.com',
      consumerKey: 'ck_test_123',
      consumerSecret: 'cs_test_456',
    });

    expect(
      toSellerCredentials(
        {
          ...WOO_FILLED,
          wpUsername: ' crossmart ',
          wpAppPassword: ' abcd efgh ',
          defaultStatus: WooCommercePublishStatus.draft,
        },
        ChannelType.woocommerce,
      ),
    ).toEqual({
      storeUrl: 'https://tienda.ejemplo.com',
      consumerKey: 'ck_test_123',
      consumerSecret: 'cs_test_456',
      wpUsername: 'crossmart',
      wpAppPassword: 'abcd efgh',
      defaultStatus: WooCommercePublishStatus.draft,
    });

    // Partial WordPress media pair is rejected
    expect(
      toSellerCredentials({ ...WOO_FILLED, wpUsername: 'only-user' }, ChannelType.woocommerce),
    ).toBeNull();
  });

  it('is complete once each required field has a value and optional WordPress fields are paired', () => {
    const fields = [
      { key: 'storeUrl' as const, label: 'URL', kind: CredentialFieldKind.Text },
      { key: 'consumerKey' as const, label: 'Key', kind: CredentialFieldKind.Secret },
      {
        key: 'wpUsername' as const,
        label: 'WP User',
        kind: CredentialFieldKind.Text,
        optional: true,
      },
      {
        key: 'wpAppPassword' as const,
        label: 'WP Pass',
        kind: CredentialFieldKind.Secret,
        optional: true,
      },
    ];
    expect(isComplete(fields, { storeUrl: 'https://a.test' })).toBe(false);
    expect(isComplete(fields, { storeUrl: 'https://a.test', consumerKey: 'ck' })).toBe(true);
    expect(
      isComplete(fields, { storeUrl: 'https://a.test', consumerKey: 'ck', wpUsername: 'user' }),
    ).toBe(false);
    expect(
      isComplete(fields, {
        storeUrl: 'https://a.test',
        consumerKey: 'ck',
        wpUsername: 'user',
        wpAppPassword: 'secret',
      }),
    ).toBe(true);
  });
});
