import { Mail } from 'lucide-react';
import { channelRequestMailto } from '@/config/links';
import { useI18n } from '@/lib/i18n';
import { REQUEST_CHANNEL_COPY as COPY } from '../channels.constants';

/** The one way to ask for a channel Crossmart cannot connect yet, under the stores. */
export function RequestChannelLink() {
  const { t } = useI18n();
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      {t(COPY.prompt)}
      <a
        href={channelRequestMailto()}
        className="inline-flex items-center gap-1.5 font-medium text-foreground underline underline-offset-4 hover:no-underline"
      >
        <Mail className="size-4" aria-hidden="true" />
        {t(COPY.action)}
      </a>
    </p>
  );
}
