"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getApiErrorMessage } from "@/lib/api"
import {
  parseTagList,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  validateProjectInput,
  type Project,
  type ProjectInput,
  type ProjectStatus,
  type ProjectType,
} from "@/lib/note-projects"

interface FormState {
  name: string
  description: string
  projectType: ProjectType
  status: ProjectStatus
  tags: string
  repoUrl: string
  startDate: string
  targetDate: string
}

function initialState(project?: Project | null): FormState {
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    projectType: project?.projectType ?? "personal",
    status: project?.status ?? "active",
    tags: (project?.tags ?? []).join(", "),
    repoUrl: project?.repoUrl ?? "",
    startDate: project?.startDate ?? "",
    targetDate: project?.targetDate ?? "",
  }
}

function toInput(state: FormState): ProjectInput {
  return {
    name: state.name,
    description: state.description,
    projectType: state.projectType,
    status: state.status,
    tags: parseTagList(state.tags),
    repoUrl: state.repoUrl,
    startDate: state.startDate,
    targetDate: state.targetDate,
  }
}

/**
 * New project / Edit project. Only the name is required; type, status and the
 * "More options" fields are all saved. Validation mirrors the table's checks.
 * The form remounts each time it opens (keyed by the parent), so it always
 * starts from the project's current values.
 */
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing. */
  project?: Project | null
  onSubmit: (input: ProjectInput) => Promise<void>
}) {
  const editing = Boolean(project)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Changes apply to the project only. Its notes stay as they are."
              : "Only a name is needed. You can add the rest later."}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ProjectForm
            project={project}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ProjectForm({
  project,
  onCancel,
  onSubmit,
}: {
  project?: Project | null
  onCancel: () => void
  onSubmit: (input: ProjectInput) => Promise<void>
}) {
  const editing = Boolean(project)
  const [state, setState] = useState<FormState>(() => initialState(project))
  const [showErrors, setShowErrors] = useState(false)
  const [moreOpen, setMoreOpen] = useState(
    () => editing && Boolean(project?.tags.length || project?.repoUrl || project?.startDate || project?.targetDate),
  )
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const errors = validateProjectInput(toInput(state))
  const visible = showErrors ? errors : {}
  const set = (patch: Partial<FormState>) => setState((prev) => ({ ...prev, ...patch }))

  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (Object.keys(errors).length > 0) {
      setShowErrors(true)
      // Errors in hidden fields must be visible to be fixed.
      if (errors.tags || errors.repoUrl || errors.targetDate) setMoreOpen(true)
      return
    }
    setSaving(true)
    setSubmitError("")
    try {
      await onSubmit(toInput(state))
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "Couldn't save the project. Try again."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          id="project-name"
          value={state.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Sample Spring Boot API"
          autoFocus
          aria-invalid={Boolean(visible.name) || undefined}
          aria-describedby={visible.name ? "project-name-error" : undefined}
          className="h-11"
        />
        {visible.name && (
          <p id="project-name-error" role="alert" className="text-sm text-destructive">
            {visible.name}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="project-description">
          Short description <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="project-description"
          value={state.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="What is this project about?"
          aria-invalid={Boolean(visible.description) || undefined}
          aria-describedby={visible.description ? "project-description-error" : undefined}
          className="h-11"
        />
        {visible.description && (
          <p id="project-description-error" role="alert" className="text-sm text-destructive">
            {visible.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="project-type">Type</Label>
          <Select
            value={state.projectType}
            onValueChange={(v) => set({ projectType: v as ProjectType })}
          >
            <SelectTrigger id="project-type" className="h-11! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-status">Status</Label>
          <Select value={state.status} onValueChange={(v) => set({ status: v as ProjectStatus })}>
            <SelectTrigger id="project-status" className="h-11! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={moreOpen}
        aria-controls="project-more-options"
        onClick={() => setMoreOpen((v) => !v)}
        className="min-h-11 rounded-md text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {moreOpen ? "Hide more options" : "More options"}
      </button>

      {moreOpen && (
        <div id="project-more-options" className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-tags">Technology tags</Label>
            <Input
              id="project-tags"
              value={state.tags}
              onChange={(e) => set({ tags: e.target.value })}
              placeholder="Spring Boot, PostgreSQL"
              aria-describedby="project-tags-hint"
              aria-invalid={Boolean(visible.tags) || undefined}
              className="h-11"
            />
            <p id="project-tags-hint" className="text-xs text-muted-foreground">
              Separate tags with commas.
            </p>
            {visible.tags && (
              <p role="alert" className="text-sm text-destructive">
                {visible.tags}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-link">Repository or docs link</Label>
            <Input
              id="project-link"
              type="url"
              inputMode="url"
              value={state.repoUrl}
              onChange={(e) => set({ repoUrl: e.target.value })}
              placeholder="https://"
              aria-invalid={Boolean(visible.repoUrl) || undefined}
              aria-describedby={visible.repoUrl ? "project-link-error" : undefined}
              className="h-11"
            />
            {visible.repoUrl && (
              <p id="project-link-error" role="alert" className="text-sm text-destructive">
                {visible.repoUrl}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="project-start">Start date</Label>
              <Input
                id="project-start"
                type="date"
                value={state.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-target">Target date</Label>
              <Input
                id="project-target"
                type="date"
                value={state.targetDate}
                onChange={(e) => set({ targetDate: e.target.value })}
                aria-invalid={Boolean(visible.targetDate) || undefined}
                aria-describedby={visible.targetDate ? "project-target-error" : undefined}
                className="h-11"
              />
            </div>
          </div>
          {visible.targetDate && (
            <p id="project-target-error" role="alert" className="text-sm text-destructive">
              {visible.targetDate}
            </p>
          )}
        </div>
      )}

      {submitError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-11 flex-1" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Create project"}
        </Button>
      </DialogFooter>
    </form>
  )
}
