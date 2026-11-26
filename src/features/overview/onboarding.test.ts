import { ROUTES } from '@/config/routes';
import { ChannelSetup } from '@/features/channels';
import { isOnboardingComplete, onboardingSteps, type OnboardingState } from './onboarding';

const DONE: OnboardingState = {
  hasProducts: true,
  isAiConfigured: true,
  channelSetup: ChannelSetup.Imported,
};

describe('onboardingSteps', () => {
  it('names every connectable channel, not only Shopify', () => {
    const steps = onboardingSteps({ ...DONE, channelSetup: ChannelSetup.NotConnected });
    expect(steps[1]?.description).toBe(
      'Connect Shopify, eBay, Mercado Libre or WooCommerce to sync products and stock.',
    );
  });

  it('asks a connected store to import its products', () => {
    const steps = onboardingSteps({ ...DONE, channelSetup: ChannelSetup.Connected });
    expect(steps[1]).toMatchObject({ title: 'Import products from your store', done: false });
  });

  it('links the third step to Settings -> AI based on native AI configuration', () => {
    const steps = onboardingSteps({ ...DONE, isAiConfigured: false });
    expect(steps[2]).toMatchObject({
      title: 'Configure AI',
      to: ROUTES.aiSettings,
      done: false,
    });
  });
});

describe('isOnboardingComplete', () => {
  it('is complete only when every step is done', () => {
    expect(isOnboardingComplete(DONE)).toBe(true);
    expect(isOnboardingComplete({ ...DONE, isAiConfigured: false })).toBe(false);
    expect(isOnboardingComplete({ ...DONE, channelSetup: ChannelSetup.Connected })).toBe(false);
  });
});
