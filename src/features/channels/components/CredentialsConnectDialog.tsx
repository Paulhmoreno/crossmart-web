import { CheckCircle2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { FormError } from '@/components/feedback/FormError';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import {
  CREDENTIALS_DIALOG_COPY,
  type CredentialFieldPrompt,
  type CredentialsConnectableChannel,
} from '../channels.constants';
import type { TestedCredentials } from '../channels.types';
import { type CredentialValues, isComplete, toSellerCredentials } from '../credentials-form';
import {
  useConnectWithCredentials,
  useTestChannelCredentials,
} from '../hooks/useChannelConnections';
import { CredentialField } from './CredentialField';
import type { ConnectDialogProps } from './OAuthConnectDialog';

const FORM_ID = 'connect-credentials-form';
const NO_VALUES: CredentialValues = {};

function GuideLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium text-foreground underline"
    >
      {label}
      <ExternalLink className="size-3" aria-hidden="true" />
    </a>
  );
}

function TestedBanner({ result }: { result: TestedCredentials }) {
  const woo = result.woocommerce;
  if (!woo) {
    return (
      <output className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-950 dark:text-emerald-100">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
        <div>
          <p className="font-medium">Conexión verificada: {result.displayName}</p>
        </div>
      </output>
    );
  }
  const mediaLabel = woo.hasWordPressMediaAuth
    ? `Habilitada (${woo.wpUsername ?? 'WordPress'})`
    : 'Solo URLs públicas HTTPS (sin contraseña de aplicación WordPress)';
  return (
    <output className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-950 dark:text-emerald-100">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">
          Conexión verificada: {woo.storeName} ({woo.currencyCode})
        </p>
        <p className="text-xs opacity-90">
          Productos remotos detectados: {woo.remoteProductCount ?? '—'} · Subida de fotos:{' '}
          {mediaLabel}
        </p>
      </div>
    </output>
  );
}

interface AdvancedFieldsProps {
  fields: readonly CredentialFieldPrompt[];
  values: CredentialValues;
  onChange: (values: CredentialValues) => void;
  disabled: boolean;
  expanded: boolean;
  onToggle: () => void;
  toggleLabel: string;
  hint?: string;
}

function AdvancedFieldsSection({
  fields,
  values,
  onChange,
  disabled,
  expanded,
  onToggle,
  toggleLabel,
  hint,
}: AdvancedFieldsProps) {
  if (fields.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border/70 bg-muted/20 p-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex items-center gap-1.5 text-left text-sm font-medium text-foreground"
      >
        {expanded ? (
          <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        )}
        {toggleLabel}
      </button>
      {expanded && (
        <div className="flex flex-col gap-3">
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          <FieldGroup>
            {fields.map((field) => (
              <CredentialField
                key={field.key}
                field={field}
                value={values[field.key] ?? ''}
                onChange={(value) => onChange({ ...values, [field.key]: value })}
                disabled={disabled}
              />
            ))}
          </FieldGroup>
        </div>
      )}
    </div>
  );
}

interface CredentialsFormProps {
  fields: CredentialsConnectableChannel['fields'];
  values: CredentialValues;
  onChange: (values: CredentialValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  advancedExpanded: boolean;
  onToggleAdvanced: () => void;
  advancedToggleLabel: string;
  advancedHint?: string;
}

function CredentialsForm({
  fields,
  values,
  onChange,
  onSubmit,
  disabled,
  advancedExpanded,
  onToggleAdvanced,
  advancedToggleLabel,
  advancedHint,
}: CredentialsFormProps) {
  const basicFields = fields.filter((field) => !field.advanced);
  const advancedFields = fields.filter((field) => field.advanced);
  return (
    <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4">
      <FieldGroup>
        {basicFields.map((field) => (
          <CredentialField
            key={field.key}
            field={field}
            value={values[field.key] ?? ''}
            onChange={(value) => onChange({ ...values, [field.key]: value })}
            disabled={disabled}
          />
        ))}
      </FieldGroup>
      <AdvancedFieldsSection
        fields={advancedFields}
        values={values}
        onChange={onChange}
        disabled={disabled}
        expanded={advancedExpanded}
        onToggle={onToggleAdvanced}
        toggleLabel={advancedToggleLabel}
        hint={advancedHint}
      />
    </form>
  );
}

interface CredentialsDialogActionsProps {
  busy: boolean;
  testing: boolean;
  ready: boolean;
  supportsTest: boolean;
  cancelLabel: string;
  testLabel: string;
  submitLabel: string;
  onCancel: () => void;
  onTest: () => void;
}

function CredentialsDialogActions({
  busy,
  testing,
  ready,
  supportsTest,
  cancelLabel,
  testLabel,
  submitLabel,
  onCancel,
  onTest,
}: CredentialsDialogActionsProps) {
  return (
    <DialogFooter className="gap-2 sm:justify-between">
      <Button variant="outline" type="button" onClick={onCancel} disabled={busy}>
        {cancelLabel}
      </Button>
      <div className="flex flex-wrap justify-end gap-2">
        {supportsTest && (
          <Button variant="secondary" type="button" onClick={onTest} disabled={busy || !ready}>
            {testing && <Spinner data-icon="inline-start" />}
            {testLabel}
          </Button>
        )}
        <Button type="submit" form={FORM_ID} disabled={busy || !ready}>
          {busy && !testing && <Spinner data-icon="inline-start" />}
          {submitLabel}
        </Button>
      </div>
    </DialogFooter>
  );
}

/** Asks for the API details the channel issued, optionally tests them, and connects. */
export function CredentialsConnectDialog({
  workspaceId,
  channel,
  connect,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ConnectDialogProps<CredentialsConnectableChannel>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const [values, setValues] = useState<CredentialValues>(NO_VALUES);
  const connectStore = useConnectWithCredentials(workspaceId);
  const testStore = useTestChannelCredentials(workspaceId);
  const isBusy = connectStore.isPending || testStore.isPending;

  const title = connect.copy?.title ?? `Connect ${channel.name}`;
  const description = connect.copy?.description ?? CREDENTIALS_DIALOG_COPY.description;
  const guideLabel = connect.copy?.guide ?? CREDENTIALS_DIALOG_COPY.guide;
  const submitLabel = connect.copy?.submit ?? CREDENTIALS_DIALOG_COPY.submit;
  const cancelLabel = connect.copy?.cancel ?? CREDENTIALS_DIALOG_COPY.cancel;
  const testLabel = connect.copy?.test ?? CREDENTIALS_DIALOG_COPY.test;
  const advancedToggleLabel = connect.copy?.advancedToggle ?? 'Advanced options';

  function handleOpenChange(nextOpen: boolean) {
    if (isBusy) return;
    setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setValues(NO_VALUES);
      setAdvancedExpanded(false);
      connectStore.reset();
      testStore.reset();
    }
  }

  function handleValuesChange(nextValues: CredentialValues) {
    setValues(nextValues);
    if (testStore.data || testStore.error) testStore.reset();
  }

  function handleTest() {
    const credentials = toSellerCredentials(values, connect.type);
    if (credentials) {
      connectStore.reset();
      testStore.mutate({ channel: connect.type, credentials });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const credentials = toSellerCredentials(values, connect.type);
    if (credentials) connectStore.mutate({ channel: connect.type, credentials });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description} <GuideLink href={connect.guideUrl} label={guideLabel} />
          </DialogDescription>
        </DialogHeader>
        <FormError error={connectStore.error ?? testStore.error} />
        {testStore.data && <TestedBanner result={testStore.data} />}
        <CredentialsForm
          fields={connect.fields}
          values={values}
          onChange={handleValuesChange}
          onSubmit={handleSubmit}
          disabled={isBusy}
          advancedExpanded={advancedExpanded}
          onToggleAdvanced={() => setAdvancedExpanded((current) => !current)}
          advancedToggleLabel={advancedToggleLabel}
          advancedHint={connect.copy?.advancedHint}
        />
        <CredentialsDialogActions
          busy={isBusy}
          testing={testStore.isPending}
          ready={isComplete(connect.fields, values)}
          supportsTest={Boolean(connect.supportsTest)}
          cancelLabel={cancelLabel}
          testLabel={testLabel}
          submitLabel={submitLabel}
          onCancel={() => handleOpenChange(false)}
          onTest={handleTest}
        />
      </DialogContent>
    </Dialog>
  );
}
