"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers3, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createVocabCard,
  deleteVocabCard,
  listDueVocabCards,
  listVocabCards,
  rateVocabCard,
  updateVocabCard,
} from "@/lib/api/learning";
import type { ReviewRating } from "@/lib/srs";
import { computeVocabStats, filterVocab, sortVocab } from "@/lib/vocab-review";
import { cn } from "@/lib/utils";
import type { MasteryFilter, VocabCard, VocabSortOrder } from "@/types/learning";
import { FlashcardReview } from "./flashcard-review";
import { VocabCardItem } from "./vocab-card-item";
import { VocabForm } from "./vocab-form";

const FILTER_TABS: { label: string; value: MasteryFilter }[] = [
  { label: "All", value: "all" },
  { label: "Weak", value: "weak" },
  { label: "Learning", value: "learning" },
  { label: "Mastered", value: "mastered" },
];

export function VocabList() {
  const [words, setWords] = useState<VocabCard[]>([]);
  const [dueWords, setDueWords] = useState<VocabCard[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MasteryFilter>("all");
  const [sortOrder, setSortOrder] = useState<VocabSortOrder>("due");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allWords, due] = await Promise.all([listVocabCards(), listDueVocabCards()]);
      setWords(allWords);
      setDueWords(due.due);
      setDueCount(due.dueCount);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your vocabulary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const stats = useMemo(() => computeVocabStats(words), [words]);
  const visibleWords = useMemo(() => sortVocab(filterVocab(words, query, filter), sortOrder), [words, query, filter, sortOrder]);

  async function handleCreate(input: Parameters<typeof createVocabCard>[0]) {
    await createVocabCard(input);
    setCreating(false);
    await load();
  }

  async function handleGrade(id: string, rating: ReviewRating) {
    await rateVocabCard(id, rating);
  }

  if (reviewing) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <FlashcardReview
          queue={dueWords}
          onGrade={handleGrade}
          onFinish={() => {
            setReviewing(false);
            void load();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Saved words" value={stats.total} />
        <StatCard label="Due now" value={dueCount} />
        <StatCard label="Avg. mastery" value={`${stats.averageMastery}%`} />
        <StatCard label="Mastered" value={stats.mastered} />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {dueCount > 0 ? `${dueCount} ${dueCount === 1 ? "word" : "words"} due` : "All caught up"}
            </p>
            <p className="text-xs text-muted-foreground">{words.length} saved words total</p>
          </div>
        </div>
        <Button
          onClick={() => setReviewing(true)}
          disabled={loading || (dueWords.length === 0 && words.length === 0)}
          className="bg-emerald-600 text-white hover:bg-emerald-500"
        >
          {dueWords.length > 0 ? `Review ${dueWords.length}` : "Practice"}
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Layers3 className="size-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Word library</h2>
        </div>
        {creating ? null : (
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus />
            Add word
          </Button>
        )}
      </div>

      {creating && <VocabForm mode="create" onSave={handleCreate} onCancel={() => setCreating(false)} />}

      {words.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input placeholder="Search Korean, English, or deck…" value={query} onChange={(e) => setQuery(e.target.value)} className="sm:max-w-xs" />
          <div className="flex flex-wrap gap-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-sm sm:min-h-9",
                  filter === tab.value ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as VocabSortOrder)}
            className="h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-2 text-base sm:h-9 sm:w-auto sm:text-sm"
          >
            <option value="due">Sort: Due date</option>
            <option value="alpha">Sort: Alphabetical</option>
            <option value="mastery-asc">Sort: Mastery (low first)</option>
            <option value="mastery-desc">Sort: Mastery (high first)</option>
          </select>
        </div>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading your vocabulary…</p>
      ) : visibleWords.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {words.length === 0 ? "No words yet. Add your first word to get started." : "No words match this filter."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleWords.map((card) => (
            <VocabCardItem
              key={card.id}
              card={card}
              onUpdate={async (input) => {
                await updateVocabCard(card.id, input);
                await load();
              }}
              onDelete={async () => {
                await deleteVocabCard(card.id);
                await load();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
