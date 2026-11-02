"use client"

import { useEffect, useRef, useState } from "react"
import { Eye, Loader2, Pencil, Save, Star, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { TagEditor } from "@/components/ui/tag-editor"
import { Textarea } from "@/components/ui/textarea"
import { renderMarkdown } from "@/lib/notes-markdown"
import { useNoteProjects } from "@/hooks/useNoteProjects"
import { isReservedNoteSlug, NOTE_TYPES, validateNoteInput, type NoteType } from "@/lib/notes"
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
  onSave: (values: NoteEditorValues) => Promise<void>
  onCancel: () => void
}

function draftKey(mode: "create" | "edit", slug: string): string {
  return `hengo-note-draft:${mode === "create" ? "new" : slug}`
}

export function NoteEditor({ mode, initial, onSave, onCancel }: NoteEditorProps) {
  const [values, setValues] = useState<NoteEditorValues>(initial)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [draftSaved, setDraftSaved] = useState(true)
  const initialRef = useRef(initial)
  const { projects, unavailable: projectsUnavailable } = useNoteProjects()
  // A project id we can't find (deleted, or not loaded) still shows as itself
  // rather than silently reading as "No project".
  const projectMissing =
    Boolean(values.projectId) && !projects.some((p) => p.id === values.projectId)

  // Autosave draft protection — restores work-in-progress if the tab/browser
  // closed before saving. Cleared on successful save or explicit discard.
  useEffect(() => {
    const key = draftKey(mode, initial.slug)
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) {
        // Drafts saved before projects existed have no projectId — keep the initial one.
        const draft = JSON.parse(raw) as Partial<NoteEditorValues>
        setValues({ ...draft, projectId: draft.projectId ?? initial.projectId } as NoteEditorValues)
        setDraftRestored(true)
      }
    } catch {
      // Corrupt/unavailable storage — fall back to the initial values.
    }
    // Only re-run for a different note; initial.projectId is read once as the fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.slug, mode])

  useEffect(() => {
    const key = draftKey(mode, initial.slug)
    setDraftSaved(false)
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(values))
        setDraftSaved(true)
      } catch {
        // Storage full/unavailable — autosave is best-effort only.
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [values, mode, initial.slug])

  function discardDraft() {
    setValues(initialRef.current)
    setDraftRestored(false)
    try {
      window.localStorage.removeItem(draftKey(mode, initial.slug))
    } catch {
      // Best-effort only.
    }
  }

  const set = (patch: Partial<NoteEditorValues>) => setValues((prev) => ({ ...prev, ...patch }))

  const errors = validateNoteInput(values)

  const handleSave = async () => {
    if (Object.keys(errors).length > 0) {
      setError(errors.title || errors.content || errors.sourceUrl || "Fix the highlighted fields.")
      return
    }
    if (!values.slug.trim()) return setError("Slug is required.")
    if (mode === "create" && isReservedNoteSlug(slugify(values.slug)))
      return setError(`"${slugify(values.slug)}" is reserved. Choose a different slug.`)
    setError("")
    setIsSaving(true)
    try {
      await onSave({ ...values, slug: slugify(values.slug) })
      try {
        window.localStorage.removeItem(draftKey(mode, initial.slug))
      } catch {
        // Best-effort only.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {draftRestored && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-300">
          <span>Restored an unsaved draft from your last session.</span>
          <button
            type="button"
            onClick={discardDraft}
            className="min-h-11 rounded-lg px-2 underline underline-offset-2 hover:no-underline"
          >
            Discard draft
          </button>
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
                onChange={(e) =>
                  set({
                    title: e.target.value,
                    // keep slug synced to title while creating, until user edits it
                    ...(mode === "create" && values.slug === slugify(values.title)
                      ? { slug: slugify(e.target.value) }
                      : {}),
                  })
                }
                placeholder="Note title"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-xl font-semibold text-foreground placeholder:opacity-30 focus:outline-none sm:text-2xl"
              />
              <button
                type="button"
                onClick={() => set({ pinned: !values.pinned })}
                aria-pressed={values.pinned}
                aria-label={values.pinned ? "Unpin note" : "Pin note"}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-lg border transition-colors",
                  values.pinned
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Star size={18} className={values.pinned ? "fill-current" : ""} />
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
                onChange={(e) => set({ slug: e.target.value })}
                disabled={mode === "edit"}
                placeholder="slug"
                className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-base text-foreground disabled:opacity-50 focus:border-blue-500/50 focus:outline-none sm:text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-start">
            <button
              onClick={onCancel}
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/70"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              type="button"
              disabled={isSaving}
              className="flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-3 border-t border-border/60 pt-4",
            projectsUnavailable ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4",
          )}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <Select
              value={values.noteType}
              onValueChange={(value) => set({ noteType: value as NoteType })}
            >
              <SelectTrigger className="w-full" aria-label="Note type">
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
              <label className="text-xs font-medium text-muted-foreground">Project</label>
              <Select
                value={values.projectId || NO_PROJECT_VALUE}
                onValueChange={(value) =>
                  set({ projectId: value === NO_PROJECT_VALUE ? "" : value })
                }
              >
                <SelectTrigger className="w-full" aria-label="Project">
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
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Input
              value={values.category}
              onChange={(e) => set({ category: e.target.value })}
              placeholder="e.g. Backend, Interview prep"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Source URL (optional)
            </label>
            <Input
              value={values.sourceUrl}
              onChange={(e) => set({ sourceUrl: e.target.value })}
              placeholder="https://…"
              aria-invalid={Boolean(errors.sourceUrl)}
            />
          </div>
        </div>

        <div className="space-y-1.5 border-t border-border/60 pt-4">
          <label className="text-xs font-medium text-muted-foreground">Tags</label>
          <TagEditor tags={values.tags} onChange={(tags) => set({ tags })} />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={cn(
              "min-h-11 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              !preview
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Pencil size={13} />
            Write
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={cn(
              "min-h-11 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              preview ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye size={13} />
            Preview
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span aria-live="polite" className="text-xs text-muted-foreground">
            {draftSaved ? "Draft saved locally" : "Saving draft…"}
          </span>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground">
            Pinned
            <Switch
              checked={values.pinned}
              onCheckedChange={(checked) => set({ pinned: checked })}
            />
          </label>
        </div>
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
    </div>
  )
}
