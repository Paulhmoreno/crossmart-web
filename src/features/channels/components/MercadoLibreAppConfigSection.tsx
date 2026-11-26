import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { FormError } from '@/components/feedback/FormError';
import { CopyableValue } from '@/components/forms/CopyableValue';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { MERCADOLIBRE_APP_CONFIG_ENDPOINT } from '../channels.constants';
import type { MercadoLibreAppConfig, UpdateMercadoLibreAppConfigBody } from '../channels.types';

interface MercadoLibreAppConfigSectionProps {
  workspaceId: string;
  open: boolean;
  onConfiguredChange: (configured: boolean) => void;
}

function appConfigQueryKey(workspaceId: string) {
  return ['mercadolibre-app-config', workspaceId] as const;
}

/**
 * Self-hosted Mercado Libre OAuth App ID / Secret Key editor embedded inside OAuthConnectDialog.
 * Shows credential inputs only when unconfigured or when the instance admin chooses to edit them.
 */
export function MercadoLibreAppConfigSection({
  workspaceId,
  open,
  onConfiguredChange,
}: MercadoLibreAppConfigSectionProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const query = useQuery<MercadoLibreAppConfig>({
    queryKey: appConfigQueryKey(workspaceId),
    enabled: open,
    queryFn: async () => {
      const data = await unwrap(
        fetchClient.GET(MERCADOLIBRE_APP_CONFIG_ENDPOINT, {
          params: { path: { workspaceId } },
        }),
      );
      onConfiguredChange(data.configured);
      return data;
    },
  });

  const save = useMutation<MercadoLibreAppConfig, Error, UpdateMercadoLibreAppConfigBody>({
    meta: { inlineError: true, successMessage: t('Mercado Libre app credentials saved') },
    mutationFn: (body) =>
      unwrap(
        fetchClient.PUT(MERCADOLIBRE_APP_CONFIG_ENDPOINT, {
          params: { path: { workspaceId } },
          body,
        }),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(appConfigQueryKey(workspaceId), updated);
      onConfiguredChange(updated.configured);
      setClientSecret('');
      setEditing(false);
    },
  });

  const config = query.data;
  if (!config) return null;

  const needsSetup = !config.configured;
  const showForm = needsSetup || editing;

  function openEditor() {
    setClientId(config?.clientId ?? '');
    setClientSecret('');
    save.reset();
    setEditing(true);
  }

  function handleSave() {
    const trimmedId = (clientId || config?.clientId || '').trim();
    const trimmedSecret = clientSecret.trim();
    save.mutate({
      clientId: trimmedId,
      ...(trimmedSecret ? { clientSecret: trimmedSecret } : {}),
    });
  }

  if (!showForm) {
    return (
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {t('App ID')}: <code className="font-mono text-foreground">{config.clientId}</code>
        </span>
        {config.canManage && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={openEditor}
          >
            {t('Edit app credentials')}
          </Button>
        )}
      </div>
    );
  }

  if (!config.canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('An instance administrator must configure Mercado Libre OAuth credentials.')}
      </p>
    );
  }

  const effectiveClientId = clientId || config.clientId || '';
  const canSave =
    effectiveClientId.trim().length > 0 &&
    (clientSecret.trim().length > 0 || (config.source === 'database' && config.hasClientSecret));

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <Field>
        <FieldLabel>{t('Redirect URI')}</FieldLabel>
        <CopyableValue
          value={config.redirectUri}
          copyLabel={t('Copy redirect URI')}
          copiedMessage={t('Redirect URI copied')}
        />
      </Field>
      <FormError error={save.error} />
      <Field>
        <FieldLabel htmlFor="ml-app-id">{t('App ID')}</FieldLabel>
        <Input
          id="ml-app-id"
          value={effectiveClientId}
          onChange={(event) => setClientId(event.target.value)}
          placeholder="5503910054141466"
          disabled={save.isPending}
          autoComplete="off"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="ml-app-secret">{t('Secret Key')}</FieldLabel>
        <Input
          id="ml-app-secret"
          type="password"
          value={clientSecret}
          onChange={(event) => setClientSecret(event.target.value)}
          placeholder={
            config.hasClientSecret ? t('Leave blank to keep current secret') : t('Paste Secret Key')
          }
          disabled={save.isPending}
          autoComplete="new-password"
        />
      </Field>
      <div className="flex items-center justify-end gap-2">
        {!needsSetup && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={save.isPending}
            onClick={() => {
              setClientSecret('');
              setEditing(false);
            }}
          >
            {t('Cancel')}
          </Button>
        )}
        <Button type="button" size="sm" disabled={!canSave || save.isPending} onClick={handleSave}>
          {save.isPending && <Spinner data-icon="inline-start" />}
          {t('Save credentials')}
        </Button>
      </div>
    </div>
  );
}
