"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookMarked, FolderPlus, Inbox, Pin, Search, X } from "lucide-react"
import { toast } from "sonner"

import {
  FilterChip,
  NoteTypeChip,
  ProjectStatusPill,
  ProjectTile,
  updatedLabel,
} from "@/components/notes/project-ui"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorMessage } from "@/lib/api"
import { useInboxMutations } from "@/hooks/useInbox"
import { useNoteSearch } from "@/hooks/useNotes"
import {
  filterProjectsByStatus,
  projectTypeLabel,
  PROJECT_STATUSES,
  selectRecentlyOpenedProjects,
  type Project,
  type ProjectStatus,
} from "@/lib/note-projects"
import {
  buildCaptureInput,
  buildNoteSearchResults,
  countNotesByType,
  groupNotesIntoProjects,
  NO_PROJECT_ID,
  projectIdOf,
  selectPinnedNotes,
  selectRecentNotes,
  type NoteProject,
} from "@/lib/notes-home"
import {
  filterNotesMeta,
  NOTE_TYPES,
  sortNotesMeta,
  type NoteMeta,
  type NoteType,
} from "@/lib/notes"
import { cn } from "@/lib/utils"

const sectionTitle = "text-base font-semibold tracking-tight text-foreground"
const panel = "rounded-xl border border-border bg-card"
const rowLink =
  "outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"

/** One note as a full-width row: title, preview, type, project, tags, updated. */
function NoteRow({
  note,
  projectName,
  compact = false,
}: {
  note: NoteMeta
  projectName?: string
  compact?: boolean
}) {
  const updated = updatedLabel(note.updatedAt)
  return (
    <Link
      href={`/notes/${note.slug}`}
      className={cn("flex flex-col gap-1.5 px-4 py-3 text-foreground", rowLink)}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className={cn("truncate font-semibold", compact ? "text-sm" : "text-base")}>
          {note.title}
        </span>
        {note.pinned && (
          <Pin size={13} className="shrink-0 text-primary" aria-label="Pinned" role="img" />
        )}
      </span>
      {!compact && note.description && (
        <span className="line-clamp-2 text-sm text-muted-foreground">{note.description}</span>
      )}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <NoteTypeChip noteType={note.noteType} />
        {projectName && <span className="max-w-[16rem] truncate">{projectName}</span>}
        {!compact && (note.tags ?? []).slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
        {updated && <span>Updated {updated}</span>}
      </span>
    </Link>
  )
}

function NoteList({
  notes,
  projectNames,
  compact,
}: {
  notes: NoteMeta[]
  projectNames: Map<string, string>
  compact?: boolean
}) {
  return (
    <ul className={cn(panel, "divide-y divide-border overflow-hidden")}>
      {notes.map((note) => (
        <li key={note.slug}>
          <NoteRow
            note={note}
            compact={compact}
            projectName={note.projectId ? projectNames.get(note.projectId) : undefined}
          />
        </li>
      ))}
    </ul>
  )
}

function noteCountText(count: number) {
  return `${count} ${count === 1 ? "note" : "notes"}`
}

/** A real project as a list row linking to its workspace. */
function ProjectListRow({ group }: { group: NoteProject }) {
  const project = group.project as Project
  const updated = updatedLabel(group.updatedAt)
  return (
    <Link
      href={`/notes/projects/${project.id}`}
      className={cn("flex min-h-16 items-center gap-3 px-4 py-2.5", rowLink)}
    >
      <ProjectTile name={project.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-foreground">
          {project.name}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {projectTypeLabel(project.projectType)} · {noteCountText(group.noteCount)}
          {updated && ` · Updated ${updated}`}
        </span>
      </span>
      <ProjectStatusPill status={project.status} />
    </Link>
  )
}

/** The "No project" bucket — filters the All notes list instead of opening a workspace. */
function NoProjectRow({ group, onOpen }: { group: NoteProject; onOpen: () => void }) {
  const updated = updatedLabel(group.updatedAt)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn("flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left", rowLink)}
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
      >
        <Inbox size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-foreground">No project</span>
        <span className="block text-sm text-muted-foreground">
          {noteCountText(group.noteCount)}
          {updated && ` · Updated ${updated}`}
        </span>
      </span>
      <span className="text-xs font-medium text-primary">Show notes</span>
    </button>
  )
}

const STATUS_FILTERS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...PROJECT_STATUSES,
]

/**
 * Notes Home (/notes) — rebuilt from the "Notes · Home" design. Search with an
 * always-visible scope, Recently opened + All projects, the full note list,
 * and a side column with Quick Capture, pinned and recent notes, and
 * reference notes. Quick Capture writes to the Inbox.
 */
export function NotesHome({
  notes,
  projects,
  projectsLoading,
  projectsUnavailable,
  projectsError,
  onNewProject,
}: {
  notes: NoteMeta[]
  projects: Project[]
  projectsLoading: boolean
  /** The projects migration isn't applied yet — show notes only. */
  projectsUnavailable: boolean
  projectsError: string
  onNewProject: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState("all")
  const [noteType, setNoteType] = useState<NoteType | "all">("all")
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [noProjectOnly, setNoProjectOnly] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all")
  const [capture, setCapture] = useState("")
  const [captureHint, setCaptureHint] = useState(false)
  const allNotesRef = useRef<HTMLElement>(null)

  const { capture: captureMutation } = useInboxMutations()
  const hasQuery = query.trim().length > 0
  const { results: searchMatches, searching, error: searchError } = useNoteSearch(query)

  const groups = useMemo(() => groupNotesIntoProjects(notes, projects), [notes, projects])
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const projectNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])
  const knownIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects])
  const noProjectGroup = groupById.get(NO_PROJECT_ID)
  const effectiveScope = groupById.has(scope) ? scope : "all"

  const results = useMemo(
    () =>
      buildNoteSearchResults({
        query,
        scope: effectiveScope,
        projects: groups,
        noteMatches: sortNotesMeta(searchMatches),
        noteType,
      }),
    [query, effectiveScope, groups, searchMatches, noteType],
  )

  const recentlyOpened = useMemo(() => selectRecentlyOpenedProjects(projects, 3), [projects])
  const listedProjects = useMemo(
    () => filterProjectsByStatus(projects, statusFilter),
    [projects, statusFilter],
  )
  const listedNotes = useMemo(
    () =>
      sortNotesMeta(
        filterNotesMeta(notes, { noteType, pinnedOnly }).filter(
          (n) => !noProjectOnly || projectIdOf(n, knownIds) === NO_PROJECT_ID,
        ),
      ),
    [notes, noteType, pinnedOnly, noProjectOnly, knownIds],
  )
  const pinned = useMemo(() => selectPinnedNotes(notes), [notes])
  const recent = useMemo(() => selectRecentNotes(notes, 5), [notes])
  const referenceCount = useMemo(() => countNotesByType(notes, "reference"), [notes])
  const filtersActive = noteType !== "all" || pinnedOnly || noProjectOnly

  const showAllNotes = (opts: { type?: NoteType | "all"; noProject?: boolean } = {}) => {
    setNoteType(opts.type ?? "all")
    setPinnedOnly(false)
    setNoProjectOnly(Boolean(opts.noProject))
    allNotesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const saveCapture = async () => {
    const input = buildCaptureInput(capture)
    if (!input) {
      setCaptureHint(true)
      return
    }
    try {
      await captureMutation.mutateAsync(input)
      setCapture("")
      setCaptureHint(false)
      toast.success("Saved to Inbox. Organize it later.", {
        action: { label: "Open Inbox", onClick: () => router.push("/inbox") },
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save to Inbox. Your text is still here."))
    }
  }

  return (
    <div className="space-y-6">
      {/* Search with an explicit scope */}
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              aria-label="Search notes and projects"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, notes, descriptions and tags"
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
          <div className="flex gap-2">
            <Select value={effectiveScope} onValueChange={setScope}>
              <SelectTrigger
                className="h-12! min-w-0 flex-1 rounded-xl sm:w-56 sm:flex-none"
                aria-label="Search scope"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Searching: All notes</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    In: {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType | "all")}>
              <SelectTrigger className="h-12! w-36 rounded-xl" aria-label="Filter by note type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {NOTE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Searches project names and tags, plus note titles, descriptions and content.
        </p>
      </div>

      {hasQuery ? (
        <section aria-label="Search results" className="space-y-4">
          <p role="status" className="text-sm text-muted-foreground">
            {searching ? "Searching…" : results.summary}
          </p>
          {searchError && (
            <p role="alert" className="text-sm text-destructive">
              {searchError} Try again in a moment.
            </p>
          )}
          {!searching && !searchError && results.total === 0 && (
            <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-border px-6 py-12 text-center">
              <h2 className="text-base font-semibold text-foreground">Nothing found</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                {effectiveScope === "all" && noteType === "all"
                  ? "Try different words."
                  : "Try different words, or search all notes instead of one project or type."}
              </p>
              {effectiveScope === "all" && noteType === "all" ? (
                <Button variant="outline" className="h-11" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              ) : (
                <Button
                  className="h-11"
                  onClick={() => {
                    setScope("all")
                    setNoteType("all")
                  }}
                >
                  Search all notes
                </Button>
              )}
            </div>
          )}
          {results.projectHits.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Projects
              </h2>
              <div className={cn(panel, "divide-y divide-border overflow-hidden")}>
                {results.projectHits.map((group) => (
                  <ProjectListRow key={group.id} group={group} />
                ))}
              </div>
            </div>
          )}
          {results.noteHits.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Notes
              </h2>
              <NoteList notes={results.noteHits} projectNames={projectNames} />
            </div>
          )}
        </section>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
          <div className="min-w-0 space-y-8">
            {projectsUnavailable ? (
              <section aria-labelledby="notes-projects" className="space-y-3">
                <h2 id="notes-projects" className={sectionTitle}>
                  Projects
                </h2>
                <div className={cn(panel, "overflow-hidden")}>
                  <p className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
                    Projects aren&apos;t set up yet: the database update for them hasn&apos;t been
                    applied. Your notes work as usual.
                  </p>
                  {noProjectGroup && (
                    <NoProjectRow
                      group={noProjectGroup}
                      onOpen={() => showAllNotes({ noProject: true })}
                    />
                  )}
                </div>
              </section>
            ) : (
              <>
                {recentlyOpened.length > 0 && (
                  <section aria-labelledby="notes-recent-projects" className="space-y-3">
                    <h2 id="notes-recent-projects" className={sectionTitle}>
                      Recently opened
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
                      {recentlyOpened.map((project) => {
                        const group = groupById.get(project.id)
                        const updated = updatedLabel(group?.updatedAt)
                        return (
                          <Link
                            key={project.id}
                            href={`/notes/projects/${project.id}`}
                            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-foreground outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="flex items-center justify-between gap-2">
                              <ProjectTile name={project.name} />
                              <ProjectStatusPill status={project.status} />
                            </span>
                            <span>
                              <span className="block truncate text-base font-semibold">
                                {project.name}
                              </span>
                              {project.description && (
                                <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                                  {project.description}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {noteCountText(group?.noteCount ?? 0)}
                              {updated && ` · Updated ${updated}`}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </section>
                )}

                <section aria-labelledby="notes-projects" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="notes-projects" className={sectionTitle}>
                      All projects · <span className="tabular-nums">{projects.length}</span>
                    </h2>
                    {projects.length > 0 && (
                      <div
                        role="group"
                        aria-label="Project status"
                        className="flex flex-wrap gap-1.5"
                      >
                        {STATUS_FILTERS.map((s) => (
                          <FilterChip
                            key={s.value}
                            pressed={statusFilter === s.value}
                            onClick={() => setStatusFilter(s.value)}
                          >
                            {s.label}
                          </FilterChip>
                        ))}
                      </div>
                    )}
                  </div>
                  {projectsLoading ? (
                    <Skeleton className="h-16 w-full rounded-xl" />
                  ) : projectsError ? (
                    <p role="alert" className={cn(panel, "px-4 py-3 text-sm text-destructive")}>
                      {projectsError} Your notes are still listed below.
                    </p>
                  ) : (
                    <div className={cn(panel, "divide-y divide-border overflow-hidden")}>
                      {projects.length === 0 && (
                        <div className="flex flex-col items-start gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-muted-foreground">
                            No projects yet. Group related notes, decisions and references in one
                            place.
                          </p>
                          <Button variant="outline" className="h-11 gap-1.5" onClick={onNewProject}>
                            <FolderPlus size={16} aria-hidden="true" />
                            New project
                          </Button>
                        </div>
                      )}
                      {projects.length > 0 && listedProjects.length === 0 && (
                        <p className="px-4 py-4 text-sm text-muted-foreground">
                          No projects with this status.
                        </p>
                      )}
                      {listedProjects.map((project) => {
                        const group = groupById.get(project.id)
                        return group ? <ProjectListRow key={project.id} group={group} /> : null
                      })}
                      {noProjectGroup && statusFilter === "all" && (
                        <NoProjectRow
                          group={noProjectGroup}
                          onOpen={() => showAllNotes({ noProject: true })}
                        />
                      )}
                    </div>
                  )}
                </section>
              </>
            )}

            {/* All notes */}
            <section
              ref={allNotesRef}
              aria-labelledby="notes-all"
              className="scroll-mt-24 space-y-3"
            >
              <h2 id="notes-all" className={sectionTitle}>
                All notes · <span className="tabular-nums">{listedNotes.length}</span>
              </h2>
              <div role="group" aria-label="Filter notes" className="flex flex-wrap gap-1.5">
                <FilterChip pressed={noteType === "all"} onClick={() => setNoteType("all")}>
                  All
                </FilterChip>
                {NOTE_TYPES.map((type) => (
                  <FilterChip
                    key={type.value}
                    pressed={noteType === type.value}
                    onClick={() => setNoteType(type.value)}
                  >
                    {type.label}
                  </FilterChip>
                ))}
                <FilterChip pressed={pinnedOnly} onClick={() => setPinnedOnly((v) => !v)}>
                  <Pin size={12} aria-hidden="true" />
                  Pinned
                </FilterChip>
                {noProjectOnly && (
                  <FilterChip pressed onClick={() => setNoProjectOnly(false)}>
                    No project
                    <X size={12} aria-hidden="true" />
                    <span className="sr-only">(remove filter)</span>
                  </FilterChip>
                )}
              </div>
              {listedNotes.length > 0 ? (
                <NoteList notes={listedNotes} projectNames={projectNames} />
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-border px-6 py-12 text-center">
                  <h3 className="text-base font-semibold text-foreground">No notes yet</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Write your first note, or capture a quick thought and organize it later.
                  </p>
                  <Button asChild className="h-11">
                    <Link href="/notes/new">New note</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-border px-6 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No notes match these filters.</p>
                  {filtersActive && (
                    <Button variant="outline" className="h-11" onClick={() => showAllNotes()}>
                      Show all notes
                    </Button>
                  )}
                </div>
              )}
            </section>
          </div>

          <aside aria-label="Notes shortcuts" className="min-w-0 space-y-6">
            <section aria-labelledby="notes-capture" className={cn(panel, "space-y-2.5 p-4")}>
              <h2 id="notes-capture" className="text-base font-semibold text-foreground">
                Quick Capture
              </h2>
              <label htmlFor="notes-capture-text" className="sr-only">
                Quick capture text
              </label>
              <Textarea
                id="notes-capture-text"
                rows={3}
                value={capture}
                onChange={(e) => {
                  setCapture(e.target.value)
                  if (captureHint) setCaptureHint(false)
                }}
                placeholder="Jot down advice, an idea or a question. Organize it later."
                aria-invalid={captureHint || undefined}
                aria-describedby={captureHint ? "notes-capture-hint" : undefined}
                className="min-h-20 text-base"
              />
              {captureHint && (
                <p id="notes-capture-hint" role="alert" className="text-xs text-destructive">
                  Type something to capture first.
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Saved to Inbox</span>
                <Button className="h-11" onClick={saveCapture} disabled={captureMutation.isPending}>
                  {captureMutation.isPending ? "Saving…" : "Capture"}
                </Button>
              </div>
            </section>

            <section aria-labelledby="notes-pinned" className="space-y-2">
              <h2 id="notes-pinned" className="text-base font-semibold text-foreground">
                Pinned notes
              </h2>
              {pinned.length > 0 ? (
                <NoteList notes={pinned} projectNames={projectNames} compact />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pin a note from its page to keep it here.
                </p>
              )}
            </section>

            <section aria-labelledby="notes-recent" className="space-y-2">
              <h2 id="notes-recent" className="text-base font-semibold text-foreground">
                Recent notes
              </h2>
              {recent.length > 0 ? (
                <NoteList notes={recent} projectNames={projectNames} compact />
              ) : (
                <p className="text-sm text-muted-foreground">Nothing yet.</p>
              )}
            </section>

            <section aria-labelledby="notes-resources" className={cn(panel, "space-y-1.5 p-4")}>
              <h2
                id="notes-resources"
                className="flex items-center gap-2 text-base font-semibold text-foreground"
              >
                <BookMarked size={16} aria-hidden="true" className="text-muted-foreground" />
                Knowledge resources
              </h2>
              <p className="text-sm text-muted-foreground">
                Docs links, repos, commands and prompts. These are regular notes with the Reference
                type.
              </p>
              <button
                type="button"
                onClick={() => showAllNotes({ type: "reference" })}
                className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Browse reference notes ({referenceCount})
              </button>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
