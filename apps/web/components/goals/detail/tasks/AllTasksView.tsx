"use client"

import { useMemo, useState } from "react"
import { Filter, Plus, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { useIsMobile } from "@/hooks/useMobile"
import type { GoalTaskActions } from "@/hooks/useGoalTaskActions"
import type { Task } from "@/lib/tasks"
import type { GoalKeyResult } from "@/lib/goal-key-results"
import type { GoalPlanPhase } from "@/lib/goal-plan-phases"
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/task-status"
import {
  NONE_FILTER_VALUE,
  TASK_CHIPS,
  TASK_SORTS,
  buildTaskView,
  chipCounts,
  hasActiveFilters,
  type TaskFilters,
  type TaskSort,
  type TaskViewContext,
} from "@/lib/task-views"
import { cn } from "@/lib/utils"

import { GoalTaskRow, taskTableColumns } from "./GoalTaskRow"

interface AllTasksViewProps {
  tasks: Task[]
  context: TaskViewContext
  phases: GoalPlanPhase[]
  keyResults: GoalKeyResult[]
  actions: GoalTaskActions
  filters: TaskFilters
  onFiltersChange: (next: TaskFilters) => void
  sort: TaskSort
  onSortChange: (next: TaskSort) => void
  selectedTaskId: string | null
  onOpenTask: (task: Task) => void
  onAddTask: () => void
}

const toggleIn = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

/**
 * Every task on the goal, with chips, search, filters and sorting.
 *
 * No `@tanstack/react-table` here: the first version is a memoised pure
 * filter/sort pipeline (lib/task-views.ts) feeding custom mobile cards and a
 * custom dense desktop list. The migration path — and what would trigger it —
 * is documented in docs/goal-planning-scheduling-audit.md §12.
 */
export function AllTasksView({
  tasks,
  context,
  phases,
  keyResults,
  actions,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  selectedTaskId,
  onOpenTask,
  onAddTask,
}: AllTasksViewProps) {
  const isMobile = useIsMobile()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const counts = useMemo(() => chipCounts(tasks, context.todayYmd), [tasks, context.todayYmd])
  const visible = useMemo(
    () => buildTaskView(tasks, filters, sort, context),
    [tasks, filters, sort, context],
  )

  const phaseById = useMemo(() => new Map(phases.map((p) => [p.id, p])), [phases])
  const krById = useMemo(() => new Map(keyResults.map((kr) => [kr.id, kr])), [keyResults])

  const patch = (next: Partial<TaskFilters>) => onFiltersChange({ ...filters, ...next })

  const rowProps = (task: Task) => ({
    task,
    todayYmd: context.todayYmd,
    phase: task.phase_id ? (phaseById.get(task.phase_id) ?? null) : null,
    keyResult: task.key_result_id ? (krById.get(task.key_result_id) ?? null) : null,
    isSelected: selectedTaskId === task.id,
    onToggleCompleted: actions.toggleCompleted,
    onOpen: onOpenTask,
    onSetStatus: (t: Task, status: Task["status"]) => status && void actions.setStatus(t, status),
    onSchedule: onOpenTask,
    onMoveToBacklog: (t: Task) => void actions.moveToBacklog(t),
    onDelete: (t: Task) => void actions.remove(t),
  })

  return (
    <div className="space-y-3">
      {/* Chips — horizontally scrollable strip, never a nested scroll area. */}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TASK_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            aria-pressed={filters.chip === chip.value}
            onClick={() => patch({ chip: chip.value })}
            className={cn(
              "flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors sm:h-9",
              filters.chip === chip.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {chip.label}
            <span className="tabular-nums opacity-70">{counts[chip.value]}</span>
          </button>
        ))}
      </div>

      {/* Search + sort + filter toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="Search tasks, phases, key results, tags…"
            aria-label="Search tasks"
            className="h-11 rounded-xl pl-9"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => patch({ search: "" })}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as TaskSort)}
          aria-label="Sort tasks"
          className="h-11 shrink-0 rounded-xl border border-border bg-background px-2.5 text-base font-medium outline-none focus:border-primary/40"
        >
          {TASK_SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          className={cn(
            "h-11 shrink-0 gap-1.5 rounded-xl px-3 text-xs font-semibold",
            hasActiveFilters(filters) && "border-primary/40 text-primary",
          )}
        >
          <Filter className="h-4 w-4" /> Filters
        </Button>
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <Card className="space-y-4 rounded-xl border-border p-4">
            <FilterGroup label="Status">
              {TASK_STATUSES.map((s) => (
                <Chip
                  key={s}
                  active={filters.statuses.includes(s)}
                  onClick={() => patch({ statuses: toggleIn(filters.statuses, s) })}
                >
                  {TASK_STATUS_LABELS[s]}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Phase">
              {phases.map((p) => (
                <Chip
                  key={p.id}
                  active={filters.phaseIds.includes(p.id)}
                  onClick={() => patch({ phaseIds: toggleIn(filters.phaseIds, p.id) })}
                >
                  {p.title}
                </Chip>
              ))}
              <Chip
                active={filters.phaseIds.includes(NONE_FILTER_VALUE)}
                onClick={() => patch({ phaseIds: toggleIn(filters.phaseIds, NONE_FILTER_VALUE) })}
              >
                No phase
              </Chip>
            </FilterGroup>

            <FilterGroup label="Key result">
              {keyResults
                .filter((kr) => kr.status !== "archived")
                .map((kr) => (
                  <Chip
                    key={kr.id}
                    active={filters.keyResultIds.includes(kr.id)}
                    onClick={() => patch({ keyResultIds: toggleIn(filters.keyResultIds, kr.id) })}
                  >
                    {kr.title}
                  </Chip>
                ))}
              <Chip
                active={filters.keyResultIds.includes(NONE_FILTER_VALUE)}
                onClick={() =>
                  patch({ keyResultIds: toggleIn(filters.keyResultIds, NONE_FILTER_VALUE) })
                }
              >
                No key result
              </Chip>
            </FilterGroup>

            <FilterGroup label="Impact">
              {(["high", "medium", "low"] as const).map((impact) => (
                <Chip
                  key={impact}
                  active={filters.impacts.includes(impact)}
                  onClick={() => patch({ impacts: toggleIn(filters.impacts, impact) })}
                >
                  <span className="capitalize">{impact}</span>
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Schedule">
              {(["any", "scheduled", "unscheduled"] as const).map((value) => (
                <Chip
                  key={value}
                  active={filters.scheduled === value}
                  onClick={() => patch({ scheduled: value })}
                >
                  <span className="capitalize">{value}</span>
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Source">
              {(["manual", "ai", "template"] as const).map((source) => (
                <Chip
                  key={source}
                  active={filters.sources.includes(source)}
                  onClick={() => patch({ sources: toggleIn(filters.sources, source) })}
                >
                  <span className="capitalize">{source}</span>
                </Chip>
              ))}
              <Chip
                active={filters.evidenceRequired}
                onClick={() => patch({ evidenceRequired: !filters.evidenceRequired })}
              >
                Evidence required
              </Chip>
            </FilterGroup>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="filter-from" className="text-xs">
                  From
                </Label>
                <Input
                  id="filter-from"
                  type="date"
                  value={filters.dateFrom ?? ""}
                  onChange={(e) => patch({ dateFrom: e.target.value || null })}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filter-to" className="text-xs">
                  To
                </Label>
                <Input
                  id="filter-to"
                  type="date"
                  value={filters.dateTo ?? ""}
                  onChange={(e) => patch({ dateTo: e.target.value || null })}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {hasActiveFilters(filters) && (
              <Button
                variant="ghost"
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    statuses: [],
                    phaseIds: [],
                    keyResultIds: [],
                    impacts: [],
                    scheduled: "any",
                    dateFrom: null,
                    dateTo: null,
                    evidenceRequired: false,
                    sources: [],
                  })
                }
                className="h-11 rounded-xl text-xs font-semibold text-muted-foreground"
              >
                Clear filters
              </Button>
            )}
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <p className="px-1 text-xs text-muted-foreground">
        {visible.length} of {tasks.length} task{tasks.length === 1 ? "" : "s"}
      </p>

      {visible.length === 0 ? (
        <p className="px-1 py-4 text-sm text-muted-foreground">No tasks match these filters.</p>
      ) : isMobile ? (
        <ul className="divide-y divide-border pb-20">
          {visible.map((task) => (
            <GoalTaskRow key={task.id} variant="card" {...rowProps(task)} />
          ))}
        </ul>
      ) : (
        <Card className="overflow-hidden rounded-xl border-border p-0">
          <div
            className={cn(
              taskTableColumns(),
              "border-b border-border bg-muted/30 px-1.5 py-2 text-xs font-medium text-muted-foreground",
            )}
          >
            <span className="w-8" aria-hidden />
            <span>Task</span>
            <span>Status</span>
            <span>Schedule</span>
            <span className="hidden xl:block">Phase</span>
            <span className="hidden xl:block">Key result</span>
            <span className="hidden xl:block">Impact</span>
            <span>Effort</span>
            <span className="w-8" aria-hidden />
          </div>
          <ul>
            {visible.map((task) => (
              <GoalTaskRow key={task.id} variant="row" {...rowProps(task)} />
            ))}
          </ul>
        </Card>
      )}

      {/* Sticky Add Task on mobile — the primary action must never be scrolled
          off the bottom of a long list. It sits above the shell's bottom nav
          (--shell-bottom-nav-h, which already includes the home-indicator
          inset); it used to be bottom-0 at z-30, i.e. under the z-40 nav.
          Bottom padding: with the nav showing, the nav already clears the
          home indicator, so the calc goes negative and 0.75rem wins; when the
          keyboard hides the nav the variable is 0px and the inset applies. */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-[var(--shell-bottom-nav-h,0px)] z-30 border-t border-border bg-background/95 pt-3 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] pb-[max(0.75rem,calc(env(safe-area-inset-bottom)-var(--shell-bottom-nav-h,0px)))] backdrop-blur">
          <Button
            onClick={onAddTask}
            className="h-12 w-full gap-2 rounded-lg text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> Add task
          </Button>
        </div>
      )}
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-11 rounded-xl border px-2.5 text-xs font-medium transition-colors sm:h-8",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  )
}
