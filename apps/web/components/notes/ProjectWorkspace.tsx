"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ExternalLink,
  NotebookPen,
  Pencil,
  Plus,
  SearchX,
  Settings2,
} from "lucide-react"
import { toast } from "sonner"

import {
  FilterChip,
  formatDay,
  NoteListRow,
  ProjectStatusPill,
  ProjectTile,
  ROW_LINK,
  RowList,
  updatedLabel,
} from "@/components/notes/project-ui"
import { ProjectAiAccess } from "@/components/notes/ProjectAiAccess"
import { ProjectFormDialog } from "@/components/notes/ProjectFormDialog"
import { FilterGroup, SearchFilterBar } from "@/components/notes/SearchFilterBar"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNoteProjectMutations, useProjectAiAccess } from "@/hooks/useNoteProjects"
import {
  notesInProject,
  PROJECT_AI_LEVELS,
  projectStatusLabel,
  projectTypeLabel,
  selectDecisionNotes,
  type Project,
  type ProjectInput,
} from "@/lib/note-projects"
import { selectRecentNotes } from "@/lib/notes-home"
import { groupNotesBySection, selectKeyNotes, type NoteSection } from "@/lib/project-sections"
import {
  filterNotesMeta,
  NOTE_TYPES,
  sortNotesMeta,
  type NoteMeta,
  type NoteType,
} from "@/lib/notes"
import { cn } from "@/lib/utils"

const sectionTitle =
  "flex items-baseline gap-2 text-base font-semibold tracking-tight text-foreground"
const textLink =
  "inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"

function newNoteHref(projectId: string, type?: NoteType) {
  const params = new URLSearchParams({ project: projectId })
  if (type) params.set("type", type)
  return `/notes/new?${params.toString()}`
}

/**
 * One collapsible section of a project's notes (notes grouped by category).
 * Sections start open; collapsing is per visit, not saved.
 */
function SectionGroup({ section }: { section: NoteSection }) {
  const headingId = useId()
  return (
    <Collapsible defaultOpen asChild>
      <li>
        <section aria-labelledby={headingId}>
          <h3 id={headingId} className="m-0">
            <CollapsibleTrigger
              className={cn(
                "group flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left text-sm font-semibold text-foreground",
                ROW_LINK,
              )}
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate">{section.label}</span>
                <span className="font-normal tabular-nums text-muted-foreground">
                  {section.notes.length}
                </span>
              </span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              />
            </CollapsibleTrigger>
          </h3>
          <CollapsibleContent>
            <ul className="divide-y divide-border border-t border-border bg-background/40">
              {section.notes.map((note) => (
                <li key={note.slug}>
                  <NoteListRow note={note} />
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </section>
      </li>
    </Collapsible>
  )
}

function SectionList({ sections }: { sections: NoteSection[] }) {
  return (
    <RowList>
      {sections.map((section) => (
        <SectionGroup key={section.key} section={section} />
      ))}
    </RowList>
  )
}

/** A proposed feature: nothing saves, and the label says so. */
function ProposedItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="space-y-1.5 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Proposed
        </span>
      </div>
      <div className="max-w-prose space-y-1.5 text-sm text-muted-foreground">{children}</div>
    </li>
  )
}

const NOTE_FILTERS: { value: NoteType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  ...NOTE_TYPES,
]

/**
 * Project Workspace (/notes/projects/[id]). Overview, Notes and Decisions read
 * the project's notes. Edit project and AI access sit under Project settings;
 * Mentor Feedback and Linked Tasks are at the end of Overview, labelled
 * Proposed until their data exists (Planner stays the source of truth for
 * tasks).
 */
export function ProjectWorkspace({ project, notes }: { project: Project; notes: NoteMeta[] }) {
  const { update, markOpened } = useNoteProjectMutations()
  const { access } = useProjectAiAccess(project.id)
  const [editOpen, setEditOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
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
  const keyNotes = useMemo(() => selectKeyNotes(projectNotes), [projectNotes])
  // Recently updated, leaving out what "Start here" already shows.
  const recentNotes = useMemo(() => {
    const shown = new Set(keyNotes.map((n) => n.slug))
    return selectRecentNotes(
      projectNotes.filter((n) => !shown.has(n.slug)),
      5,
    )
  }, [projectNotes, keyNotes])
  const sections = useMemo(() => groupNotesBySection(projectNotes), [projectNotes])
  // A lone "Unsorted" section means no note has a category yet — grouping adds nothing.
  const hasSections = sections.some((section) => section.key !== "")
  const decisions = useMemo(() => selectDecisionNotes(notes, project.id), [notes, project.id])
  const filteredNotes = useMemo(
    () => sortNotesMeta(filterNotesMeta(projectNotes, { noteType: typeFilter, query })),
    [projectNotes, typeFilter, query],
  )
  const notesFiltered = query.trim().length > 0 || typeFilter !== "all"
  const typeLabel = NOTE_TYPES.find((t) => t.value === typeFilter)?.label
  const aiLevelLabel = access
    ? PROJECT_AI_LEVELS.find((level) => level.value === access.level)?.label
    : undefined

  const saveProject = async (input: ProjectInput) => {
    await update.mutateAsync({ id: project.id, input })
    setEditOpen(false)
    toast.success("Project updated")
  }

  const meta = [
    projectTypeLabel(project.projectType),
    project.startDate ? `Started ${formatDay(project.startDate)}` : "",
    project.targetDate ? `Target ${formatDay(project.targetDate)}` : "",
    project.updatedAt ? `Updated ${updatedLabel(project.updatedAt)}` : "",
  ].filter(Boolean)

  return (
    <div className="space-y-5">
      {/* Phones and tablets have Back in the mobile header. */}
      <nav aria-label="Breadcrumb" className="hidden text-sm text-muted-foreground lg:block">
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
          <li aria-current="page" className="min-w-0 truncate font-medium text-foreground">
            {project.name}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <ProjectTile name={project.name} size="lg" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="min-w-0 text-xl font-bold tracking-tight [overflow-wrap:anywhere] text-foreground sm:text-2xl">
                {project.name}
              </h2>
              <ProjectStatusPill status={project.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {meta.join(" · ")}
              {aiLevelLabel && (
                <>
                  {" · "}
                  <span>AI access: {aiLevelLabel}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="size-11 gap-1.5 px-0 sm:w-auto sm:px-3"
                  aria-label="Project settings"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings2 aria-hidden="true" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Project settings</TooltipContent>
            </Tooltip>
            <Button asChild className="hidden h-11 gap-1.5 sm:inline-flex">
              <Link href={newNoteHref(project.id)}>
                <Plus size={16} aria-hidden="true" />
                New note
              </Link>
            </Button>
          </div>
        </div>
        {project.description && (
          <p className="max-w-prose text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {project.description}
          </p>
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
        {/* Phones: New note gets the full width, so it's always in reach. */}
        <Button asChild className="h-11 w-full gap-1.5 sm:hidden">
          <Link href={newNoteHref(project.id)}>
            <Plus size={16} aria-hidden="true" />
            New note
          </Link>
        </Button>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        {/* Scrolls sideways rather than overflowing if the counts grow on a 320px screen. */}
        <div className="no-scrollbar -mx-1 overflow-x-auto border-b border-border px-1">
          <TabsList
            variant="line"
            aria-label="Project sections"
            className="h-11! min-w-max gap-0.5 sm:gap-1"
          >
            <TabsTrigger value="overview" className="h-11 px-2.5 sm:px-3">
              Overview
            </TabsTrigger>
            <TabsTrigger value="notes" className="h-11 px-2.5 sm:px-3">
              Notes{" "}
              <span className="tabular-nums text-muted-foreground">{projectNotes.length}</span>
            </TabsTrigger>
            <TabsTrigger value="decisions" className="h-11 px-2.5 sm:px-3">
              Decisions{" "}
              <span className="tabular-nums text-muted-foreground">{decisions.length}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <section aria-labelledby="ws-start" className="space-y-2">
            <h3 id="ws-start" className={sectionTitle}>
              Start here
            </h3>
            {keyNotes.length > 0 ? (
              <RowList>
                {keyNotes.map((note) => (
                  <li key={note.slug}>
                    <NoteListRow note={note} />
                  </li>
                ))}
              </RowList>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pin the notes you open most, such as the architecture overview or a guideline, and
                they stay here.
              </p>
            )}
            {!project.description && (
              <p className="text-sm text-muted-foreground">
                No purpose written yet.{" "}
                <button type="button" onClick={() => setEditOpen(true)} className={textLink}>
                  Add one
                </button>
              </p>
            )}
          </section>

          {projectNotes.length === 0 ? (
            <EmptyState
              surface
              icon={NotebookPen}
              title="No notes in this project yet"
              description="New notes you start here are filed in it. You can move an existing note in from its editor."
              action={
                <Button asChild className="h-11 gap-1.5">
                  <Link href={newNoteHref(project.id)}>
                    <Plus size={16} aria-hidden="true" />
                    New note
                  </Link>
                </Button>
              }
            />
          ) : hasSections ? (
            <section aria-labelledby="ws-sections" className="space-y-2">
              <h3 id="ws-sections" className={sectionTitle}>
                Notes by section
              </h3>
              <SectionList sections={sections} />
            </section>
          ) : (
            recentNotes.length > 0 && (
              <section aria-labelledby="ws-recent" className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 id="ws-recent" className={sectionTitle}>
                    Recently updated
                  </h3>
                  {projectNotes.length > recentNotes.length + keyNotes.length && (
                    <button type="button" onClick={() => setTab("notes")} className={textLink}>
                      All {projectNotes.length} notes
                    </button>
                  )}
                </div>
                <RowList>
                  {recentNotes.map((note) => (
                    <li key={note.slug}>
                      <NoteListRow note={note} />
                    </li>
                  ))}
                </RowList>
                <p className="text-xs text-muted-foreground">
                  Tip: give notes a category such as Architecture, Guides or Reference and
                  they&apos;re grouped into sections here.
                </p>
              </section>
            )
          )}

          {decisions.length > 0 && (
            <section aria-labelledby="ws-latest-decision" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 id="ws-latest-decision" className={sectionTitle}>
                  Latest decision
                </h3>
                {decisions.length > 1 && (
                  <button type="button" onClick={() => setTab("decisions")} className={textLink}>
                    All {decisions.length} decisions
                  </button>
                )}
              </div>
              <RowList>
                <li>
                  <NoteListRow note={decisions[0]} showExcerpt showType={false} />
                </li>
              </RowList>
            </section>
          )}

          <Collapsible asChild>
            <section aria-labelledby="ws-proposed">
              <h3 id="ws-proposed" className="m-0">
                <CollapsibleTrigger className="group flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                  Proposed: Mentor Feedback and Linked Tasks
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="transition-transform group-data-[state=open]:rotate-180"
                  />
                </CollapsibleTrigger>
              </h3>
              <CollapsibleContent>
                <ul className="mt-2 divide-y divide-border rounded-xl border border-dashed border-border">
                  <ProposedItem title="Mentor Feedback">
                    <p>
                      Capturing advice with a takeaway, a next action and a Captured → Reviewed →
                      Applied status needs a new note type and fields. That data model hasn&apos;t
                      been approved yet, so nothing here saves anything. For now, write advice as a
                      regular note in this project.
                    </p>
                  </ProposedItem>
                  <ProposedItem title="Linked Tasks">
                    <p>
                      Planner stays the source of truth for tasks. Showing a project&apos;s tasks
                      here needs a link between notes and Planner tasks, which is still a proposed
                      change.
                    </p>
                    <Link href="/goals/tasks" className={textLink}>
                      Open Planner tasks
                    </Link>
                  </ProposedItem>
                </ul>
              </CollapsibleContent>
            </section>
          </Collapsible>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="space-y-3">
          <SearchFilterBar
            query={query}
            onQueryChange={setQuery}
            searchLabel={`Search notes in ${project.name}`}
            placeholder="Search this project's notes"
            activeFilters={typeFilter !== "all" && typeLabel ? [typeLabel] : []}
            onClearFilters={() => setTypeFilter("all")}
          >
            <FilterGroup label="Note type">
              <div className="flex flex-wrap gap-1.5">
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
            </FilterGroup>
          </SearchFilterBar>
          <p role="status" className="text-sm text-muted-foreground">
            {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
            {notesFiltered ? ` of ${projectNotes.length}` : ""}
            {hasSections && !notesFiltered ? " · grouped by section" : " · pinned first"}
          </p>
          {filteredNotes.length > 0 ? (
            hasSections && !notesFiltered ? (
              <SectionList sections={sections} />
            ) : (
              <RowList>
                {filteredNotes.map((note) => (
                  <li key={note.slug}>
                    <NoteListRow note={note} showExcerpt={notesFiltered} />
                  </li>
                ))}
              </RowList>
            )
          ) : projectNotes.length === 0 ? (
            <EmptyState
              surface
              icon={NotebookPen}
              title="No notes yet"
              description="Notes you add to this project show up here."
              action={
                <Button asChild className="h-11 gap-1.5">
                  <Link href={newNoteHref(project.id)}>
                    <Plus size={16} aria-hidden="true" />
                    New note
                  </Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              surface
              icon={SearchX}
              title="No matches"
              description="No notes match this search or filter."
              action={
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    setQuery("")
                    setTypeFilter("all")
                  }}
                >
                  Clear search and filters
                </Button>
              }
            />
          )}
        </TabsContent>

        {/* Decisions */}
        <TabsContent value="decisions" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Decision notes in this project, newest first.
            </p>
            {decisions.length > 0 && (
              <Button asChild variant="outline" className="h-11 gap-1.5">
                <Link href={newNoteHref(project.id, "decision")}>
                  <Plus size={16} aria-hidden="true" />
                  New decision
                </Link>
              </Button>
            )}
          </div>
          {decisions.length > 0 ? (
            <RowList>
              {decisions.map((note) => (
                <li key={note.slug}>
                  <NoteListRow note={note} showExcerpt showType={false} />
                </li>
              ))}
            </RowList>
          ) : (
            <EmptyState
              surface
              icon={NotebookPen}
              title="No decisions recorded yet"
              description="Write one down with its context, options and reason so you remember why later."
              action={
                <Button asChild variant="outline" className="h-11 gap-1.5">
                  <Link href={newNoteHref(project.id, "decision")}>
                    <Plus size={16} aria-hidden="true" />
                    New decision
                  </Link>
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Project settings: Edit project + AI access. */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="gap-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Project settings</DialogTitle>
            <DialogDescription className="[overflow-wrap:anywhere]">
              {project.name}
            </DialogDescription>
          </DialogHeader>
          <section aria-labelledby="ws-settings-details" className="space-y-2">
            <h3 id="ws-settings-details" className="text-sm font-semibold text-foreground">
              Details
            </h3>
            <p className="text-sm text-muted-foreground">
              {projectTypeLabel(project.projectType)} · {projectStatusLabel(project.status)}
              {project.targetDate && ` · Target ${formatDay(project.targetDate)}`}
            </p>
            <Button
              variant="outline"
              className="h-11 w-full gap-1.5"
              onClick={() => {
                setSettingsOpen(false)
                setEditOpen(true)
              }}
            >
              <Pencil size={15} aria-hidden="true" />
              Edit project
            </Button>
          </section>
          <div className="border-t border-border pt-4">
            {access ? (
              <ProjectAiAccess projectId={project.id} />
            ) : (
              <p className="text-sm text-muted-foreground">
                AI access isn&apos;t available for this project right now.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSubmit={saveProject}
      />
    </div>
  )
}
