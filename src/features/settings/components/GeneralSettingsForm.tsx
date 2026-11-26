import { FormError } from '@/components/feedback/FormError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, FieldSeparator } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { OutsideAgentChangesField } from '@/features/agent-proposals';
import { TimeZoneField, type Workspace, WorkspaceNameField } from '@/features/workspaces';
import { useI18n } from '@/lib/i18n';
import { useGeneralSettingsForm } from '../hooks/useGeneralSettingsForm';
import { SETTINGS_COPY as COPY } from '../settings.constants';

/** The workspace's name, time zone and outside agents' setting, with one Save. */
export function GeneralSettingsForm({ workspace }: { workspace: Workspace }) {
  const form = useGeneralSettingsForm(workspace);
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t(COPY.workspaceTitle)}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.submit} className="flex flex-col gap-6">
          <FormError error={form.error} />
          <FieldGroup>
            <WorkspaceNameField
              label={t(COPY.nameLabel)}
              value={form.values.name}
              onChange={(name) => form.set('name', name)}
              description={t('Catalog currency: {currency}. It cannot change.', {
                currency: workspace.currency,
              })}
            />
            <TimeZoneField
              label={t(COPY.timeZoneLabel)}
              value={form.values.timeZone}
              onChange={(zone) => form.set('timeZone', zone)}
              description={t(COPY.timeZoneNote)}
            />
            <FieldSeparator />
            <OutsideAgentChangesField
              value={form.values.outsideAgentChanges}
              onChange={(choice) => form.set('outsideAgentChanges', choice)}
            />
          </FieldGroup>
          <Button type="submit" className="self-start" disabled={!form.canSave}>
            {form.isSaving && <Spinner data-icon="inline-start" />}
            {t(COPY.save)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
