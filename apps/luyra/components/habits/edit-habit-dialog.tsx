"use client";

import { useState, type FormEvent } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Habit, HabitCategory } from "@/types/habit";

import { CATEGORY_LABELS, CATEGORY_ORDER } from "./category-meta";

export function EditHabitDialog({
  habit,
  onUpdate,
  onDelete,
}: {
  habit: Habit;
  onUpdate: (data: { label: string; category: HabitCategory; identityStatement?: string | null }) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(habit.label);
  const [category, setCategory] = useState<HabitCategory>(habit.category);
  const [identityStatement, setIdentityStatement] = useState(habit.identityStatement ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setLabel(habit.label);
      setCategory(habit.category);
      setIdentityStatement(habit.identityStatement ?? "");
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!label.trim() || saving) return;
    setSaving(true);
    try {
      await onUpdate({ label: label.trim(), category, identityStatement: identityStatement.trim() || null });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Edit habit">
          <Pencil size={16} strokeWidth={2} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Edit habit</DialogTitle>
            <DialogDescription>Update the label, category, or identity statement.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-habit-label" className="text-sm font-semibold text-foreground">
                What are you building?
              </label>
              <Input id="edit-habit-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} required />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Category</span>
              <ChipSelect
                options={CATEGORY_ORDER.map((c) => CATEGORY_LABELS[c])}
                value={CATEGORY_LABELS[category]}
                onChange={(value) => {
                  const next = CATEGORY_ORDER.find((c) => CATEGORY_LABELS[c] === value);
                  if (next) setCategory(next);
                }}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-habit-identity" className="text-sm font-semibold text-foreground">
                Who is this making you? <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="edit-habit-identity"
                value={identityStatement}
                onChange={(e) => setIdentityStatement(e.target.value)}
                maxLength={120}
              />
            </div>
          </div>

          <DialogFooter className="items-center sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm">
                  <Trash2 size={14} strokeWidth={2} />
                  Delete habit
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this habit?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes &quot;{habit.label}&quot; along with all its check-ins. This can&apos;t be undone.
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

            <Button type="submit" disabled={saving || !label.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
