import { CopyableValue } from '@/components/forms/CopyableValue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { env } from '@/config/env';
import { useI18n } from '@/lib/i18n';
import { AGENT_FEEDBACK } from '../agents.constants';

/** How to connect an assistant: the server address to add as a connector, then sign in. */
export function ConnectAgentCard() {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('Connect an AI assistant')}</h2>
        </CardTitle>
        <CardDescription>
          {t(
            'In Claude, ChatGPT, Gemini or any assistant that supports MCP, add a custom connector with this address. It asks you to sign in, pick a workspace and choose what it may do.',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CopyableValue
          value={env.mcpUrl}
          copyLabel={t('Copy address')}
          copiedMessage={t(AGENT_FEEDBACK.mcpUrlCopied)}
        />
      </CardContent>
    </Card>
  );
}
