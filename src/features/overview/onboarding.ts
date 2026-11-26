import { ROUTES } from '@/config/routes';
import { ChannelSetup } from '@/features/channels';
import { CONNECT_CHANNEL_PROMPT, CONNECTABLE_CHANNEL_NAMES } from './overview.constants';

export interface OnboardingStep {
  title: string;
  description: string;
  /** Live channel names when this step prompts connecting a store, for locale-aware formatting. */
  channelNames?: readonly string[];
  to: string;
  done: boolean;
}

/** What a new seller has done so far. `channelSetup` is undefined until it is known. */
export interface OnboardingState {
  hasProducts: boolean;
  isAiConfigured: boolean;
  channelSetup: ChannelSetup | undefined;
}

/** A connected store whose products were never imported gets its own nudge. */
function channelStep(setup: ChannelSetup | undefined): OnboardingStep {
  if (setup === ChannelSetup.Connected) {
    return {
      title: 'Import products from your store',
      description: 'Your store is connected. Import its products to link them to your catalog.',
      to: ROUTES.stores,
      done: false,
    };
  }
  return {
    title: 'Connect a store',
    description: `${CONNECT_CHANNEL_PROMPT}.`,
    channelNames: CONNECTABLE_CHANNEL_NAMES,
    to: ROUTES.stores,
    done: setup === ChannelSetup.Imported,
  };
}

/** The first things a new seller does. Each step reflects what is really done. */
export function onboardingSteps({
  hasProducts,
  isAiConfigured,
  channelSetup,
}: OnboardingState): OnboardingStep[] {
  return [
    {
      title: 'Add your products',
      description: 'Sync from Odoo, import from a store, or add a product by hand.',
      to: ROUTES.products,
      done: hasProducts,
    },
    channelStep(channelSetup),
    {
      title: 'Configure AI',
      description: 'Connect an AI provider to generate and refine product content.',
      to: ROUTES.aiSettings,
      done: isAiConfigured,
    },
  ];
}

export function isOnboardingComplete(state: OnboardingState): boolean {
  return onboardingSteps(state).every((step) => step.done);
}
