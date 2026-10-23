"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CreateVocabCardInput, UpdateVocabCardInput } from "@/lib/validation/learning";
import type { VocabCard } from "@/types/learning";
import { VocabForm } from "./vocab-form";

function formatReviewDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

export function VocabCardItem({
  card,
  onUpdate,
  onDelete,
}: {
  card: VocabCard;
  onUpdate: (input: CreateVocabCardInput & UpdateVocabCardInput) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const mastery = Math.max(0, Math.min(100, card.mastery));
  const masteryBg =
    mastery >= 80
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      : mastery >= 50
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border p-3">
        <VocabForm
          mode="edit"
          card={card}
          onSave={async (input) => {
            await onUpdate(input);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{card.term}</h3>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", masteryBg)}>{mastery}%</span>
          </div>
          {card.pronunciation && <p className="text-xs italic text-muted-foreground">[{card.pronunciation}]</p>}
          <p className="mt-1 text-sm text-muted-foreground">{card.meaning}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Edit word">
            <Pencil className="size-4" />
          </Button>
          <AlertDialog open={confirmingDelete} onOpenChange={(open) => !deleting && setConfirmingDelete(open)}>
            <Button variant="ghost" size="icon" onClick={() => setConfirmingDelete(true)} aria-label="Delete word">
              <Trash2 className="size-4" />
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &ldquo;{card.term}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the word and its review history. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {card.example && (
        <div className="mt-3 rounded-md border border-border bg-accent/20 p-3 text-sm">
          <p className="text-foreground/90">{card.example}</p>
          {card.exampleTranslation && <p className="mt-1 text-xs italic text-muted-foreground">{card.exampleTranslation}</p>}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{card.category}</span>
        <span>Next review: {formatReviewDate(card.nextReview)}</span>
      </div>
    </div>
  );
}
