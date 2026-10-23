"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Shared by the Categories and Payment methods sections. The two lists differ
// only in which fields they edit, so everything below is the part that is
// genuinely identical between them.

export function IconPicker({
  id,
  label,
  icons,
  value,
  onChange,
}: {
  id: string;
  label: string;
  icons: readonly string[];
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label id={id}>{label}</Label>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={id}>
        {icons.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            aria-pressed={value === icon}
            aria-label={`Icon ${icon}`}
            className={cn(
              "flex size-11 items-center justify-center rounded-xl border text-lg transition-colors active:scale-[0.95]",
              value === icon
                ? "border-primary/40 bg-primary/10"
                : "border-border bg-background hover:bg-secondary active:bg-secondary"
            )}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ColorPicker({
  id,
  label,
  colors,
  value,
  onChange,
}: {
  id: string;
  label: string;
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label id={id}>{label}</Label>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={id}>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-pressed={value === color}
            aria-label={`Color ${color}`}
            className="flex size-11 items-center justify-center rounded-xl transition-transform active:scale-[0.95]"
            style={{
              backgroundColor: color,
              outline: value === color ? "2px solid var(--foreground)" : "none",
              outlineOffset: 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function LookupRowActions({
  name,
  onEdit,
  onDelete,
  disabled,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        aria-label={`Edit ${name}`}
        className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Delete ${name}`}
        className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// The confirm step doubles as where a blocked delete is reported: the server
// refuses with a 409 naming what still references the row, and that message
// is shown here rather than as a toast, so the user reads it in the same place
// they asked for the delete.
export function DeleteLookupDialog({
  isOpen,
  isDeleting,
  entityLabel,
  name,
  error,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  isDeleting: boolean;
  entityLabel: string;
  name: string;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {entityLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            Delete <strong>{name}</strong>? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            {error ? "Close" : "Cancel"}
          </Button>
          <Button variant="destructive" onClick={() => onConfirm()} disabled={isDeleting}>
            {isDeleting ? (
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
  );
}
