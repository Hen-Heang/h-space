"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence, type Variants } from "motion/react"
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Star,
  Target,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import EmojiIconPicker from "@/components/ui/emoji-icon-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { goalsApi } from "@/lib/api"
import { goalsQueryKey } from "@/hooks/useGoals"
import {
  calculateGoalDeadlineInfo,
  formatDeadlineFooter,
  getHealthStatusStyling,
  GOAL_HEALTH_LABELS,
  type Goal,
  type SortOption,
} from "@/lib/goals"
import { computeGoalProgress } from "@/lib/goal-progress"
import { computeListGoalHealth } from "@/lib/goal-health"
import { selectNextBestAction } from "@/lib/next-best-action"
import { todayInAppTimezone } from "@/lib/task-status"
import { getUserId } from "@/lib/auth-store"
import { cn } from "@/lib/utils"

export interface GoalListProps {
  goals: Goal[]
  isLoading: boolean
  isDeleting: string | null
  sortOption: SortOption
  onDeleteGoal: (goal: Goal, event: React.MouseEvent) => void
  onEditGoal?: (goal: Goal, event: React.MouseEvent) => void
  onToggleStar?: (goalId: string) => void
  onToggleComplete?: (goalId: string) => void
  emptyState?: {
    title: string
    description?: string
  }
  /**
   * Controls that share the view-toggle row (the page's sort menu), so the
   * list has one control row above it instead of two.
   */
  toolbar?: React.ReactNode
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: Math.min(i, 6) * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
  exit: { opacity: 0, scale: 0.92, y: 10, transition: { duration: 0.2 } },
}

// Progress is one colour (the accent). Low progress isn't an error, so it no
// longer turns amber→red; health status carries the "needs attention" signal.
function ProgressBar({ progress, className }: { progress: number; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="h-full rounded-full bg-primary"
      />
    </div>
  )
}

// A title link whose ::after covers its whole row/card, so the row is one
// real link (keyboard, middle-click, "open in new tab") while the icon picker
// and action buttons — raised above it with `relative z-10` — stay separate
// controls instead of buttons nested inside a role="link" element.
const STRETCHED_LINK =
  "outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i, 8) * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
  exit: { opacity: 0, x: -10, transition: { duration: 0.2 } },
}

// Short, muted category label for the metadata line — deliberately not the
// verbose form labels ("General Goal", "Travel Plan") from lib/goal-form.ts,
// which read fine in a dropdown but are noisy next to a health status.
const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  travel: "Travel",
  finance: "Finance",
  financial: "Financial",
  education: "Education",
}

const categoryLabel = (goal: Goal): string => {
  const raw = goal.metadata?.goal_type
  if (!raw) return "General"
  return CATEGORY_LABELS[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1)
}

type GoalActionHandlers = {
  goal: Goal
  onDeleteGoal: (goal: Goal, event: React.MouseEvent) => void
  onEditGoal?: (goal: Goal, event: React.MouseEvent) => void
  onToggleStar?: (goalId: string) => void
  onToggleComplete?: (goalId: string) => void
}

// Star + complete/edit/delete menu, shared by the grid card and the table row
// so the owner controls stay identical across views. `size` tunes the touch
// target (kept >= 44px everywhere, per accessibility guidance).
function GoalActions({
  goal,
  size,
  onDeleteGoal,
  onEditGoal,
  onToggleStar,
  onToggleComplete,
}: GoalActionHandlers & { size: string }) {
  const isCompleted = goal.status === "completed"
  const favoriteLabel = goal.isStarred ? "Remove from favorites" : "Add to favorites"
  return (
    <div className="relative z-10 flex shrink-0 items-center gap-1">
      {/* Phones keep one action button so the title gets the width; the
          favourite toggle moves into the menu below sm. */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onToggleStar?.(goal.id)}
        aria-label={favoriteLabel}
        aria-pressed={Boolean(goal.isStarred)}
        className={cn(
          size,
          "hidden rounded-lg sm:inline-flex",
          goal.isStarred
            ? "text-amber-500 hover:bg-amber-500/10"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Star className={cn("h-4 w-4", goal.isStarred && "fill-current")} />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Goal actions"
            className={cn(size, "rounded-lg hover:bg-foreground/5")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-lg p-2 shadow-md">
          <DropdownMenuItem
            className="rounded-lg font-medium sm:hidden"
            onSelect={() => onToggleStar?.(goal.id)}
          >
            <Star
              className={cn(
                "mr-3 h-4 w-4",
                goal.isStarred ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
              )}
            />
            {favoriteLabel}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-lg font-medium"
            onSelect={() => onToggleComplete?.(goal.id)}
          >
            {isCompleted ? (
              <RotateCcw className="mr-3 h-4 w-4 text-muted-foreground" />
            ) : (
              <CheckCircle2 className="mr-3 h-4 w-4 text-muted-foreground" />
            )}
            {isCompleted ? "Reopen goal" : "Mark complete"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-lg font-medium"
            onSelect={(e) => onEditGoal?.(goal, e as unknown as React.MouseEvent)}
          >
            <Pencil className="mr-3 h-4 w-4 text-muted-foreground" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-2" />
          <DropdownMenuItem
            variant="destructive"
            className="rounded-lg font-medium"
            onSelect={(e) => onDeleteGoal(goal, e as unknown as React.MouseEvent)}
          >
            <Trash2 className="mr-3 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// Emoji/initial avatar with the inline icon picker, shared by both views.
function GoalIcon({
  goal,
  icon,
  onChange,
  className,
}: {
  goal: Goal
  icon: string | null
  onChange: (emoji: string | null) => void
  className: string
}) {
  return (
    <div
      className={cn(
        "relative z-10 shrink-0 overflow-hidden bg-muted font-semibold text-foreground",
        className,
      )}
    >
      <EmojiIconPicker value={icon} onChange={onChange}>
        <button
          type="button"
          aria-label={`Change icon for ${goal.title}`}
          className="flex h-full w-full items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {icon || goal.title.charAt(0).toUpperCase()}
        </button>
      </EmojiIconPicker>
    </div>
  )
}

// Small dot + label — health is never communicated by color alone, and it's
// deliberately NOT a pill/badge here (see GoalsHubHeader/HealthBadge for the
// pill treatment used elsewhere): the redesigned card treats health as part
// of a muted metadata line, not chrome competing with the goal title.
function HealthDot({ status, reason }: { status: Goal["health_status"]; reason?: string | null }) {
  const styling = getHealthStatusStyling(status)
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5" title={reason ?? undefined}>
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", styling.dotColor)}
        aria-hidden="true"
      />
      <span className="truncate">{GOAL_HEALTH_LABELS[status]}</span>
    </span>
  )
}

// "NEXT ACTION" block shared by grid and list — a muted eyebrow, the task
// title (or a fallback when there's nothing open), and a chevron. Not its own
// button: clicking it bubbles to the card/row's own onClick (open the goal),
// same as the rest of the card body.
function NextActionBlock({
  nextAction,
  className,
}: {
  nextAction: ReturnType<typeof selectNextBestAction>
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground">Next action</p>
      {nextAction ? (
        <div className="mt-1 flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {nextAction.task.title || nextAction.task.description || "Untitled task"}
          </span>
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
            aria-hidden="true"
          />
        </div>
      ) : (
        <p className="mt-1 text-sm font-medium text-muted-foreground">No next action scheduled</p>
      )}
    </div>
  )
}

export function GoalList({
  goals,
  isLoading,
  onDeleteGoal,
  onEditGoal,
  onToggleStar,
  onToggleComplete,
  emptyState,
  toolbar,
}: GoalListProps) {
  const queryClient = useQueryClient()
  const currentUser = getUserId()
  const todayYmd = todayInAppTimezone()
  const [openingGoalId, setOpeningGoalId] = useState<string | null>(null)
  const [iconOverrides, setIconOverrides] = useState<Record<string, string | null>>({})
  const [viewMode, setViewMode] = useState<"grid" | "list">(() =>
    typeof localStorage !== "undefined" && localStorage.getItem("dg_goal_view") === "grid"
      ? "grid"
      : "list",
  )

  const setView = (next: "grid" | "list") => {
    setViewMode(next)
    localStorage.setItem("dg_goal_view", next)
  }

  const getGoalIcon = (goal: Goal): string | null => {
    if (Object.prototype.hasOwnProperty.call(iconOverrides, goal.id)) return iconOverrides[goal.id]
    return goal.metadata?.icon ?? null
  }

  const handleIconChange = async (goal: Goal, emoji: string | null) => {
    setIconOverrides((prev) => ({ ...prev, [goal.id]: emoji }))
    try {
      // Send the full goal payload (mirroring the edit panel) so the backend
      // persists the metadata change — a metadata-only PUT was being dropped.
      const updated = await goalsApi.update(goal.id, {
        title: goal.title,
        description: goal.description ?? "",
        target_date: goal.target_date ?? null,
        no_duration: goal.no_duration ?? Boolean(goal.metadata?.no_duration),
        metadata: { ...goal.metadata, icon: emoji ?? undefined },
      })
      // Propagate the saved icon into the cached list so it survives refetch
      // and navigation instead of living only in local override state.
      queryClient.setQueryData<Goal[]>(goalsQueryKey(currentUser), (prev) =>
        prev?.map((g) => (g.id === goal.id ? { ...g, ...updated } : g)),
      )
      toast.success(emoji ? "Icon updated" : "Icon removed")
    } catch {
      setIconOverrides((prev) => {
        const next = { ...prev }
        delete next[goal.id]
        return next
      })
      toast.error("Could not update icon")
    }
  }

  // One control row: the page's sort menu (`toolbar`) and the view toggle.
  const controls = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">{toolbar}</div>
      <div className="relative flex shrink-0 gap-1 rounded-lg bg-muted p-1">
        {(
          [
            { mode: "list", Icon: List, label: "List view" },
            { mode: "grid", Icon: LayoutGrid, label: "Grid view" },
          ] as const
        ).map(({ mode, Icon, label }) => (
          <button
            key={mode}
            type="button"
            onClick={() => setView(mode)}
            aria-label={label}
            aria-pressed={viewMode === mode}
            className={cn(
              "relative flex size-11 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              viewMode === mode ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {viewMode === mode && (
              <motion.span
                layoutId="goalViewIndicator"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="absolute inset-0 rounded-md bg-background"
              />
            )}
            <Icon size={16} className="relative" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {controls}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[15.5rem] rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="app-surface divide-y divide-border overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="space-y-4">
        {controls}
        <EmptyState
          surface
          icon={Target}
          title={emptyState?.title ?? "No goals found"}
          description={
            emptyState?.description ??
            "Try adjusting your filters or create a new goal to get started."
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {controls}

      {/* Key the container by viewMode so the two layouts cross-fade as separate
          trees, instead of morphing the same keyed nodes across a grid⇄flex
          change (which is what made the switch janky). */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          // The list is one surface of divided rows (docs/design-system.md),
          // not a stack of bordered cards; the grid keeps a card per goal.
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3"
              : "app-surface divide-y divide-border overflow-hidden",
          )}
        >
          {goals.map((goal, i) => {
            const isCompleted = goal.status === "completed"
            const deadlineInfo = calculateGoalDeadlineInfo(goal)
            const deadlineFooterText = formatDeadlineFooter(goal, deadlineInfo)
            // Outcome progress (weighted key results) takes priority over the
            // legacy done/total task percentage — see lib/goal-progress.ts.
            const goalProgress = computeGoalProgress(goal.taskCounts, goal.keyResults ?? [])
            const total = goalProgress.activityProgress.total
            const done = goalProgress.activityProgress.completed
            const progress =
              goalProgress.outcomeProgress ?? goalProgress.activityProgress.percentage
            const health = computeListGoalHealth(goal, new Date())
            // Deterministic next-best-action, reusing the same engine as the
            // goal detail Overview tab (lib/next-best-action.ts) — no ranking
            // logic duplicated here. Not shown once a goal is completed.
            const nextAction = isCompleted
              ? null
              : selectNextBestAction({
                  tasks: goal.tasks ?? [],
                  keyResults: goal.keyResults ?? [],
                  todayYmd,
                })
            const goalIcon = getGoalIcon(goal)
            const isOpening = openingGoalId === goal.id
            const isOwner = currentUser != null && String(currentUser) === String(goal.user_id)
            const href = `/goals/${goal.id}`
            const markOpening = () => setOpeningGoalId(goal.id)
            const status = isCompleted ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Completed
              </span>
            ) : (
              <HealthDot status={health.status} reason={health.reason} />
            )
            const actions = isOpening ? (
              <div className="flex size-11 shrink-0 items-center justify-center">
                <span
                  role="status"
                  aria-label="Opening goal"
                  className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
                />
              </div>
            ) : (
              isOwner && (
                <GoalActions
                  goal={goal}
                  size="h-11 w-11"
                  onDeleteGoal={onDeleteGoal}
                  onEditGoal={onEditGoal}
                  onToggleStar={onToggleStar}
                  onToggleComplete={onToggleComplete}
                />
              )
            )
            const titleLink = (
              <Link
                href={href}
                onClick={markOpening}
                title={goal.title}
                className={cn(STRETCHED_LINK, "line-clamp-2 break-words group-hover:text-primary")}
              >
                {goal.title}
              </Link>
            )

            // ── List view: a divided row. The title gets two lines; status,
            // deadline and task count share one wrapping line beneath it. ──
            if (viewMode === "list") {
              return (
                <motion.div
                  key={goal.id}
                  custom={i}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className={cn(
                    "group relative flex items-start gap-3 px-3 py-3 transition-colors hover:bg-accent/40 sm:px-4",
                    isOpening && "bg-accent/40",
                  )}
                >
                  <GoalIcon
                    goal={goal}
                    icon={goalIcon}
                    onChange={(emoji) => handleIconChange(goal, emoji)}
                    className="size-10 rounded-lg text-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <h3 className="min-w-0 flex-1 text-base font-medium leading-snug text-foreground">
                        {titleLink}
                      </h3>
                      <span className="hidden shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-foreground sm:inline">
                        {progress}%
                      </span>
                    </div>
                    {/* Spacing, not "·" separators, between items: the line
                        wraps on phones and a dot would dangle at line ends. */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                      {status}
                      {!isCompleted && deadlineFooterText && <span>{deadlineFooterText}</span>}
                      <span className="tabular-nums">
                        {done}/{total} tasks
                        <span className="sm:hidden"> · {progress}%</span>
                      </span>
                    </div>
                    <ProgressBar progress={progress} className="mt-2 max-w-sm" />
                    {!isCompleted && (
                      <p className="mt-1.5 flex min-w-0 gap-1 text-sm text-muted-foreground">
                        <span className="shrink-0 font-medium">Next:</span>
                        <span className="min-w-0 truncate">
                          {nextAction
                            ? nextAction.task.title ||
                              nextAction.task.description ||
                              "Untitled task"
                            : "No next action scheduled"}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="-my-1 -mr-1 flex shrink-0 items-center">{actions}</div>
                </motion.div>
              )
            }

            // ── Grid view: compact card ──
            return (
              <motion.div
                key={goal.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
                className="group relative min-w-0"
              >
                <Card
                  className={cn(
                    "relative h-full transition-colors hover:border-primary/40",
                    isOpening && "border-primary/40 ring-2 ring-primary",
                  )}
                >
                  <CardContent className="flex h-full flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <GoalIcon
                        goal={goal}
                        icon={goalIcon}
                        onChange={(emoji) => handleIconChange(goal, emoji)}
                        className="size-11 rounded-lg text-xl"
                      />
                      {actions}
                    </div>

                    <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                      {titleLink}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
                      <span>{categoryLabel(goal)}</span>
                      <span aria-hidden="true">·</span>
                      {status}
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Progress</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {progress}%
                        </span>
                      </div>
                      <ProgressBar progress={progress} />
                    </div>

                    {!isCompleted && <NextActionBlock nextAction={nextAction} className="mt-4" />}

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <ClipboardList size={14} aria-hidden="true" />
                        {done}/{total} tasks
                      </span>
                      {!isCompleted && deadlineFooterText && (
                        <span className="flex items-center gap-1.5">
                          <CalendarDays size={14} aria-hidden="true" />
                          {deadlineFooterText}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default GoalList
