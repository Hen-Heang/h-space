"use client"

import { useEffect, useRef, useState } from "react"
import { Eye, Loader2, Pencil, Save, Star, X } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TagEditor } from "@/components/ui/tag-editor"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorMessage, NoteConflictError } from "@/lib/api"
import { renderMarkdown } from "@/lib/notes-markdown"
import { useNoteProjects } from "@/hooks/useNoteProjects"
import {
  draftRestoreAction,
  noteDraftKey,
  parseNoteDraft,
  sameDraftValues,
  serializeNoteDraft,
} from "@/lib/note-drafts"
import {
  generatedNoteSlug,
  isReservedNoteSlug,
  NOTE_TYPES,
  noteSlugFromTitle,
  validateNoteInput,
  type NoteType,
} from "@/lib/notes"
import { PROJECT_SECTIONS } from "@/lib/project-sections"
import { slugify } from "@/lib/slug"
import { cn } from "@/lib/utils"

export interface NoteEditorValues {
  slug: string
  title: string
  description: string
  icon: string
  category: string
  noteType: NoteType
  tags: string[]
  sourceUrl: string
  pinned: boolean
  content: string
  /** kori_note_projects id, or "" for no project. */
  projectId: string
}

/** Select value for "no project" — Radix Select can't use an empty string. */
const NO_PROJECT_VALUE = "__none__"

interface NoteEditorProps {
  mode: "create" | "edit"
  initial: NoteEditorValues
  /**
   * Edit mode: the note's updated_at when editing started. A local draft is
   * only restored automatically if it started from this same version.
   */
  baseUpdatedAt?: string | null
  onSave: (values: NoteEditorValues) => Promise<void>
  onCancel: () => void
}

/** Postgres unique violation — here, a slug another note of yours already uses. */
function isDuplicateSlugError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "23505"
}

export function NoteEditor({
  mode,
  initial,
  baseUpdatedAt: baseUpdatedAtProp = null,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const [values, setValues] = useState<NoteEditorValues>(initial)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  /** A stored edit draft that may predate the current note; the user decides. */
  const [pendingDraft, setPendingDraft] = useState<NoteEditorValues | null>(null)
  const [draftStorageFailed, setDraftStorageFailed] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  // Used when the title has no ASCII letters (e.g. Korean or Khmer); fixed for
  // this editor session so the slug doesn't change on every keystroke.
  const [fallbackSlug] = useState(() => generatedNoteSlug())
  // While creating, the slug follows the title until the user edits it.
  const [slugEdited, setSlugEdited] = useState(mode === "edit")
  const initialRef = useRef(initial)
  const baseUpdatedAt = mode === "edit" ? baseUpdatedAtProp : null
  const draftKey = noteDraftKey(mode, initial.slug, initial.projectId)
  const dirty = !sameDraftValues(values, initialRef.current)
  const { projects, unavailable: projectsUnavailable } = useNoteProjects()
  // A project id we can't find (deleted, or not loaded) still shows as itself
  // rather than silently reading as "No project".
  const projectMissing =
    Boolean(values.projectId) && !projects.some((p) => p.id === values.projectId)

  function removeStoredDraft() {
    try {
      window.localStorage.removeItem(draftKey)
    } catch {
      // Storage unavailable — drafts are best-effort only.
    }
  }

  // Unsaved-draft protection: brings back changes if the tab or browser closed
  // before saving. A draft is kept only while there are unsaved changes, and
  // an edit draft is applied automatically only if the note hasn't changed
  // since the draft started (lib/note-drafts.ts).
  // Declared before the autosave effect so it runs first on mount.
  useEffect(() => {
    let stored = null
    try {
      stored = parseNoteDraft<NoteEditorValues>(window.localStorage.getItem(draftKey))
    } catch {
      // Storage unavailable — start from the initial values.
    }
    if (!stored) return
    // Older drafts can lack newer fields (e.g. projectId); the initial value fills them.
    const restored: NoteEditorValues = { ...initialRef.current, ...stored.values }
    const action = draftRestoreAction({
      mode,
      draft: stored,
      initial: initialRef.current,
      baseUpdatedAt,
    })
    if (action === "discard") {
      removeStoredDraft()
    } else if (action === "apply") {
      setValues(restored)
      setDraftRestored(true)
      if (mode === "create") {
        setSlugEdited(Boolean(restored.slug) && restored.slug !== slugify(restored.title))
      }
    } else {
      setPendingDraft(restored)
    }
    // Only for a different note or draft; baseUpdatedAt is fixed per editor session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, mode])

  useEffect(() => {
    // Never overwrite a stored draft the user hasn't decided about yet.
    if (pendingDraft) return
    const timer = setTimeout(() => {
      try {
        if (dirty) window.localStorage.setItem(draftKey, serializeNoteDraft(values, baseUpdatedAt))
        else window.localStorage.removeItem(draftKey)
        setDraftStorageFailed(false)
      } catch {
        // Storage full/unavailable — say so rather than claiming a local copy.
        setDraftStorageFailed(true)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [values, dirty, draftKey, baseUpdatedAt, pendingDraft])

  function discardDraft() {
    setValues(initialRef.current)
    setDraftRestored(false)
    if (mode === "create") setSlugEdited(false)
    removeStoredDraft()
  }

  function applyPendingDraft() {
    if (!pendingDraft) return
    setValues(pendingDraft)
    setPendingDraft(null)
    setDraftRestored(true)
  }

  function discardPendingDraft() {
    setPendingDraft(null)
    removeStoredDraft()
  }

  /** Leaves the editor, discarding unsaved changes and their local draft. */
  function leaveEditor() {
    // An undecided older draft is kept; it wasn't part of this session.
    if (!pendingDraft) removeStoredDraft()
    onCancel()
  }

  function handleCancel() {
    if (dirty) setConfirmDiscard(true)
    else leaveEditor()
  }

  const set = (patch: Partial<NoteEditorValues>) => setValues((prev) => ({ ...prev, ...patch }))

  const errors = validateNoteInput(values)

  const handleSave = async () => {
    if (Object.keys(errors).length > 0) {
      setError(errors.title || errors.content || errors.sourceUrl || "Fix the highlighted fields.")
      return
    }
    // The slug can't change after creation, so only a new note's is checked.
    let slug = values.slug
    if (mode === "create") {
      slug = slugify(values.slug)
      if (!slug) {
        if (values.slug.trim()) {
          return setError("Use English letters, numbers and dashes in the URL.")
        }
        slug = noteSlugFromTitle(values.title, fallbackSlug)
      }
      if (isReservedNoteSlug(slug))
        return setError(`"${slug}" is reserved. Choose a different URL.`)
    }
    setError("")
    setIsSaving(true)
    try {
      await onSave({ ...values, slug })
      removeStoredDraft()
    } catch (err) {
      if (err instanceof NoteConflictError) {
        setError(
          "This note was changed or deleted somewhere else after you opened it, so it wasn't saved. Your changes are still here. Copy what you need, then reload to see the latest version.",
        )
      } else if (isDuplicateSlugError(err)) {
        setError(`Another note already uses /notes/${slug}. Change the URL and save again.`)
      } else {
        setError(getApiErrorMessage(err, "Couldn't save the note. Try again."))
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Draft notices use neutral surface tokens: they're information, not
          errors. The action that keeps work is outlined; discarding is quieter. */}
      {pendingDraft && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-border bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 text-sm">
            <p className="font-medium text-foreground">
              You have unsaved changes from an earlier version of this note.
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Using them replaces what&apos;s in the editor now.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={applyPendingDraft}>
              Use these changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={discardPendingDraft}
              className="text-muted-foreground"
            >
              Discard changes
            </Button>
          </div>
        </div>
      )}

      {draftRestored && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-sm text-foreground"
        >
          <span>Restored your unsaved changes from last time.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={discardDraft}
            className="text-muted-foreground"
          >
            Discard changes
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card/50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                aria-label="Note icon key"
                value={values.icon}
                onChange={(e) => set({ icon: e.target.value })}
                placeholder="java"
                title="Icon key (e.g. java, sql) — purely visual"
                className="h-11 w-20 shrink-0 rounded-lg border border-border bg-background text-center text-base font-mono transition-colors focus:border-blue-500/50 focus:outline-none"
              />
              <input
                aria-label="Note title"
                value={values.title}
                onChange={(e) => {
                  const title = e.target.value
                  set({
                    title,
                    // While creating, the slug follows the title until the user edits it.
                    ...(mode === "create" && !slugEdited
                      ? { slug: title.trim() ? noteSlugFromTitle(title, fallbackSlug) : "" }
                      : {}),
                  })
                }}
                placeholder="Note title"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-xl font-semibold text-foreground placeholder:opacity-30 focus:outline-none sm:text-2xl"
              />
              <button
                type="button"
                onClick={() => set({ pinned: !values.pinned })}
                aria-pressed={values.pinned}
                aria-label={values.pinned ? "Unpin note" : "Pin note"}
                // The editor's only pin control, matching the reader's star.
                title={values.pinned ? "Pinned to the top of Notes" : "Pin to the top of Notes"}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-lg border transition-colors",
                  values.pinned
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Star
                  size={18}
                  aria-hidden="true"
                  className={values.pinned ? "fill-current" : ""}
                />
              </button>
            </div>
            <input
              aria-label="Note description"
              value={values.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Short description..."
              className="min-h-11 w-full bg-transparent text-base text-muted-foreground placeholder:opacity-30 focus:outline-none sm:text-sm"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono opacity-60">/notes/</span>
              <input
                aria-label="Note URL slug"
                value={values.slug}
                onChange={(e) => {
                  set({ slug: e.target.value })
                  // Clearing the field hands the slug back to the title.
                  setSlugEdited(e.target.value !== "")
                }}
                disabled={mode === "edit"}
                placeholder="slug"
                // min-w-0: an input's intrinsic width (size=20) otherwise stops
                // flex-1 from shrinking it, and it ran past a 320px screen.
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-base text-foreground disabled:opacity-50 focus:border-ring focus:outline-none sm:text-sm"
              />
            </div>
          </div>

          {/* Save is the screen's one primary action (theme primary, not a
              one-off blue); Cancel stays quiet. */}
          <div className="flex items-center gap-2 sm:self-start">
            <Button type="button" variant="ghost" onClick={handleCancel}>
              <X aria-hidden="true" />
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              Save
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-3 border-t border-border/60 pt-4",
            projectsUnavailable ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4",
          )}
        >
          <div className="space-y-1.5">
            <label htmlFor="note-type" className="text-xs font-medium text-muted-foreground">
              Type
            </label>
            <Select
              value={values.noteType}
              onValueChange={(value) => set({ noteType: value as NoteType })}
            >
              <SelectTrigger id="note-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!projectsUnavailable && (
            <div className="space-y-1.5">
              <label htmlFor="note-project" className="text-xs font-medium text-muted-foreground">
                Project
              </label>
              <Select
                value={values.projectId || NO_PROJECT_VALUE}
                onValueChange={(value) =>
                  set({ projectId: value === NO_PROJECT_VALUE ? "" : value })
                }
              >
                <SelectTrigger id="note-project" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT_VALUE}>No project</SelectItem>
                  {projectMissing && (
                    <SelectItem value={values.projectId}>Current project</SelectItem>
                  )}
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="note-category" className="text-xs font-medium text-muted-foreground">
              Category (project section)
            </label>
            <Input
              id="note-category"
              list="note-category-suggestions"
              value={values.category}
              onChange={(e) => set({ category: e.target.value })}
              placeholder="e.g. Architecture, Guides, Reference"
            />
            <datalist id="note-category-suggestions">
              {PROJECT_SECTIONS.map((section) => (
                <option key={section} value={section} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="note-source-url" className="text-xs font-medium text-muted-foreground">
              Source URL (optional)
            </label>
            <Input
              id="note-source-url"
              type="url"
              inputMode="url"
              value={values.sourceUrl}
              onChange={(e) => set({ sourceUrl: e.target.value })}
              placeholder="https://…"
              aria-invalid={Boolean(errors.sourceUrl)}
            />
          </div>
        </div>

        <div className="space-y-1.5 border-t border-border/60 pt-4">
          <label htmlFor="note-tags" className="text-xs font-medium text-muted-foreground">
            Tags
          </label>
          <TagEditor id="note-tags" tags={values.tags} onChange={(tags) => set({ tags })} />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Editor mode"
          className="flex items-center gap-1 rounded-lg border border-border bg-card p-1"
        >
          <button
            type="button"
            onClick={() => setPreview(false)}
            aria-pressed={!preview}
            className={cn(
              "min-h-11 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              !preview
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Pencil size={13} aria-hidden="true" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            aria-pressed={preview}
            className={cn(
              "min-h-11 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              preview ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye size={13} aria-hidden="true" />
            Preview
          </button>
        </div>
        {/* One steady message while there are unsaved changes — not a
            per-keystroke "saving…/saved" flicker that screen readers repeat. */}
        <span aria-live="polite" className="text-xs text-muted-foreground">
          {dirty && !pendingDraft
            ? draftStorageFailed
              ? "Unsaved changes can't be kept on this device. Save to keep them."
              : "Unsaved changes are kept on this device"
            : null}
        </span>
      </div>

      {preview ? (
        <article
          className="prose prose-zinc min-h-[50dvh] max-w-none break-words rounded-lg border border-border/60 bg-card/30 p-4 prose-sm [overflow-wrap:anywhere] dark:prose-invert sm:min-h-[500px] sm:p-6 prose-pre:max-w-full prose-pre:overflow-x-auto"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(values.content || "*Nothing to preview yet.*"),
          }}
        />
      ) : (
        <Textarea
          value={values.content}
          onChange={(e) => set({ content: e.target.value })}
          placeholder="Write your markdown here..."
          aria-invalid={Boolean(errors.content)}
          className="min-h-[50dvh] w-full resize-none rounded-lg border-border/60 bg-card/30 p-4 font-mono text-base leading-relaxed sm:min-h-[500px] sm:p-6 sm:text-sm"
        />
      )}

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {mode === "create"
                ? "This note hasn't been saved. Leaving now deletes what you've written."
                : "Your changes to this note haven't been saved. Leaving now deletes them."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={leaveEditor}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
