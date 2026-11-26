import { SubscriptionAccessState } from '@/api/schema';
import { api } from '@/api/client';
import { BILLING_ACCESS_ENDPOINT } from '../billing.constants';
import type { SubscriptionAccess } from '../billing.types';

/** True when this Crossmart instance has commercial billing enabled (`BILLING_DRIVER !== 'none'`). */
export function isBillingEnabled(access: SubscriptionAccess | undefined): boolean {
  return access !== undefined && access.state !== SubscriptionAccessState.unrestricted;
}

/** Whether the workspace can be changed under its organization's subscription (any member). */
export function useBillingAccess(workspaceId: string | undefined) {
  return api.useQuery(
    'get',
    BILLING_ACCESS_ENDPOINT,
    { params: { path: { workspaceId: workspaceId ?? '' } } },
    { enabled: workspaceId !== undefined },
  );
}
