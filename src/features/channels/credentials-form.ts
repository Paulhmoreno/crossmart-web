import { ChannelType, FalabellaCountry, WooCommercePublishStatus } from '@/api/schema';
import { parseEnum } from '@/lib/enum';
import type {
  CredentialFieldPrompt,
  SellerCredentialKey,
  SellerCredentials,
} from './channels.constants';

/** What the merchant typed, by field key. */
export type CredentialValues = Partial<Record<SellerCredentialKey, string>>;

function valueOf(values: CredentialValues, key: SellerCredentialKey): string {
  return values[key]?.trim() ?? '';
}

/** Whether every required field has a value (and paired optional fields are both set or empty). */
export function isComplete(
  fields: readonly CredentialFieldPrompt[],
  values: CredentialValues,
): boolean {
  const requiredFilled = fields
    .filter((field) => !field.optional)
    .every((field) => valueOf(values, field.key).length > 0);
  if (!requiredFilled) return false;
  const wpUser = valueOf(values, 'wpUsername');
  const wpPass = valueOf(values, 'wpAppPassword');
  return wpUser.length > 0 === wpPass.length > 0;
}

function toFalabellaCredentials(values: CredentialValues): SellerCredentials | null {
  const country = parseEnum(FalabellaCountry, valueOf(values, 'country'));
  const credentials = {
    sellerId: valueOf(values, 'sellerId'),
    userId: valueOf(values, 'userId'),
    apiKey: valueOf(values, 'apiKey'),
  };
  if (!country || Object.values(credentials).some((value) => value.length === 0)) return null;
  return { ...credentials, country };
}

function toWooCommerceCredentials(values: CredentialValues): SellerCredentials | null {
  const storeUrl = valueOf(values, 'storeUrl');
  const consumerKey = valueOf(values, 'consumerKey');
  const consumerSecret = valueOf(values, 'consumerSecret');
  if (!storeUrl || !consumerKey || !consumerSecret) return null;

  const wpUsername = valueOf(values, 'wpUsername');
  const wpAppPassword = valueOf(values, 'wpAppPassword');
  if (wpUsername.length > 0 !== wpAppPassword.length > 0) return null;

  const rawStatus = valueOf(values, 'defaultStatus');
  const defaultStatus = rawStatus ? parseEnum(WooCommercePublishStatus, rawStatus) : undefined;
  if (rawStatus && !defaultStatus) return null;

  return {
    storeUrl,
    consumerKey,
    consumerSecret,
    ...(wpUsername ? { wpUsername, wpAppPassword } : {}),
    ...(defaultStatus ? { defaultStatus } : {}),
  };
}

/** The credentials to send, trimmed; null until every required field is filled with a valid value. */
export function toSellerCredentials(
  values: CredentialValues,
  channelType: ChannelType = ChannelType.falabella,
): SellerCredentials | null {
  if (channelType === ChannelType.woocommerce) return toWooCommerceCredentials(values);
  return toFalabellaCredentials(values);
}
