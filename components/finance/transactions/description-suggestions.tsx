"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import type { DescriptionSuggestion } from "@/lib/api/finance";
import { useDescriptionSuggestions } from "@/lib/query/finance-queries";
import type { Category, TransactionType } from "@/types/finance";

const DEBOUNCE_MS = 200;

/**
 * Past descriptions matching what's being typed, as tappable chips under the
 * description field. Each chip shows the category it was last filed under,
 * since picking one also fills that in for a new entry.
 */
export function DescriptionSuggestions({
  query,
  type,
  open,
  categories,
  onPick,
}: {
  query: string;
  type: TransactionType;
  open: boolean;
  categories: Category[];
  onPick: (suggestion: DescriptionSuggestion) => void;
}) {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data } = useDescriptionSuggestions(debounced, type, open);
  const typed = query.trim().toLowerCase();
  // Hide a chip identical to what's already typed — picking it would change nothing.
  const suggestions = (data ?? []).filter((suggestion) => suggestion.description.trim().toLowerCase() !== typed);

  if (!open || typed.length === 0 || suggestions.length === 0) return null;

  const categoryName = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Previous descriptions">
      {suggestions.map((suggestion) => {
        const category = suggestion.categoryId ? categoryName.get(suggestion.categoryId) : undefined;
        return (
          <button
            key={suggestion.description}
            type="button"
            // Keep focus in the input so the keyboard doesn't drop on mobile.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(suggestion)}
            className="flex min-h-9 max-w-full items-center gap-1.5 rounded-full border bg-secondary/40 px-3 text-left text-xs font-medium transition-colors hover:bg-secondary active:scale-[0.98]"
          >
            <History className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{suggestion.description}</span>
            {category && <span className="shrink-0 text-muted-foreground">· {category}</span>}
          </button>
        );
      })}
    </div>
  );
}
