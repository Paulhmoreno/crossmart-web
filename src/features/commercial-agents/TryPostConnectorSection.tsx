import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ChannelConnectionStatus } from '@/api/schema';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ConnectionStatusBadge } from '@/features/channels/components/ConnectionStatusBadge';
import { useI18n } from '@/lib/i18n';
import trypostLogo from './assets/logos/trypost.svg';
import { socialMarketingApi } from './social-api';

interface TryPostConnectorSectionProps {
  workspaceId: string;
  canManage: boolean;
}

export function TryPostConnectorSection({ workspaceId, canManage }: TryPostConnectorSectionProps) {
  const { t } = useI18n();
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
      <Card className="flex flex-col justify-between">
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between gap-2">
            <img src={trypostLogo} alt="TryPost" className="size-8 rounded-md object-contain" />
            {badgeStatus && <ConnectionStatusBadge status={badgeStatus} />}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">TryPost</CardTitle>
            <CardDescription className="text-xs">
              {isConnected
                ? t('{count} social account(s) connected').replace(
                    '{count}',
                    String(conn.channels.length),
                  )
                : t('Editorial calendar, idea bank, drafts, media library, and social analytics.')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardFooter>
          {isConnected ? (
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/stores/trypost">{t('Manage')}</Link>
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full"
              disabled={!canManage}
              onClick={() => setOpen(true)}
            >
              {t('Connect')}
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Connect TryPost')}</DialogTitle>
            <DialogDescription>
              {t('Connect your TryPost workspace using an official REST API key. Individual social network passwords are never requested.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tp-api-key">{t('TryPost API Key')}</Label>
              <Input
                id="tp-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="tp_..."
              />
            </div>

            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              {t('Advanced options (self-hosted instance)')}
            </button>

            {showAdvanced && (
              <div className="space-y-1.5">
                <Label htmlFor="tp-url">{t('TryPost Base URL')}</Label>
                <Input
                  id="tp-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
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
