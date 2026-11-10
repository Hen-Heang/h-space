"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { FolderPlus, Inbox, NotebookPen, Pin, SearchX } from "lucide-react"

import {
  countText,
  FilterChip,
  NoteListRow,
  ProjectListRow,
  ROW_LINK,
  RowList,
  updatedLabel,
} from "@/components/notes/project-ui"
import { FilterGroup, SearchFilterBar } from "@/components/notes/SearchFilterBar"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useNoteSearch } from "@/hooks/useNotes"
import {
  filterProjectsByStatus,
  PROJECT_STATUSES,
  selectRecentlyOpenedProjects,
  type Project,
  type ProjectStatus,
} from "@/lib/note-projects"
import {
  buildNoteSearchResults,
  DEFAULT_NOTES_HOME_FILTERS,
  describeActiveFilters,
  filterHomeNotes,
  groupNotesIntoProjects,
  NO_PROJECT_ID,
  type NoteProject,
  type NotesHomeFilters,
} from "@/lib/notes-home"
import { NOTE_TYPES, sortNotesMeta, type NoteMeta, type NoteType } from "@/lib/notes"
import { cn } from "@/lib/utils"

type View = "notes" | "projects"

const sectionTitle =
  "flex items-baseline gap-2 text-base font-semibold tracking-tight text-foreground"
const countBadge = "text-sm font-normal text-muted-foreground tabular-nums"

const TYPE_FILTERS: { value: NoteType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  ...NOTE_TYPES,
]
const STATUS_FILTERS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...PROJECT_STATUSES,
]

/** Notes / Projects switch — a two-option segmented control. */
function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const options: { value: View; label: string }[] = [
    { value: "notes", label: "Notes" },
    { value: "projects", label: "Projects" },
  ]
  return (
    <div
      role="group"
      aria-label="Show"
      // Phones: a full-width segmented control, like iOS's own.
      className="flex min-w-0 flex-1 rounded-lg border border-border bg-muted/40 p-0.5 sm:inline-flex sm:flex-none"
    >
      {options.map((option) => {
        const selected = view === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-10 flex-1 rounded-md px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none [@media(pointer:coarse)]:min-h-11",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** The "No project" bucket — switches to the Notes list filtered to it. */
function NoProjectRow({ group, onOpen }: { group: NoteProject; onOpen: () => void }) {
  const updated = updatedLabel(group.updatedAt)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn("flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left", ROW_LINK)}
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
      >
        <Inbox size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-foreground">No project</span>
        <span className="block truncate text-xs text-muted-foreground">
          {countText(group.noteCount, "note", "notes")}
          {updated && ` · Updated ${updated}`}
        </span>
      </span>
      <span className="shrink-0 text-xs font-medium text-primary">Show notes</span>
    </button>
  )
}

/**
 * Notes Home (/notes). A Notes / Projects switch (Notes by default), one
 * search field with a filter button, and the list directly underneath.
 * Search covers note titles, descriptions and content (server full-text) plus
 * project names, descriptions and tags; results are grouped as Notes and
 * Projects. "New note" and "Save to inbox" live in the page header.
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
  const [view, setView] = useState<View>("notes")
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<NotesHomeFilters>(DEFAULT_NOTES_HOME_FILTERS)

  const hasQuery = query.trim().length > 0
  const { results: searchMatches, searching, error: searchError } = useNoteSearch(query)

  const groups = useMemo(() => groupNotesIntoProjects(notes, projects), [notes, projects])
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const projectNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])
  const knownIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects])
  const noProjectGroup = groupById.get(NO_PROJECT_ID)
  // A scope whose project was deleted falls back to all notes.
  const scope = groupById.has(filters.scope) ? filters.scope : "all"
  const effective = { ...filters, scope }
  const currentView: View = projectsUnavailable ? "notes" : view

  const patch = (next: Partial<NotesHomeFilters>) => setFilters((prev) => ({ ...prev, ...next }))
  const clearFilters = () => setFilters(DEFAULT_NOTES_HOME_FILTERS)

  const results = useMemo(
    () =>
      buildNoteSearchResults({
        query,
        scope,
        projects: groups,
        noteMatches: sortNotesMeta(searchMatches),
        noteType: filters.noteType,
        pinnedOnly: filters.pinnedOnly,
        projectStatus: filters.projectStatus,
      }),
    [
      query,
      scope,
      groups,
      searchMatches,
      filters.noteType,
      filters.pinnedOnly,
      filters.projectStatus,
    ],
  )

  const listedNotes = useMemo(
    () =>
      sortNotesMeta(
        filterHomeNotes(
          notes,
          { scope, noteType: filters.noteType, pinnedOnly: filters.pinnedOnly },
          knownIds,
        ),
      ),
    [notes, scope, filters.noteType, filters.pinnedOnly, knownIds],
  )
  const recentlyOpened = useMemo(() => selectRecentlyOpenedProjects(projects, 3), [projects])
  const listedProjects = useMemo(
    () => filterProjectsByStatus(projects, filters.projectStatus),
    [projects, filters.projectStatus],
  )

  // While searching, results include both kinds, so every filter applies.
  const kinds = {
    notes: hasQuery || currentView === "notes",
    projects: !projectsUnavailable && (hasQuery || currentView === "projects"),
  }
  const activeFilters = describeActiveFilters(effective, groups, kinds)
  const notesFiltered = scope !== "all" || filters.noteType !== "all" || filters.pinnedOnly

  const showNoProjectNotes = () => {
    setFilters({ ...DEFAULT_NOTES_HOME_FILTERS, scope: NO_PROJECT_ID })
    setQuery("")
    setView("notes")
  }

  const noteFilterControls = (
    <>
      {groups.length > 0 && (
        <FilterGroup label="Project">
          <Select value={scope} onValueChange={(value) => patch({ scope: value })}>
            <SelectTrigger className="h-11! w-full" aria-label="Project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All notes</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.isInbox ? "No project" : group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterGroup>
      )}
      <FilterGroup label="Note type">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((type) => (
            <FilterChip
              key={type.value}
              pressed={filters.noteType === type.value}
              onClick={() => patch({ noteType: type.value })}
            >
              {type.label}
            </FilterChip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup label="Pinned">
        <FilterChip
          pressed={filters.pinnedOnly}
          onClick={() => patch({ pinnedOnly: !filters.pinnedOnly })}
        >
          <Pin size={12} aria-hidden="true" />
          Pinned only
        </FilterChip>
      </FilterGroup>
    </>
  )

  const projectFilterControls = !projectsUnavailable && (
    <FilterGroup label="Project status">
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((status) => (
          <FilterChip
            key={status.value}
            pressed={filters.projectStatus === status.value}
            onClick={() => patch({ projectStatus: status.value })}
          >
            {status.label}
          </FilterChip>
        ))}
      </div>
    </FilterGroup>
  )

  const filterControls = hasQuery ? (
    currentView === "projects" ? (
      <>
        {projectFilterControls}
        {noteFilterControls}
      </>
    ) : (
      <>
        {noteFilterControls}
        {projectFilterControls}
      </>
    )
  ) : currentView === "projects" ? (
    projectFilterControls
  ) : (
    noteFilterControls
  )

  const noteHitsBlock = results.noteHits.length > 0 && (
    <section aria-labelledby="notes-hits" className="space-y-2">
      <h2 id="notes-hits" className={sectionTitle}>
        Notes <span className={countBadge}>{results.noteHits.length}</span>
      </h2>
      <RowList>
        {results.noteHits.map((note) => (
          <li key={note.slug}>
            <NoteListRow
              note={note}
              showExcerpt
              projectName={note.projectId ? projectNames.get(note.projectId) : undefined}
            />
          </li>
        ))}
      </RowList>
    </section>
  )

  const projectHitsBlock = results.projectHits.length > 0 && (
    <section aria-labelledby="projects-hits" className="space-y-2">
      <h2 id="projects-hits" className={sectionTitle}>
        Projects <span className={countBadge}>{results.projectHits.length}</span>
      </h2>
      <RowList>
        {results.projectHits.map((group) => (
          <li key={group.id}>
            <ProjectListRow
              project={group.project as Project}
              noteCount={group.noteCount}
              updatedAt={group.updatedAt}
            />
          </li>
        ))}
      </RowList>
    </section>
  )

  return (
    <div className="space-y-4">
      {!projectsUnavailable && (
        <div className="flex items-center justify-between gap-2">
          <ViewSwitch view={currentView} onChange={setView} />
          {currentView === "projects" && (
            // Icon-only on phones so the switch keeps its width at 320px.
            <Button
              variant="outline"
              aria-label="New project"
              className="size-11 shrink-0 gap-1.5 px-0 sm:w-auto sm:px-4"
              onClick={onNewProject}
            >
              <FolderPlus size={16} aria-hidden="true" />
              <span className="hidden sm:inline">New project</span>
            </Button>
          )}
        </div>
      )}

      <SearchFilterBar
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search notes and projects"
        placeholder={currentView === "projects" ? "Search projects and notes" : "Search notes"}
        activeFilters={activeFilters}
        onClearFilters={clearFilters}
        filterDescription="Searches note titles, descriptions and content, plus project names and tags."
      >
        {filterControls}
      </SearchFilterBar>

      {hasQuery ? (
        <div aria-label="Search results" role="region" className="space-y-5">
          <p role="status" className="text-sm text-muted-foreground">
            {searching ? "Searching…" : results.summary}
          </p>
          {searchError && (
            <p role="alert" className="text-sm text-destructive">
              {searchError} Try again in a moment.
            </p>
          )}
          {!searching && !searchError && results.total === 0 && (
            <EmptyState
              surface
              icon={SearchX}
              title="Nothing found"
              description={
                activeFilters.length > 0
                  ? "Try different words, or clear the filters."
                  : "Try different words."
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {activeFilters.length > 0 && (
                    <Button className="h-11" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )}
                  <Button variant="outline" className="h-11" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                </div>
              }
            />
          )}
          {currentView === "projects" ? (
            <>
              {projectHitsBlock}
              {noteHitsBlock}
            </>
          ) : (
            <>
              {noteHitsBlock}
              {projectHitsBlock}
            </>
          )}
        </div>
      ) : currentView === "notes" ? (
        <section aria-labelledby="notes-all" className="space-y-2">
          <h2 id="notes-all" className={sectionTitle}>
            Notes
            <span className={countBadge}>
              {notesFiltered ? `${listedNotes.length} of ${notes.length}` : notes.length}
            </span>
          </h2>
          {projectsUnavailable && (
            <p className="text-xs text-muted-foreground">
              Projects aren&apos;t set up yet: the database update for them hasn&apos;t been
              applied. Your notes work as usual.
            </p>
          )}
          {listedNotes.length > 0 ? (
            <RowList>
              {listedNotes.map((note) => (
                <li key={note.slug}>
                  <NoteListRow
                    note={note}
                    projectName={note.projectId ? projectNames.get(note.projectId) : undefined}
                  />
                </li>
              ))}
            </RowList>
          ) : notes.length === 0 ? (
            <EmptyState
              surface
              icon={NotebookPen}
              title="No notes yet"
              description="Write your first note, or save a quick thought to your inbox and organize it later."
              action={
                <Button asChild className="h-11">
                  <Link href="/notes/new">New note</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              surface
              icon={SearchX}
              title="No matches"
              description="No notes match these filters."
              action={
                <Button variant="outline" className="h-11" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          )}
        </section>
      ) : (
        <div className="space-y-6">
          {projectsLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading projects">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : projectsError ? (
            <p
              role="alert"
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-destructive"
            >
              {projectsError} Your notes are still under Notes.
            </p>
          ) : (
            <>
              {recentlyOpened.length > 0 && filters.projectStatus === "all" && (
                <section aria-labelledby="notes-recent-projects" className="space-y-2">
                  <h2 id="notes-recent-projects" className={sectionTitle}>
                    Recently opened
                  </h2>
                  <RowList>
                    {recentlyOpened.map((project) => {
                      const group = groupById.get(project.id)
                      return (
                        <li key={project.id}>
                          <ProjectListRow
                            project={project}
                            noteCount={group?.noteCount ?? 0}
                            updatedAt={group?.updatedAt}
                          />
                        </li>
                      )
                    })}
                  </RowList>
                </section>
              )}

              <section aria-labelledby="notes-projects" className="space-y-2">
                <h2 id="notes-projects" className={sectionTitle}>
                  All projects
                  <span className={countBadge}>
                    {filters.projectStatus === "all"
                      ? projects.length
                      : `${listedProjects.length} of ${projects.length}`}
                  </span>
                </h2>
                {projects.length === 0 ? (
                  <div className="space-y-2">
                    <EmptyState
                      surface
                      icon={FolderPlus}
                      title="No projects yet"
                      description="Group related notes, decisions and references in one place."
                      action={
                        <Button className="h-11 gap-1.5" onClick={onNewProject}>
                          <FolderPlus size={16} aria-hidden="true" />
                          New project
                        </Button>
                      }
                    />
                    {noProjectGroup && (
                      <RowList>
                        <li>
                          <NoProjectRow group={noProjectGroup} onOpen={showNoProjectNotes} />
                        </li>
                      </RowList>
                    )}
                  </div>
                ) : listedProjects.length === 0 ? (
                  <EmptyState
                    surface
                    icon={SearchX}
                    title="No matches"
                    description="No projects with this status."
                    action={
                      <Button variant="outline" className="h-11" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <RowList>
                    {listedProjects.map((project) => {
                      const group = groupById.get(project.id)
                      return (
                        <li key={project.id}>
                          <ProjectListRow
                            project={project}
                            noteCount={group?.noteCount ?? 0}
                            updatedAt={group?.updatedAt}
                          />
                        </li>
                      )
                    })}
                    {noProjectGroup && filters.projectStatus === "all" && (
                      <li>
                        <NoProjectRow group={noProjectGroup} onOpen={showNoProjectNotes} />
                      </li>
                    )}
                  </RowList>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </div>
  )
}
