import { useCatalogStats } from '@/features/catalog';
import { useChannelSetup } from '@/features/channels';
import { useAiStatus } from '@/features/suggestions';
import { isOnboardingComplete, type OnboardingState } from '../onboarding';

interface Onboarding {
  state: OnboardingState;
  /** Undefined until everything it depends on has loaded. */
  isComplete: boolean | undefined;
}

/** How far the seller is with getting started, from the catalog, stores, and native AI provider. */
export function useOnboarding(workspaceId: string): Onboarding {
  const { data: stats } = useCatalogStats(workspaceId);
  const { data: aiStatus } = useAiStatus(workspaceId);
  const channelSetup = useChannelSetup(workspaceId);
  const state: OnboardingState = {
    hasProducts: (stats?.products ?? 0) > 0,
    isAiConfigured: aiStatus?.configured ?? false,
    channelSetup,
  };
  const isLoaded = stats !== undefined && aiStatus !== undefined && channelSetup !== undefined;
  return { state, isComplete: isLoaded ? isOnboardingComplete(state) : undefined };
}
