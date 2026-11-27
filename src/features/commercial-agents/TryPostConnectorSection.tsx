import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Plus, Settings2 } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { ChannelConnectionStatus } from '@/api/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChannelLogo } from '@/features/channels/components/ChannelLogo';
import { ConnectionStatusBadge } from '@/features/channels/components/ConnectionStatusBadge';
import { useI18n } from '@/lib/i18n';
import trypostLogo from './assets/logos/trypost.svg';
import { socialMarketingApi } from './social-api';

const TRYPOST_LOGO = { src: trypostLogo } as const;

interface TryPostConnectorSectionProps {
  workspaceId: string;
  canManage: boolean;
}

/**
 * Marketing connector card for TryPost, matching native Crossmart connector cards
 * (`ConnectableChannelCard`, `OdooConnectorCard`, `ChatwootConnectorSection`):
 * - Uses `ChannelLogo`, `ConnectionStatusBadge` / `Available` badge, native typography,
 *   and compact `Manage` (`Settings2`) / `Connect` (`Plus`) footer buttons.
 */
export function TryPostConnectorSection({ workspaceId, canManage }: TryPostConnectorSectionProps) {
  const { t, tp } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const { data } = useQuery({
    queryKey: ['trypost-connection', workspaceId],
    queryFn: () => socialMarketingApi.getTryPost(workspaceId),
  });

  const conn = data?.connection ?? null;
  const isConnected = conn?.status === 'CONNECTED';
  const badgeStatus = isConnected
    ? ChannelConnectionStatus.CONNECTED
    : conn?.status === 'ERROR'
      ? ChannelConnectionStatus.ERROR
      : null;

  const testMutation = useMutation({
    mutationFn: () =>
      socialMarketingApi.testTryPost(workspaceId, {
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
      }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(
          t('TryPost connected ({count} social account(s) found)').replace(
            '{count}',
            String(res.channels.length),
          ),
        );
      } else {
        toast.error(res.error ?? t('Could not connect to TryPost'));
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      socialMarketingApi.upsertTryPost(workspaceId, {
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t('TryPost connected successfully'));
      setApiKey('');
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['trypost-connection', workspaceId] });
      void qc.invalidateQueries({ queryKey: ['social-overview', workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <ChannelLogo logo={TRYPOST_LOGO} />
            {badgeStatus ? (
              <ConnectionStatusBadge status={badgeStatus} />
            ) : (
              <Badge variant="outline">{t('Available')}</Badge>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-medium">TryPost</h2>
            <p className="text-sm text-muted-foreground">
              {t('Editorial calendar, idea bank, drafts, media library, and social analytics.')}
            </p>
          </div>
          {isConnected && (
            <p className="text-sm text-muted-foreground">
              {tp(
                conn.channels.length,
                '1 social account connected',
                '{count} social accounts connected',
              )}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-auto">
          {isConnected ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/stores/trypost">
                <Settings2 data-icon="inline-start" />
                {t('Manage')}
              </Link>
            </Button>
          ) : canManage ? (
            <Button type="button" size="sm" onClick={() => setOpen(true)}>
              <Plus data-icon="inline-start" />
              {t('Connect')}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('Ask a workspace admin to connect it.')}
            </p>
          )}
        </CardFooter>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Connect TryPost')}</DialogTitle>
            <DialogDescription>
              {t(
                'Connect your TryPost workspace using an official REST API key. Individual social network passwords are never requested.',
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tp-api-key">{t('TryPost API Key')}</Label>
              <Input
                id="tp-api-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="tp_..."
              />
            </div>

            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowAdvanced((prev) => !prev)}
            >
              {showAdvanced ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
              {t('Advanced options (self-hosted instance)')}
            </button>

            {showAdvanced && (
              <div className="space-y-1.5">
                <Label htmlFor="tp-url">{t('TryPost Base URL')}</Label>
                <Input
                  id="tp-url"
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="https://app.trypost.it/api"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!apiKey.trim() || testMutation.isPending}
              onClick={() => testMutation.mutate()}
            >
              {testMutation.isPending ? t('Testing...') : t('Test connection')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!apiKey.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? t('Saving...') : t('Connect')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
