import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import type { FeatureUsage } from '../plan.types';
import { meteredFeatures } from '../usage';
import { UsageMeter } from './UsageMeter';

/** Every counted feature of the plan, with its meter. */
export function UsageMeterList({ features }: { features: readonly FeatureUsage[] }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Usage')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {meteredFeatures(features).map((feature) => (
          <UsageMeter key={feature.feature} feature={feature} />
        ))}
      </CardContent>
    </Card>
  );
}
