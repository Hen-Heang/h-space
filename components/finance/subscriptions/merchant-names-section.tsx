"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Combine, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceErrorState } from "@/components/finance/ui/finance-primitives";
import { ApiError } from "@/lib/api/client";
import { getMerchantNames, mergeMerchants, unmergeMerchants, type MerchantMergeSuggestion } from "@/lib/api/finance";
import { krw } from "@/lib/finance-format";
import { financeKeys } from "@/lib/query/finance-queries";

const VISIBLE_SUGGESTIONS = 3;
const DISMISSED_KEY = "luyra:dismissed-merchant-merges";

// "Not the same" is remembered per browser: it only hides a suggestion, it
// doesn't record anything about the user's data, so local storage is enough.
function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(DISMISSED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // Private mode or blocked storage: the suggestion simply comes back next visit.
  }
}

const merchantNamesKey = [...financeKeys.all, "merchant-names"] as const;

/**
 * Lets the user merge spellings of one merchant ("Claude", "Claude AI Pro")
 * so subscriptions count them together. Only suggestions — nothing merges
 * until confirmed — and every merge can be undone. Transactions keep their
 * original descriptions either way.
 */
export function MerchantNamesSection({ onChanged }: { onChanged: () => void }) {
  const queryClient = useQueryClient();
  const names = useQuery({ queryKey: merchantNamesKey, queryFn: getMerchantNames });
  const [dismissed, setDismissed] = useState<Set<string>>(() => (typeof window === "undefined" ? new Set() : readDismissed()));
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function afterChange() {
    await queryClient.invalidateQueries({ queryKey: merchantNamesKey });
    onChanged();
  }

  async function handleMerge(suggestion: MerchantMergeSuggestion, name: string) {
    setBusy(suggestion.id);
    setError(null);
    try {
      await mergeMerchants({ name, keys: suggestion.members.map((member) => member.key) });
      await afterChange();
    } catch (err) {
      setError(err instanceof ApiError && err.status !== undefined && err.status < 500 ? err.message : "Couldn't merge those names. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleUnmerge(name: string) {
    setBusy(`merge:${name}`);
    setError(null);
    try {
      await unmergeMerchants(name);
      await afterChange();
    } catch {
      setError("Couldn't undo that merge. Try again.");
    } finally {
      setBusy(null);
    }
  }

  function dismiss(id: string) {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    writeDismissed(next);
  }

  if (names.isError && !names.data) {
    return (
      <FinanceErrorState
        title="Merchant names unavailable"
        description="We couldn't load merchant name suggestions. Try again in a moment."
        onRetry={() => void names.refetch()}
      />
    );
  }
  if (names.isPending) {
    return <div className="h-24 rounded-2xl bg-secondary motion-safe:animate-pulse" aria-busy="true" aria-label="Loading merchant names" />;
  }

  const suggestions = names.data.suggestions.filter((suggestion) => !dismissed.has(suggestion.id));
  const visible = showAll ? suggestions : suggestions.slice(0, VISIBLE_SUGGESTIONS);
  const { merges } = names.data;

  if (suggestions.length === 0 && merges.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No similar merchant names to review. Spelling differences like &ldquo;NETFLIX&rdquo; and &ldquo;Netflix.com&rdquo;
        are already counted together automatically.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {visible.length > 0 && (
        <ul className="space-y-3">
          {visible.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              busy={busy === suggestion.id}
              disabled={busy !== null}
              onMerge={(name) => void handleMerge(suggestion, name)}
              onDismiss={() => dismiss(suggestion.id)}
            />
          ))}
        </ul>
      )}
      {suggestions.length > VISIBLE_SUGGESTIONS && (
        <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Show fewer" : `Show ${suggestions.length - VISIBLE_SUGGESTIONS} more`}
        </Button>
      )}

      {merges.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Merged</p>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border bg-card">
            {merges.map((merge) => (
              <li key={merge.name} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{merge.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {merge.variants.map((variant) => variant.sample).join(" · ")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-11 shrink-0"
                  onClick={() => void handleUnmerge(merge.name)}
                  disabled={busy !== null}
                  aria-label={`Undo merge for ${merge.name}`}
                >
                  {busy === `merge:${merge.name}` ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
                  Undo
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  busy,
  disabled,
  onMerge,
  onDismiss,
}: {
  suggestion: MerchantMergeSuggestion;
  busy: boolean;
  disabled: boolean;
  onMerge: (name: string) => void;
  onDismiss: () => void;
}) {
  const [name, setName] = useState(suggestion.suggestedName);
  const inputId = `merge-name-${suggestion.id}`;

  return (
    <li className="space-y-3 rounded-2xl border bg-card p-4">
      <div>
        <p className="text-sm font-semibold">Same merchant?</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {suggestion.members.map((member) => (
            <li key={member.key} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
              {member.sample} <span className="text-muted-foreground">×{member.count}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {suggestion.occurrenceCount} payments, {krw.format(suggestion.totalKrw)} in the last 6 months.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
            Show as
          </label>
          <Input id={inputId} value={name} onChange={(event) => setName(event.target.value)} maxLength={200} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="min-h-11 flex-1 sm:flex-none" onClick={onDismiss} disabled={disabled}>
            Not the same
          </Button>
          <Button
            size="sm"
            className="min-h-11 flex-1 sm:flex-none"
            onClick={() => onMerge(name.trim())}
            disabled={disabled || name.trim() === ""}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Combine className="size-4" />}
            Merge
          </Button>
        </div>
      </div>
    </li>
  );
}
