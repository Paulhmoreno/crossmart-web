import { CircleAlert, CircleCheck, Info, type LucideIcon, TriangleAlert } from 'lucide-react';
import { WorkspaceEventSeverity } from '@/api/schema';
import {
  ReviewSource,
  toAgentReviewRoute,
  toStoreRoute,
  toOrderRoute,
  toProductRoute,
  toWebhookEndpointRoute,
} from '@/config/routes';
import { CATALOG_NODE_ID } from '@/features/channel-map';
import { t, tp } from '@/lib/i18n';
import { AGENT_CONSOLE_COPY } from './agent-console.constants';
import type { WorkspaceEvent } from './agent-console.types';

/** Each severity's icon and colour; the icon and words carry it too, never colour alone. */
export const SEVERITY_PRESENTATION: Record<
  WorkspaceEventSeverity,
  { icon: LucideIcon; iconClass: string }
> = {
  [WorkspaceEventSeverity.info]: { icon: Info, iconClass: 'text-muted-foreground' },
  [WorkspaceEventSeverity.success]: { icon: CircleCheck, iconClass: 'text-success' },
  [WorkspaceEventSeverity.warning]: { icon: TriangleAlert, iconClass: 'text-warning' },
  [WorkspaceEventSeverity.error]: { icon: CircleAlert, iconClass: 'text-destructive' },
};

/** Who did it: "Claude for Dana", "Crossmart Agent", the API key's name, or Crossmart. */
function baseActorLabel({ actor }: WorkspaceEvent): string {
  if (actor.agentName && actor.name) {
    return t('{agent} for {person}', { agent: t(actor.agentName), person: actor.name });
  }
  return actor.agentName ? t(actor.agentName) : (actor.name ?? AGENT_CONSOLE_COPY.system);
}

/** The actor, and who approved the change when an outside agent proposed it (ADR 0028). */
export function actorLabel(event: WorkspaceEvent): string {
  const label = baseActorLabel(event);
  const approver = event.actor.approvedByName;
  return approver ? t('{actor}, approved by {person}', { actor: label, person: approver }) : label;
}

const STORE_PATTERNS: readonly { pattern: RegExp; key: string }[] = [
  {
    pattern: /^AI suggested new content for (.+) on (.+)$/,
    key: 'AI suggested new content for {subject} on {store}',
  },
  {
    pattern: /^Changed the channel overrides of (.+) on (.+)$/,
    key: 'Changed the channel overrides of {subject} on {store}',
  },
  {
    pattern: /^Changed the item specifics of (.+) on (.+)$/,
    key: 'Changed the item specifics of {subject} on {store}',
  },
  {
    pattern: /^Changed the channel category of (.+) on (.+)$/,
    key: 'Changed the channel category of {subject} on {store}',
  },
  {
    pattern: /^Updated the listing of (.+) on (.+)$/,
    key: 'Updated the listing of {subject} on {store}',
  },
  {
    pattern: /^Asked to publish (.+) again on (.+)$/,
    key: 'Asked to publish {subject} again on {store}',
  },
  {
    pattern: /^Published (.+) on (.+)$/,
    key: 'Published {subject} on {store}',
  },
  {
    pattern: /^Added (.+) to (.+)$/,
    key: 'Added {subject} to {store}',
  },
];

const PREFIX_PATTERNS: readonly { pattern: RegExp; key: string }[] = [
  { pattern: /^Approved a suggestion for (.+)$/, key: 'Approved a suggestion for {subject}' },
  { pattern: /^Rejected a suggestion for (.+)$/, key: 'Rejected a suggestion for {subject}' },
  { pattern: /^AI suggested new content for (.+)$/, key: 'AI suggested new content for {subject}' },
  {
    pattern: /^Asked AI to write content for (.+)$/,
    key: 'Asked AI to write content for {subject}',
  },
  {
    pattern: /^Changed the channel overrides of (.+)$/,
    key: 'Changed the channel overrides of {subject}',
  },
  {
    pattern: /^Changed the item specifics of (.+)$/,
    key: 'Changed the item specifics of {subject}',
  },
  { pattern: /^Updated AI configuration (.+)$/, key: 'Updated AI configuration {subject}' },
  { pattern: /^Connected WooCommerce (.+)$/, key: 'Connected WooCommerce {subject}' },
  { pattern: /^Connected Shopify (.+)$/, key: 'Connected Shopify {subject}' },
  { pattern: /^Connected eBay (.+)$/, key: 'Connected eBay {subject}' },
  { pattern: /^Updated product (.+)$/, key: 'Updated product {subject}' },
  { pattern: /^Created product (.+)$/, key: 'Created product {subject}' },
  { pattern: /^Deleted product (.+)$/, key: 'Deleted product {subject}' },
  { pattern: /^Published (.+)$/, key: 'Published {subject}' },
];

function formatSuggestionEvent(summary: string): string | null {
  const match =
    /^(Approved|Rejected) a suggestion for (.+): (title and description|title|description) on (.+)$/.exec(
      summary,
    );
  if (!match) return null;
  const [, verb, subject = '', field = '', store = ''] = match;
  const key =
    verb === 'Approved'
      ? 'Approved a suggestion for {subject}: {field} on {store}'
      : 'Rejected a suggestion for {subject}: {field} on {store}';
  return t(key, { subject, field: t(field), store });
}

function formatOdooEvent(summary: string): string | null {
  const started = /^Started Odoo sync (.+): (selected products|full catalog)$/.exec(summary);
  if (started) {
    const [, target = '', mode = ''] = started;
    return t('Started Odoo sync {target}: {mode}', { target, mode: t(mode) });
  }
  const syncedFull =
    /^Synced (\d+) products? from Odoo (.+): (\d+) new, (\d+) updated, (\d+) failed$/.exec(summary);
  if (syncedFull) {
    const [, countText, target = '', created = '0', updated = '0', failed = '0'] = syncedFull;
    const count = Number(countText);
    const prefix = tp(
      count,
      'Synced {count} product from Odoo',
      'Synced {count} products from Odoo',
    );
    return `${prefix} ${target}: ${t('{created} new, {updated} updated, {failed} failed', { created, updated, failed })}`;
  }
  const syncedOdoo = /^Synced (\d+) products? from Odoo(.*)$/.exec(summary);
  if (syncedOdoo) {
    const [, countText, trailing = ''] = syncedOdoo;
    const count = Number(countText);
    return `${tp(count, 'Synced {count} product from Odoo', 'Synced {count} products from Odoo')}${trailing}`;
  }
  return null;
}

function formatCatalogEvent(summary: string): string | null {
  const askedAi = /^Asked AI to write content for (\d+) products? on (.+)$/.exec(summary);
  if (askedAi) {
    const [, countText, store = ''] = askedAi;
    return tp(
      Number(countText),
      'Asked AI to write content for {count} product on {store}',
      'Asked AI to write content for {count} products on {store}',
      { store },
    );
  }
  const stock = /^Adjusted stock of (.+): (.+) (received|count correction|sold)$/.exec(summary);
  if (stock) {
    const [, subject = '', amount = '', reason = ''] = stock;
    return t('Adjusted stock of {subject}: {amount} {reason}', {
      subject,
      amount,
      reason: t(reason),
    });
  }
  const bulkTags = /^Bulk edited (\d+) products?: added tags (.+)$/.exec(summary);
  if (bulkTags) {
    const [, countText, tags = ''] = bulkTags;
    const prefix = tp(
      Number(countText),
      'Bulk edited {count} product',
      'Bulk edited {count} products',
    );
    return `${prefix}: ${t('added tags {tags}', { tags })}`;
  }
  const bulkEdited = /^Bulk edited (\d+) products?: (.+)$/.exec(summary);
  if (bulkEdited) {
    const [, countText, detail = ''] = bulkEdited;
    return `${tp(Number(countText), 'Bulk edited {count} product', 'Bulk edited {count} products')}: ${detail}`;
  }
  const readFound = /^Read: (.+) · (\d+) found$/.exec(summary);
  if (readFound) {
    const [, tool = '', countText = '0'] = readFound;
    return t('Read: {tool} · {outcome}', {
      tool: t(tool),
      outcome: t('{count} found', { count: countText }),
    });
  }
  const readOnly = /^Read: (.+)$/.exec(summary);
  if (readOnly) {
    const [, tool = ''] = readOnly;
    return t('Read: {tool}', { tool: t(tool) });
  }
  return null;
}

/** Localizes known structured event details at the UI boundary without altering stored records. */
export function formatEventDetail(detail: string): string {
  const exact = t(detail);
  if (exact !== detail) return exact;
  const found = /^(\d+) found$/.exec(detail);
  if (found) {
    const [, countText = '0'] = found;
    return t('{count} found', { count: countText });
  }
  return detail;
}

/** Localizes known structured event summaries at the UI boundary without altering stored records. */
export function formatEventSummary(summary: string): string {
  const exact = t(summary);
  if (exact !== summary) return exact;
  const structured =
    formatSuggestionEvent(summary) ?? formatOdooEvent(summary) ?? formatCatalogEvent(summary);
  if (structured) return structured;
  for (const { pattern, key } of STORE_PATTERNS) {
    const match = pattern.exec(summary);
    if (match) {
      const [, subject = '', store = ''] = match;
      return t(key, { subject, store });
    }
  }
  for (const { pattern, key } of PREFIX_PATTERNS) {
    const match = pattern.exec(summary);
    if (match?.[1]) return t(key, { subject: match[1] });
  }
  return summary;
}

/** The map node an event is about: its store, else the catalog for a product; null for neither. */
export function eventNodeId({ refs }: WorkspaceEvent): string | null {
  if (refs.connectionId) return refs.connectionId;
  return refs.productId ? CATALOG_NODE_ID : null;
}

/** The page that shows what an event is about, the most specific first; null when none does. */
export function eventRoute({ refs }: WorkspaceEvent): string | null {
  if (refs.proposalId) return toAgentReviewRoute(ReviewSource.Proposals);
  if (refs.orderId) return toOrderRoute(refs.orderId);
  if (refs.productId) return toProductRoute(refs.productId);
  if (refs.webhookEndpointId) return toWebhookEndpointRoute(refs.webhookEndpointId);
  if (refs.connectionId) return toStoreRoute(refs.connectionId);
  return null;
}
