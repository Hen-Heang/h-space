"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Eye, FolderOpen, Loader2, Pencil, Pin, Save } from "lucide-react"

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getApiErrorMessage, NoteConflictError } from "@/lib/api"
import { CodeCopy } from "@/components/notes/CodeCopy"
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
  // Secondary fields start closed; a save error in one of them opens them.
  const [detailsOpen, setDetailsOpen] = useState(false)
  // Used when the title has no ASCII letters (e.g. Korean or Khmer); fixed for
  // this editor session so the slug doesn't change on every keystroke.
  const [fallbackSlug] = useState(() => generatedNoteSlug())
  // While creating, the slug follows the title until the user edits it.
  const [slugEdited, setSlugEdited] = useState(mode === "edit")
  const initialRef = useRef(initial)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const baseUpdatedAt = mode === "edit" ? baseUpdatedAtProp : null
  const draftKey = noteDraftKey(mode, initial.slug, initial.projectId)
  const dirty = !sameDraftValues(values, initialRef.current)
  const { projects, unavailable: projectsUnavailable } = useNoteProjects()
  // A project id we can't find (deleted, or not loaded) still shows as itself
  // rather than silently reading as "No project".
  const projectMissing =
    Boolean(values.projectId) && !projects.some((p) => p.id === values.projectId)
  const selectedProjectLabel = !values.projectId
    ? "No project"
    : (projects.find((p) => p.id === values.projectId)?.name ?? "Current project")

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

  // The title is a one-row textarea that grows to fit long or wrapped titles
  // (iOS Safari has no `field-sizing`), including after a rotation.
  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    const fit = () => {
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [values.title])

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
      if (!errors.title && !errors.content) setDetailsOpen(true)
      setError(errors.title || errors.content || errors.sourceUrl || "Fix the highlighted fields.")
      return
    }
    // The slug can't change after creation, so only a new note's is checked.
    let slug = values.slug
    if (mode === "create") {
      slug = slugify(values.slug)
      if (!slug) {
        if (values.slug.trim()) {
          setDetailsOpen(true)
          return setError("Use English letters, numbers and dashes in the URL.")
        }
        slug = noteSlugFromTitle(values.title, fallbackSlug)
      }
      if (isReservedNoteSlug(slug)) {
        setDetailsOpen(true)
        return setError(`"${slug}" is reserved. Choose a different URL.`)
      }
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
        setDetailsOpen(true)
        setError(`Another note already uses /notes/${slug}. Change the URL and save again.`)
      } else {
        setError(getApiErrorMessage(err, "Couldn't save the note. Try again."))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const detailsSummary = [
    NOTE_TYPES.find((t) => t.value === values.noteType)?.label ?? "Note",
    values.category ? `#${values.category}` : "",
    values.tags.length > 0
      ? `${values.tags.length} ${values.tags.length === 1 ? "tag" : "tags"}`
      : "",
  ].filter(Boolean)

  return (
    <div className="space-y-4">
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
            <Button type="button" variant="outline" className="h-11" onClick={applyPendingDraft}>
              Use these changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={discardPendingDraft}
              className="h-11 text-muted-foreground"
            >
              Discard changes
            </Button>
          </div>
        </div>
      )}

      {draftRestored && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted px-4 py-1.5 text-sm text-foreground"
        >
          <span>Restored your unsaved changes from last time.</span>
          <Button
            type="button"
            variant="ghost"
            onClick={discardDraft}
            className="h-11 text-muted-foreground"
          >
            Discard changes
          </Button>
        </div>
      )}

      {/* Title, with the pin beside it */}
      <div className="flex items-start gap-2">
        <textarea
          ref={titleRef}
          aria-label="Note title"
          rows={1}
          value={values.title}
          onChange={(e) => {
            // A title is one line; pasted line breaks become spaces.
            const title = e.target.value.replace(/\r?\n/g, " ")
            set({
              title,
              // While creating, the slug follows the title until the user edits it.
              ...(mode === "create" && !slugEdited
                ? { slug: title.trim() ? noteSlugFromTitle(title, fallbackSlug) : "" }
                : {}),
            })
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault()
          }}
          placeholder="Note title"
          aria-invalid={Boolean(error && errors.title) || undefined}
          className="min-h-11 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-2xl leading-tight font-semibold [overflow-wrap:anywhere] text-foreground placeholder:text-muted-foreground/50 focus:outline-none sm:text-3xl"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => set({ pinned: !values.pinned })}
              aria-pressed={values.pinned}
              aria-label={values.pinned ? "Unpin note" : "Pin note"}
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                values.pinned
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Pin size={18} aria-hidden="true" className={values.pinned ? "fill-current" : ""} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {values.pinned ? "Pinned to the top of Notes" : "Pin to the top of Notes"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Note details: always says where the note goes; the rest opens on demand. */}
      <div className="rounded-lg border border-border bg-card">
        <button
          type="button"
          aria-expanded={detailsOpen}
          aria-controls="note-details"
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 py-2 text-left outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="shrink-0 text-sm font-semibold text-foreground">Note details</span>
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {!projectsUnavailable && (
              <>
                <FolderOpen size={14} aria-hidden="true" className="mr-1 inline align-[-2px]" />
                <span className="font-medium text-foreground/80">{selectedProjectLabel}</span>
                {" · "}
              </>
            )}
            {detailsSummary.join(" · ")}
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={cn(
              "shrink-0 text-muted-foreground transition-transform",
              detailsOpen && "rotate-180",
            )}
          />
        </button>

        {/* Kept mounted while closed so a failed save can point at these fields. */}
        <div
          id="note-details"
          hidden={!detailsOpen}
          className="space-y-4 border-t border-border p-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="note-description" className="text-xs font-medium text-muted-foreground">
              Short description
            </label>
            <Input
              id="note-description"
              value={values.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Shown in lists and search results"
              className="h-11"
            />
          </div>

          <div
            className={cn(
              "grid grid-cols-1 gap-3",
              projectsUnavailable ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
            )}
          >
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
                  <SelectTrigger id="note-project" className="h-11! w-full">
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
              <label htmlFor="note-type" className="text-xs font-medium text-muted-foreground">
                Type
              </label>
              <Select
                value={values.noteType}
                onValueChange={(value) => set({ noteType: value as NoteType })}
              >
                <SelectTrigger id="note-type" className="h-11! w-full">
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
            <div className="space-y-1.5">
              <label htmlFor="note-category" className="text-xs font-medium text-muted-foreground">
                Category (project section)
              </label>
              <Input
                id="note-category"
                list="note-category-suggestions"
                value={values.category}
                onChange={(e) => set({ category: e.target.value })}
                placeholder="e.g. Architecture, Guides"
                className="h-11"
              />
              <datalist id="note-category-suggestions">
                {PROJECT_SECTIONS.map((section) => (
                  <option key={section} value={section} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="note-tags" className="text-xs font-medium text-muted-foreground">
              Tags
            </label>
            <TagEditor id="note-tags" tags={values.tags} onChange={(tags) => set({ tags })} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <div className="space-y-1.5">
              <label
                htmlFor="note-source-url"
                className="text-xs font-medium text-muted-foreground"
              >
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
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="note-icon" className="text-xs font-medium text-muted-foreground">
                Icon
              </label>
              <Input
                id="note-icon"
                value={values.icon}
                onChange={(e) => set({ icon: e.target.value })}
                placeholder="java"
                title="Icon key (e.g. java, sql), purely visual"
                className="h-11 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="note-slug" className="text-xs font-medium text-muted-foreground">
              URL{mode === "edit" ? " (fixed once the note exists)" : ""}
            </label>
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="shrink-0 font-mono opacity-70">/notes/</span>
              <input
                id="note-slug"
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

      {/* Mode switch and the save actions stay in reach while scrolling a long note. */}
      <div className="sticky top-[var(--shell-header-h,0px)] z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 bg-background/95 px-1 py-2">
        <div
          role="group"
          aria-label="Editor mode"
          className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5"
        >
          <button
            type="button"
            onClick={() => setPreview(false)}
            aria-pressed={!preview}
            className={cn(
              "flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 [@media(pointer:coarse)]:min-h-11",
              !preview
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Pencil size={14} aria-hidden="true" className="hidden sm:block" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            aria-pressed={preview}
            className={cn(
              "flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 [@media(pointer:coarse)]:min-h-11",
              preview ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye size={14} aria-hidden="true" className="hidden sm:block" />
            Preview
          </button>
        </div>
        {/* Save is the screen's one primary action; Cancel stays quiet. */}
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="ghost" className="h-11 px-3" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 px-3 sm:px-4"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" className="hidden sm:block" />
            )}
            Save note
          </Button>
        </div>
      </div>

      {preview && <CodeCopy />}
      {preview ? (
        <article
          className="note-prose prose prose-zinc min-h-[50dvh] max-w-none break-words rounded-lg border border-border/60 bg-card/30 p-4 prose-sm [overflow-wrap:anywhere] dark:prose-invert sm:min-h-[500px] sm:p-6 prose-pre:max-w-full prose-code:before:content-none prose-code:after:content-none"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(values.content || "*Nothing to preview yet.*"),
          }}
        />
      ) : (
        <Textarea
          aria-label="Note content (Markdown)"
          value={values.content}
          onChange={(e) => set({ content: e.target.value })}
          placeholder="Write your markdown here..."
          aria-invalid={Boolean(errors.content)}
          className="min-h-[50dvh] w-full resize-none rounded-lg border-border/60 bg-card/30 p-4 font-mono text-base leading-relaxed sm:min-h-[500px] sm:p-6 sm:text-sm"
        />
      )}

      {/* One steady message while there are unsaved changes — not a
          per-keystroke "saving…/saved" flicker that screen readers repeat. */}
      <p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
        {dirty && !pendingDraft
          ? draftStorageFailed
            ? "Unsaved changes can't be kept on this device. Save to keep them."
            : "Unsaved changes are kept on this device"
          : null}
      </p>

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
