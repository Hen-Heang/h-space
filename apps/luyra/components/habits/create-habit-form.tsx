"use client";

import { useState, type FormEvent } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HabitCategory } from "@/types/habit";

import { CATEGORY_LABELS, CATEGORY_ORDER } from "./category-meta";

export function CreateHabitForm({
  onCreate,
  onClose,
}: {
  onCreate: (input: { label: string; category: HabitCategory; identityStatement?: string }) => Promise<unknown>;
  onClose?: () => void;
}) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<HabitCategory>("custom");
  const [identityStatement, setIdentityStatement] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!label.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({ label: label.trim(), category, identityStatement: identityStatement.trim() || undefined });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-md space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
          <Sparkles size={20} strokeWidth={2} />
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={18} strokeWidth={2} />
          </button>
        )}
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Start a habit</h2>
        <p className="mt-1 text-sm text-muted-foreground">Keep it small enough that you can check it off today.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="habit-label" className="text-sm font-semibold text-foreground">
          Habit
        </label>
        <Input
          id="habit-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Practice Korean for 20 minutes"
          maxLength={80}
          autoFocus
          required
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          className="flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown size={14} className={cn("transition-transform", moreOpen && "rotate-180")} />
          More options
        </button>

        {moreOpen && (
          <div className="mt-2 space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Category</span>
              <ChipSelect
                options={CATEGORY_ORDER.map((c) => CATEGORY_LABELS[c])}
                value={CATEGORY_LABELS[category]}
                onChange={(selectedLabel) => {
                  const next = CATEGORY_ORDER.find((c) => CATEGORY_LABELS[c] === selectedLabel);
                  if (next) setCategory(next);
                }}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="habit-identity" className="text-sm font-semibold text-foreground">
                Why it matters <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="habit-identity"
                value={identityStatement}
                onChange={(e) => setIdentityStatement(e.target.value)}
                placeholder="e.g. I want Korean practice to be automatic"
                maxLength={120}
              />
            </div>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={submitting || !label.trim()}>
        {submitting ? "Starting…" : "Start habit"}
      </Button>
    </form>
  );
}
