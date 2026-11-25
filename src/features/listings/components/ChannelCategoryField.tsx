import { Search } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { ChannelType } from '@/api/schema';
import { FormError } from '@/components/feedback/FormError';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { ProductChannelRef } from '../hooks/useProductChannels';
import { useCategorySuggestions, useChooseListingCategory } from '../hooks/useListingCategory';
import { CATEGORY_COPY, WOOCOMMERCE_CATEGORY_COPY } from '../listings.constants';
import type { ChannelCategory } from '../listings.types';

const ENTER_KEY = 'Enter';
const SEARCH_INPUT_ID = 'channel-category-search';

type CategoryCopy = typeof CATEGORY_COPY | typeof WOOCOMMERCE_CATEGORY_COPY;

function copyForChannel(channel?: ChannelType): CategoryCopy {
  if (channel === ChannelType.woocommerce) return WOOCOMMERCE_CATEGORY_COPY;
  return CATEGORY_COPY;
}

interface ChannelCategoryFieldProps {
  channelRef: ProductChannelRef;
  /** The category the listing is in, chosen or picked on its first publish. */
  category: ChannelCategory | null;
  /** Channel type so the field uses channel-appropriate wording (e.g. WooCommerce vs eBay). */
  channel?: ChannelType;
}

function SuggestionList({
  suggestions,
  onChoose,
  disabled,
  noResults,
}: {
  suggestions: readonly ChannelCategory[];
  onChoose: (category: ChannelCategory) => void;
  disabled: boolean;
  noResults: string;
}) {
  if (suggestions.length === 0) {
    return <p className="text-sm text-muted-foreground">{noResults}</p>;
  }
  return (
    <ul className="flex flex-col gap-1" aria-label="Suggested categories">
      {suggestions.map((suggestion) => (
        <li key={suggestion.id}>
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start text-left whitespace-normal"
            disabled={disabled}
            onClick={() => onChoose(suggestion)}
          >
            {suggestion.name}
          </Button>
        </li>
      ))}
    </ul>
  );
}

function CategorySearch({
  onSearch,
  isSearching,
  copy,
}: {
  onSearch: (keywords: string) => void;
  isSearching: boolean;
  copy: CategoryCopy;
}) {
  const [keywords, setKeywords] = useState('');
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter searches; it must not submit the override form around the field.
    if (event.key !== ENTER_KEY) return;
    event.preventDefault();
    onSearch(keywords.trim());
  };
  return (
    <div className="flex gap-2">
      <Input
        id={SEARCH_INPUT_ID}
        aria-label={copy.searchLabel}
        placeholder={copy.searchPlaceholder}
        value={keywords}
        onChange={(event) => setKeywords(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <Button type="button" variant="outline" onClick={() => onSearch(keywords.trim())}>
        {isSearching ? <Spinner data-icon="inline-start" /> : <Search data-icon="inline-start" />}
        {copy.search}
      </Button>
    </div>
  );
}

/**
 * The channel category the listing goes in: the current one, and a search through the channel's
 * suggestions to change it. A choice is saved at once, apart from the sheet's other fields.
 */
export function ChannelCategoryField({ channelRef, category, channel }: ChannelCategoryFieldProps) {
  const copy = copyForChannel(channel);
  const [search, setSearch] = useState<string | null>(null);
  const suggestions = useCategorySuggestions(channelRef, search);
  const choose = useChooseListingCategory(channelRef);
  const pick = (next: ChannelCategory | null) =>
    choose.mutate(next, { onSuccess: () => setSearch(null) });
  return (
    <Field>
      <FieldLabel htmlFor={SEARCH_INPUT_ID}>{copy.label}</FieldLabel>
      <p className="text-sm">{category ? category.name : copy.automatic}</p>
      <CategorySearch onSearch={setSearch} isSearching={suggestions.isFetching} copy={copy} />
      {suggestions.data && (
        <SuggestionList
          suggestions={suggestions.data}
          onChoose={pick}
          disabled={choose.isPending}
          noResults={copy.noResults}
        />
      )}
      <FormError error={suggestions.error ?? choose.error} />
      <FieldDescription>
        {copy.savedNote}{' '}
        {category && (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            disabled={choose.isPending}
            onClick={() => pick(null)}
          >
            {copy.useSuggested}
          </Button>
        )}
      </FieldDescription>
    </Field>
  );
}
