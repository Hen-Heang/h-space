"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatInterval, previewIntervalDays, RATINGS, type ReviewRating } from "@/lib/srs";
import { cn } from "@/lib/utils";
import type { VocabCard } from "@/types/learning";

const GRADE_LABELS: Record<ReviewRating, string> = { AGAIN: "Again", HARD: "Hard", GOOD: "Good", EASY: "Easy" };
const GRADE_CLASSES: Record<ReviewRating, string> = {
  AGAIN: "bg-red-600 hover:bg-red-500",
  HARD: "bg-amber-600 hover:bg-amber-500",
  GOOD: "bg-emerald-600 hover:bg-emerald-500",
  EASY: "bg-sky-600 hover:bg-sky-500",
};

export function FlashcardReview({
  queue,
  onGrade,
  onFinish,
}: {
  queue: VocabCard[];
  onGrade: (id: string, rating: ReviewRating) => Promise<void>;
  onFinish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [gradedCount, setGradedCount] = useState(0);
  const [pending, setPending] = useState(false);

  const card = queue[index];

  async function grade(rating: ReviewRating) {
    if (!card || pending) return;
    setPending(true);
    try {
      await onGrade(card.id, rating);
      setGradedCount((c) => c + 1);
      setFlipped(false);
      if (index + 1 >= queue.length) {
        onFinish();
      } else {
        setIndex((i) => i + 1);
      }
    } finally {
      setPending(false);
    }
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card/30 p-10 text-center">
        <CheckCircle2 className="size-8 text-emerald-500" />
        <p className="text-sm font-semibold text-foreground">Session complete</p>
        <p className="text-xs text-muted-foreground">{gradedCount} cards reviewed.</p>
        <Button size="sm" variant="outline" onClick={onFinish} className="mt-2">
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-xs font-medium text-muted-foreground">
        {index + 1} / {queue.length}
      </p>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-56 min-w-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-border bg-card p-4 text-center transition-colors hover:bg-accent/30 xs:p-6"
      >
        {!flipped ? (
          <>
            <p className="max-w-full break-words text-3xl font-bold">{card.term}</p>
            {card.pronunciation && <p className="text-sm italic text-muted-foreground">[{card.pronunciation}]</p>}
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tap to reveal</p>
          </>
        ) : (
          <>
            <p className="max-w-full break-words text-2xl font-bold">{card.meaning}</p>
            <p className="max-w-full break-words text-lg text-muted-foreground">{card.term}</p>
            {card.example && <p className="mt-3 max-w-sm break-words text-sm text-muted-foreground">{card.example}</p>}
          </>
        )}
      </button>

      {flipped && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATINGS.map((rating) => (
            <button
              key={rating}
              type="button"
              disabled={pending}
              onClick={() => grade(rating)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2.5 text-white transition-colors disabled:opacity-50",
                GRADE_CLASSES[rating]
              )}
            >
              <span className="text-xs font-semibold">{GRADE_LABELS[rating]}</span>
              <span className="text-[10px] opacity-80">{formatInterval(previewIntervalDays(card, rating))}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
