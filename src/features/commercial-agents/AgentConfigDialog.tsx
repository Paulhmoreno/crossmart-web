import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OctagonX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import {
  type AgentConfigView,
  commercialAgentsApi,
  type InternalAgentKey,
  type SalesAgentMode,
} from './api';

const DEFAULT_CONNECTION = '__default__';
const NONE_CONNECTION = '__none__';

interface AgentConfigDialogProps {
  workspaceId: string;
  agentKey: InternalAgentKey;
  config: AgentConfigView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Per-agent configuration modal opened from the discrete gear icon next to the agent selector. */
export function AgentConfigDialog({
  workspaceId,
  agentKey,
  config,
  open,
  onOpenChange,
}: AgentConfigDialogProps) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data: aiConnections = [] } = useQuery({
    queryKey: ['ai-connections', workspaceId],
    queryFn: () => commercialAgentsApi.listAiConnections(workspaceId),
  });

  const { data: chatwootConnections = [] } = useQuery({
    queryKey: ['chatwoot-connections', workspaceId],
    queryFn: () => commercialAgentsApi.listChatwoot(workspaceId),
    enabled: agentKey === 'sales',
  });

  const [aiConnectionId, setAiConnectionId] = useState(config.aiConnectionId ?? DEFAULT_CONNECTION);
  const [model, setModel] = useState(config.model ?? '');
  const [chatwootConnectionId, setChatwootConnectionId] = useState(
    config.chatwootConnectionId ?? NONE_CONNECTION,
  );
  const [authorizedInboxIds, setAuthorizedInboxIds] = useState<number[]>(config.authorizedInboxIds);
  const [salesMode, setSalesMode] = useState<SalesAgentMode>(config.salesMode);
  const [businessName, setBusinessName] = useState(config.commercialPolicy.businessName ?? '');
  const [paymentNotes, setPaymentNotes] = useState(config.commercialPolicy.paymentNotes ?? '');
  const [deliveryNotes, setDeliveryNotes] = useState(config.commercialPolicy.deliveryNotes ?? '');
  const [warrantyNotes, setWarrantyNotes] = useState(config.commercialPolicy.warrantyNotes ?? '');

  const selectedAi = aiConnections.find((conn) => conn.id === aiConnectionId) ?? null;
  const selectedChatwoot =
    chatwootConnections.find((conn) => conn.id === chatwootConnectionId) ?? null;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['internal-agent-configs', workspaceId] });
    void qc.invalidateQueries({ queryKey: ['ai-connections', workspaceId] });
  };

  const save = useMutation({
    mutationFn: () =>
      commercialAgentsApi.updateAgentConfig(workspaceId, agentKey, {
        aiConnectionId: aiConnectionId === DEFAULT_CONNECTION ? null : aiConnectionId,
        model: model.trim() || null,
        ...(agentKey === 'sales'
          ? {
              chatwootConnectionId:
                chatwootConnectionId === NONE_CONNECTION ? null : chatwootConnectionId,
              authorizedInboxIds,
              salesMode,
              commercialPolicy: {
                businessName: businessName.trim() || null,
                paymentNotes: paymentNotes.trim() || null,
                deliveryNotes: deliveryNotes.trim() || null,
                warrantyNotes: warrantyNotes.trim() || null,
              },
            }
          : {}),
      }),
    onSuccess: () => {
      toast.success(t('Agent settings saved'));
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stopAuto = useMutation({
    mutationFn: () => commercialAgentsApi.stopSalesAgent(workspaceId),
    onSuccess: () => {
      setSalesMode('DISABLED');
      toast.success(t('Automatic sales responses stopped'));
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function toggleInbox(id: number) {
    setAuthorizedInboxIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {agentKey === 'sales' ? t('Sales Agent settings') : t('Crossmart Agent settings')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="agent-ai-conn">{t('AI connection')}</FieldLabel>
            <Select
              value={aiConnectionId}
              onValueChange={(next) => {
                setAiConnectionId(next);
                const found = aiConnections.find((conn) => conn.id === next);
                if (found && !model.trim()) setModel(found.defaultModel);
              }}
            >
              <SelectTrigger id="agent-ai-conn">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_CONNECTION}>
                  {t('Workspace default connection')}
                </SelectItem>
                {aiConnections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id}>
                    {conn.name} ({conn.defaultModel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="agent-model">{t('Primary LLM model')}</FieldLabel>
            <Input
              id="agent-model"
              list="agent-model-options"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={selectedAi?.defaultModel ?? t('Use connection default model')}
            />
            {selectedAi && selectedAi.availableModels.length > 0 && (
              <datalist id="agent-model-options">
                {selectedAi.availableModels.map((id) => (
                  <option key={id} value={id} />
                ))}
              </datalist>
            )}
          </Field>

          {agentKey === 'sales' && (
            <>
              <Field>
                <FieldLabel htmlFor="sales-mode">{t('Attention mode')}</FieldLabel>
                <Select
                  value={salesMode}
                  onValueChange={(val) => setSalesMode(val as SalesAgentMode)}
                >
                  <SelectTrigger id="sales-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISABLED">{t('Disabled')}</SelectItem>
                    <SelectItem value="SUPERVISED">{t('Supervised (private drafts)')}</SelectItem>
                    <SelectItem value="AUTOMATIC">{t('Automatic')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="sales-chatwoot">{t('Communication connection')}</FieldLabel>
                <Select value={chatwootConnectionId} onValueChange={setChatwootConnectionId}>
                  <SelectTrigger id="sales-chatwoot">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_CONNECTION}>{t('None (simulator only)')}</SelectItem>
                    {chatwootConnections.map((cw) => (
                      <SelectItem key={cw.id} value={cw.id}>
                        {cw.name} ({cw.accountName ?? cw.baseUrl})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {selectedChatwoot && selectedChatwoot.inboxes.length > 0 && (
                <Field>
                  <FieldLabel>{t('Authorized inboxes')}</FieldLabel>
                  <div className="flex flex-col gap-1.5 rounded-md border p-2.5">
                    {selectedChatwoot.inboxes.map((inbox) => (
                      <label
                        key={inbox.id}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={authorizedInboxIds.includes(inbox.id)}
                          onChange={() => toggleInbox(inbox.id)}
                        />
                        <span>{inbox.name}</span>
                        <span className="text-xs text-muted-foreground">({inbox.channelType})</span>
                      </label>
                    ))}
                  </div>
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="sales-store-name">{t('Store commercial name')}</FieldLabel>
                <Input
                  id="sales-store-name"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="sales-payment">{t('Payment conditions')}</FieldLabel>
                <Textarea
                  id="sales-payment"
                  rows={2}
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="sales-delivery">{t('Delivery conditions')}</FieldLabel>
                <Textarea
                  id="sales-delivery"
                  rows={2}
                  value={deliveryNotes}
                  onChange={(event) => setDeliveryNotes(event.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="sales-warranty">{t('Warranty conditions')}</FieldLabel>
                <Textarea
                  id="sales-warranty"
                  rows={2}
                  value={warrantyNotes}
                  onChange={(event) => setWarrantyNotes(event.target.value)}
                />
              </Field>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {agentKey === 'sales' && config.salesMode === 'AUTOMATIC' && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={stopAuto.isPending}
                onClick={() => stopAuto.mutate()}
              >
                <OctagonX className="size-3.5" />
                {t('Stop automatic responses')}
              </Button>
            )}
          </div>
          <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
            {t('Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
