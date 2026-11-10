import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Pin } from "lucide-react"

import {
  projectStatusLabel,
  projectTypeLabel,
  type Project,
  type ProjectStatus,
} from "@/lib/note-projects"
import { NOTE_TYPES, type NoteMeta, type NoteType } from "@/lib/notes"
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
export function ProjectTile({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary",
        size === "lg" ? "size-12 text-xl" : size === "sm" ? "size-9 text-sm" : "size-10 text-base",
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

export function noteTypeLabel(noteType: NoteType): string {
  return NOTE_TYPES.find((t) => t.value === noteType)?.label ?? "Note"
}

export function countText(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

/** Hover/focus treatment for a full-width row inside a divided list. */
export const ROW_LINK =
  "outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"

/** A divided list on a card surface; rows are its `<li>` children. */
export function RowList({
  children,
  className,
  label,
}: {
  children: React.ReactNode
  className?: string
  label?: string
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "divide-y divide-border overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      {children}
    </ul>
  )
}

/**
 * One note as a compact row: title (+ pin), an optional one-line excerpt, and
 * one metadata line — type, project, updated, the first tags.
 */
export function NoteListRow({
  note,
  projectName,
  showExcerpt = false,
  showType = true,
}: {
  note: NoteMeta
  projectName?: string
  /** The description, when it helps tell results apart (search). */
  showExcerpt?: boolean
  showType?: boolean
}) {
  const updated = updatedLabel(note.updatedAt)
  const meta = [
    showType ? noteTypeLabel(note.noteType) : "",
    projectName ?? "",
    updated ? `Updated ${updated}` : "",
    ...(note.tags ?? []).slice(0, 2).map((tag) => `#${tag}`),
  ].filter(Boolean)
  return (
    <Link
      href={`/notes/${note.slug}`}
      className={cn("flex min-h-14 min-w-0 flex-col justify-center gap-0.5 px-4 py-2.5", ROW_LINK)}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[15px] font-semibold text-foreground">{note.title}</span>
        {note.pinned && (
          <Pin
            size={13}
            role="img"
            aria-label="Pinned"
            className="shrink-0 fill-current text-primary"
          />
        )}
      </span>
      {showExcerpt && note.description && (
        <span className="truncate text-sm text-muted-foreground">{note.description}</span>
      )}
      <span className="truncate text-xs text-muted-foreground">{meta.join(" · ")}</span>
    </Link>
  )
}

/**
 * A project as a compact row: name and status, then type, note count and
 * updated — plus the description so same-name projects can be told apart.
 */
export function ProjectListRow({
  project,
  noteCount,
  updatedAt,
}: {
  project: Project
  noteCount: number
  updatedAt?: string
}) {
  const updated = updatedLabel(updatedAt ?? project.updatedAt)
  return (
    <Link
      href={`/notes/projects/${project.id}`}
      className={cn("flex min-h-14 min-w-0 items-center gap-3 px-4 py-2.5", ROW_LINK)}
    >
      <ProjectTile name={project.name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-foreground">{project.name}</span>
          <ProjectStatusPill status={project.status} />
        </span>
        {project.description && (
          <span className="block truncate text-sm text-muted-foreground">
            {project.description}
          </span>
        )}
        <span className="block truncate text-xs text-muted-foreground">
          {projectTypeLabel(project.projectType)} · {countText(noteCount, "note", "notes")}
          {updated && ` · Updated ${updated}`}
        </span>
      </span>
    </Link>
  )
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
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:text-sm",
        pressed
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  )
}
