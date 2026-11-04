import { formatDistanceToNow } from "date-fns"

import { projectStatusLabel, type ProjectStatus } from "@/lib/note-projects"
import { NOTE_TYPES, type NoteType } from "@/lib/notes"
import { cn } from "@/lib/utils"

// Small presentational pieces shared by Notes Home and the Project Workspace.

/** Status is always written out; colour only reinforces it. */
const STATUS_CLASSES: Record<ProjectStatus, string> = {
  active: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  planned: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
  on_hold: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  completed: "bg-cyan-500/12 text-cyan-800 dark:text-cyan-300",
  archived: "bg-muted text-muted-foreground",
}

export function ProjectStatusPill({
  status,
  className,
}: {
  status: ProjectStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {projectStatusLabel(status)}
    </span>
  )
}

/** Monogram tile: the project's first letter. Decorative — the name is always next to it. */
export function ProjectTile({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary",
        size === "lg" ? "size-12 text-xl" : "size-10 text-base",
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  )
}

export function NoteTypeChip({ noteType }: { noteType: NoteType }) {
  return (
    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      {NOTE_TYPES.find((t) => t.value === noteType)?.label ?? "Note"}
    </span>
  )
}

export function updatedLabel(updatedAt?: string | null): string {
  if (!updatedAt) return ""
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return ""
  return formatDistanceToNow(date, { addSuffix: true })
}

export function formatDay(value?: string | null): string {
  if (!value) return ""
  // Date-only values ("2026-11-02") are calendar days — format without a timezone shift.
  const [y, m, d] = value.slice(0, 10).split("-").map(Number)
  if (!y || !m || !d) return ""
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/** Filter chip with aria-pressed, used for status and note-type filters. */
export function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pressed
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  )
}
