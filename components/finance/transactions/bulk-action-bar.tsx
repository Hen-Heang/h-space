"use client";

import { useState } from "react";
import { Loader2, Tags, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Category, TransactionType } from "@/types/finance";

function plural(count: number): string {
  return `${count} ${count === 1 ? "transaction" : "transactions"}`;
}

/**
 * The selection-mode toolbar for the transaction list. Both actions confirm
 * first; recategorize only offers categories that fit every selected row
 * (the server enforces the same rule).
 */
export function BulkActionBar({
  selectedCount,
  selectedTypes,
  visibleCount,
  categories,
  busy,
  onSelectAll,
  onCancel,
  onDelete,
  onRecategorize,
}: {
  selectedCount: number;
  selectedTypes: Set<TransactionType>;
  visibleCount: number;
  categories: Category[];
  busy: boolean;
  onSelectAll: () => void;
  onCancel: () => void;
  onDelete: () => Promise<void>;
  onRecategorize: (categoryId: string | null) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [recategorizeOpen, setRecategorizeOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");

  const compatible = categories.filter(
    (category) => category.type === "both" || [...selectedTypes].every((type) => type === category.type)
  );
  const mixedTypes = selectedTypes.size > 1;
  const nothingSelected = selectedCount === 0;

  return (
    <>
      <div
        className="sticky top-2 z-30 flex flex-wrap items-center gap-2 rounded-2xl border bg-card/95 p-2 shadow-lg shadow-black/5 backdrop-blur"
        role="toolbar"
        aria-label="Bulk actions"
      >
        <Button variant="ghost" size="icon" className="size-11 shrink-0" onClick={onCancel} aria-label="Exit selection">
          <X className="size-4" aria-hidden="true" />
        </Button>
        <p className="min-w-0 flex-1 text-sm font-semibold" aria-live="polite">
          {nothingSelected ? "Select transactions" : `${selectedCount} selected`}
        </p>
        {selectedCount < visibleCount && (
          <Button variant="ghost" size="sm" className="min-h-11" onClick={onSelectAll} disabled={busy}>
            Select all{visibleCount > 0 ? ` (${visibleCount})` : ""}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => {
            setCategoryId("");
            setRecategorizeOpen(true);
          }}
          disabled={nothingSelected || busy}
        >
          <Tags className="size-4" aria-hidden="true" />
          <span className="hidden min-[420px]:inline">Category</span>
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="min-h-11"
          onClick={() => setConfirmDelete(true)}
          disabled={nothingSelected || busy}
          aria-label={`Delete ${plural(selectedCount)}`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          <span className="hidden min-[420px]:inline">Delete</span>
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={(open) => !open && !busy && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {plural(selectedCount)}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes them from every report, budget, and total. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                await onDelete();
                setConfirmDelete(false);
              }}
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={recategorizeOpen} onOpenChange={(open) => !busy && setRecategorizeOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change category</DialogTitle>
            <DialogDescription>
              Move {plural(selectedCount)} to one category.
              {mixedTypes && " The selection mixes income and expenses, so only categories used for both are listed."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-category">Category</Label>
            <select
              id="bulk-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="h-11 w-full rounded-xl border bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            >
              <option value="">No category</option>
              {compatible.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon ? `${category.icon} ` : ""}
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecategorizeOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                await onRecategorize(categoryId || null);
                setRecategorizeOpen(false);
              }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
