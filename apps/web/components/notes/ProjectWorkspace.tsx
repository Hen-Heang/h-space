"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ExternalLink, FileText, Pencil, Pin, Plus, Search, X } from "lucide-react"
import { toast } from "sonner"

import {
  FilterChip,
  formatDay,
  NoteTypeChip,
  ProjectStatusPill,
  ProjectTile,
  updatedLabel,
} from "@/components/notes/project-ui"
import { ProjectFormDialog } from "@/components/notes/ProjectFormDialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNoteProjectMutations } from "@/hooks/useNoteProjects"
import {
  notesInProject,
  projectStatusLabel,
  projectTypeLabel,
  selectDecisionNotes,
  type Project,
  type ProjectInput,
} from "@/lib/note-projects"
import { selectRecentNotes } from "@/lib/notes-home"
import {
  filterNotesMeta,
  NOTE_TYPES,
  sortNotesMeta,
  type NoteMeta,
  type NoteType,
} from "@/lib/notes"
import { cn } from "@/lib/utils"

const panel = "rounded-xl border border-border bg-card"
const cardTitle = "text-base font-semibold text-foreground"

function NoteRow({ note }: { note: NoteMeta }) {
  const updated = updatedLabel(note.updatedAt)
  return (
    <Link
      href={`/notes/${note.slug}`}
      className="flex flex-col gap-1.5 px-4 py-3 text-foreground outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-base font-semibold">{note.title}</span>
        {note.pinned && (
          <Pin size={13} className="shrink-0 text-primary" aria-label="Pinned" role="img" />
        )}
      </span>
      {note.description && (
        <span className="line-clamp-2 text-sm text-muted-foreground">{note.description}</span>
      )}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <NoteTypeChip noteType={note.noteType} />
        {(note.tags ?? []).slice(0, 3).map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
        {updated && <span>Updated {updated}</span>}
      </span>
    </Link>
  )
}

function NoteList({ notes }: { notes: NoteMeta[] }) {
  return (
    <ul className={cn(panel, "divide-y divide-border overflow-hidden")}>
      {notes.map((note) => (
        <li key={note.slug}>
          <NoteRow note={note} />
        </li>
      ))}
    </ul>
  )
}

function newNoteHref(projectId: string, type?: NoteType) {
  const params = new URLSearchParams({ project: projectId })
  if (type) params.set("type", type)
  return `/notes/new?${params.toString()}`
}

function ProposedPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-border px-5 py-8">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <span className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          Proposed
        </span>
      </div>
      <div className="max-w-prose space-y-2 text-sm text-muted-foreground">{children}</div>
    </div>
  )
}

/** Note-type filters shown in the Notes tab (the design's set, plus the app's other types). */
const NOTE_FILTERS: { value: NoteType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...NOTE_TYPES,
]

/**
 * Project Workspace (/notes/projects/[id]) — rebuilt from the "Notes ·
 * Project workspace" design. Overview, Notes and Decisions read the project's
 * notes; Mentor Feedback and Linked Tasks are labelled Proposed until their
 * data exists (Planner stays the source of truth for tasks).
 */
export function ProjectWorkspace({ project, notes }: { project: Project; notes: NoteMeta[] }) {
  const { update, markOpened } = useNoteProjectMutations()
  const [editOpen, setEditOpen] = useState(false)
  const [tab, setTab] = useState("overview")
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<NoteType | "all">("all")

  // Stamp "Recently opened" once per visit to this project.
  const openedRef = useRef<string | null>(null)
  const { mutate: stampOpened } = markOpened
  useEffect(() => {
    if (openedRef.current === project.id) return
    openedRef.current = project.id
    stampOpened(project.id)
  }, [project.id, stampOpened])

  const projectNotes = useMemo(() => notesInProject(notes, project.id), [notes, project.id])
  const recentNotes = useMemo(() => selectRecentNotes(projectNotes, 3), [projectNotes])
  const decisions = useMemo(() => selectDecisionNotes(notes, project.id), [notes, project.id])
  const filteredNotes = useMemo(
    () => sortNotesMeta(filterNotesMeta(projectNotes, { noteType: typeFilter, query })),
    [projectNotes, typeFilter, query],
  )
  const notesFiltered = query.trim().length > 0 || typeFilter !== "all"

  const saveProject = async (input: ProjectInput) => {
    await update.mutateAsync({ id: project.id, input })
    setEditOpen(false)
    toast.success("Project updated")
  }

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Type", value: projectTypeLabel(project.projectType) },
    { label: "Status", value: projectStatusLabel(project.status) },
    ...(project.startDate ? [{ label: "Start", value: formatDay(project.startDate) }] : []),
    ...(project.targetDate ? [{ label: "Target", value: formatDay(project.targetDate) }] : []),
    { label: "Notes", value: projectNotes.length },
    { label: "Updated", value: updatedLabel(project.updatedAt) },
  ]

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex min-w-0 items-center gap-1.5">
          <li>
            <Link
              href="/notes"
              className="inline-flex min-h-11 items-center rounded-md px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Notes
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="truncate font-medium text-foreground">
            {project.name}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <ProjectTile name={project.name} size="lg" />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight break-words text-foreground">
                {project.name}
              </h2>
              <ProjectStatusPill status={project.status} />
            </div>
            {project.description && (
              <p className="max-w-prose text-sm text-muted-foreground">{project.description}</p>
            )}
            {(project.tags.length > 0 || project.repoUrl) && (
              <div className="flex flex-wrap items-center gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
                {project.repoUrl && (
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center gap-1 rounded-md text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Repository or docs
                    <ExternalLink size={12} aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" className="h-11 gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil size={15} aria-hidden="true" />
            Edit project
          </Button>
          <Button asChild className="h-11 gap-1.5">
            <Link href={newNoteHref(project.id)}>
              <Plus size={16} aria-hidden="true" />
              New note
            </Link>
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        <div className="no-scrollbar -mx-1 overflow-x-auto border-b border-border px-1">
          <TabsList variant="line" aria-label="Project sections" className="h-11! min-w-max gap-1">
            <TabsTrigger value="overview" className="h-11 px-3">
              Overview
            </TabsTrigger>
            <TabsTrigger value="notes" className="h-11 px-3">
              Notes{" "}
              <span className="tabular-nums text-muted-foreground">{projectNotes.length}</span>
            </TabsTrigger>
            <TabsTrigger value="decisions" className="h-11 px-3">
              Decisions{" "}
              <span className="tabular-nums text-muted-foreground">{decisions.length}</span>
            </TabsTrigger>
            <TabsTrigger value="mentor" className="h-11 px-3">
              Mentor Feedback
            </TabsTrigger>
            <TabsTrigger value="tasks" className="h-11 px-3">
              Linked Tasks
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview */}
        <TabsContent value="overview" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <section aria-labelledby="ws-purpose" className={cn(panel, "space-y-2 p-4")}>
              <h3 id="ws-purpose" className={cardTitle}>
                Purpose
              </h3>
              {project.description ? (
                <p className="text-sm text-foreground">{project.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description yet.{" "}
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="min-h-11 font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Add one
                  </button>
                </p>
              )}
            </section>

            <section aria-labelledby="ws-recent" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 id="ws-recent" className={cardTitle}>
                  Recently updated notes
                </h3>
                {projectNotes.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setTab("notes")}
                    className="min-h-11 text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    All {projectNotes.length} notes
                  </button>
                )}
              </div>
              {recentNotes.length > 0 ? (
                <NoteList notes={recentNotes} />
              ) : (
                <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border px-4 py-6">
                  <p className="text-sm text-muted-foreground">
                    No notes in this project yet. New notes you start here are filed in it, and you
                    can move an existing note in from its editor.
                  </p>
                  <Button asChild className="h-11 gap-1.5">
                    <Link href={newNoteHref(project.id)}>
                      <Plus size={16} aria-hidden="true" />
                      New note
                    </Link>
                  </Button>
                </div>
              )}
            </section>

            {decisions.length > 0 && (
              <section
                aria-labelledby="ws-latest-decision"
                className={cn(panel, "space-y-1.5 p-4")}
              >
                <h3 id="ws-latest-decision" className={cardTitle}>
                  Latest decision
                </h3>
                <Link
                  href={`/notes/${decisions[0].slug}`}
                  className="block min-h-11 rounded-md text-sm font-semibold text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {decisions[0].title}
                </Link>
                {decisions[0].description && (
                  <p className="text-sm text-muted-foreground">{decisions[0].description}</p>
                )}
              </section>
            )}
          </div>

          <aside aria-labelledby="ws-details" className={cn(panel, "h-fit space-y-3 p-4")}>
            <h3 id="ws-details" className={cardTitle}>
              Details
            </h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {details.map((d) => (
                <div key={d.label} className="contents">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="text-foreground">{d.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="space-y-4">
          <div className="relative">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              aria-label={`Search notes in ${project.name}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search this project's notes"
              className="h-12 w-full rounded-xl border border-border bg-card pr-12 pl-11 text-base text-foreground outline-none placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <div role="group" aria-label="Filter by note type" className="flex flex-wrap gap-1.5">
            {NOTE_FILTERS.map((f) => (
              <FilterChip
                key={f.value}
                pressed={typeFilter === f.value}
                onClick={() => setTypeFilter(f.value)}
              >
                {f.label}
              </FilterChip>
            ))}
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
            {notesFiltered ? ` of ${projectNotes.length}` : ""} · pinned first
          </p>
          {filteredNotes.length > 0 ? (
            <NoteList notes={filteredNotes} />
          ) : projectNotes.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-border px-6 py-12 text-center">
              <h3 className="text-base font-semibold text-foreground">No notes yet</h3>
              <Button asChild className="h-11 gap-1.5">
                <Link href={newNoteHref(project.id)}>
                  <Plus size={16} aria-hidden="true" />
                  New note
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">No notes match these filters.</p>
              <Button
                variant="outline"
                className="h-11"
                onClick={() => {
                  setQuery("")
                  setTypeFilter("all")
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Decisions */}
        <TabsContent value="decisions" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Notes in this project with the Decision type, newest first.
          </p>
          {decisions.length > 0 ? (
            <ol className="space-y-3">
              {decisions.map((note) => (
                <li key={note.slug} className={cn(panel, "space-y-2 p-4")}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-foreground">{note.title}</h3>
                    {note.updatedAt && (
                      <time dateTime={note.updatedAt} className="text-xs text-muted-foreground">
                        {formatDay(note.updatedAt)}
                      </time>
                    )}
                  </div>
                  {note.description && (
                    <p className="text-sm text-muted-foreground">{note.description}</p>
                  )}
                  <Link
                    href={`/notes/${note.slug}`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <FileText size={14} aria-hidden="true" />
                    Open full note
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border px-4 py-6">
              <p className="text-sm text-muted-foreground">
                No decisions recorded yet. Write one down with its context, options and reason so
                you remember why later.
              </p>
              <Button asChild variant="outline" className="h-11 gap-1.5">
                <Link href={newNoteHref(project.id, "decision")}>
                  <Plus size={16} aria-hidden="true" />
                  New decision
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="mentor">
          <ProposedPanel title="Mentor Feedback">
            <p>
              Capturing advice with a takeaway, a next action and a Captured → Reviewed → Applied
              status needs a new note type and fields. That data model hasn&apos;t been approved
              yet, so nothing here saves anything.
            </p>
            <p>For now, write advice as a regular note in this project.</p>
          </ProposedPanel>
        </TabsContent>

        <TabsContent value="tasks">
          <ProposedPanel title="Linked Tasks">
            <p>
              Planner stays the source of truth for tasks. Showing a project&apos;s open and
              completed tasks here needs a link between notes and Planner tasks, which is still a
              proposed change.
            </p>
            <p>
              <Link
                href="/goals/tasks"
                className="inline-flex min-h-11 items-center font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Open Planner tasks
              </Link>
            </p>
          </ProposedPanel>
        </TabsContent>
      </Tabs>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSubmit={saveProject}
      />
    </div>
  )
}
