"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
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
  hover: { y: -3, transition: { type: "spring", stiffness: 400, damping: 25 } },
  tap: { scale: 0.98, transition: { type: "spring", stiffness: 600, damping: 40 } },
}

const progressGradient = (progress: number) =>
  progress >= 75
    ? "linear-gradient(90deg, #10b981, #059669)"
    : progress >= 40
      ? "linear-gradient(90deg, #3b82f6, #2563eb)"
      : "linear-gradient(90deg, #f59e0b, #ef4444)"

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
  return (
    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onToggleStar?.(goal.id)}
        aria-label={goal.isStarred ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={Boolean(goal.isStarred)}
        className={cn(
          size,
          "rounded-lg",
          goal.isStarred
            ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
            : "text-muted-foreground/60 hover:bg-amber-500/10 hover:text-amber-500",
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
        <DropdownMenuContent align="end" className="w-44 rounded-lg p-2 shadow-md">
          <DropdownMenuItem
            className="rounded-lg font-medium"
            onSelect={() => onToggleComplete?.(goal.id)}
          >
            {isCompleted ? (
              <RotateCcw className="mr-3 h-4 w-4 text-blue-500" />
            ) : (
              <CheckCircle2 className="mr-3 h-4 w-4 text-emerald-500" />
            )}
            {isCompleted ? "Reopen goal" : "Mark complete"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-lg font-medium"
            onSelect={(e) => onEditGoal?.(goal, e as unknown as React.MouseEvent)}
          >
            <Pencil className="mr-3 h-4 w-4 text-primary" /> Edit
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
        "relative shrink-0 overflow-hidden bg-primary/10 font-bold text-primary ring-1 ring-primary/10",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <EmojiIconPicker value={icon} onChange={onChange}>
        <button className="flex h-full w-full items-center justify-center">
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
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
        Next action
      </p>
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
}: GoalListProps) {
  const router = useRouter()
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

  if (isLoading) {
    return viewMode === "grid" ? (
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[15.5rem] rounded-lg" />
        ))}
      </div>
    ) : (
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[92px] rounded-lg" />
        ))}
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/30 px-4 py-10 text-center sm:py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Target size={28} strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            {emptyState?.title ?? "No goals found"}
          </h3>
          <p className="mt-2 max-w-sm text-sm font-medium text-muted-foreground">
            {emptyState?.description ??
              "Try adjusting your filters or create a new goal to get started."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="relative flex gap-1 rounded-lg bg-foreground/5 p-1">
          {(
            [
              { mode: "list", Icon: List, label: "List view" },
              { mode: "grid", Icon: LayoutGrid, label: "Grid view" },
            ] as const
          ).map(({ mode, Icon, label }) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              aria-label={label}
              aria-pressed={viewMode === mode}
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                viewMode === mode
                  ? "text-foreground"
                  : "text-muted-foreground/50 hover:text-foreground",
              )}
            >
              {viewMode === mode && (
                <motion.span
                  layoutId="goalViewIndicator"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="absolute inset-0 rounded-lg bg-background shadow-sm"
                />
              )}
              <Icon size={16} className="relative" />
            </button>
          ))}
        </div>
      </div>

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
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-2.5",
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
            const open = () => {
              setOpeningGoalId(goal.id)
              router.push(`/goals/${goal.id}`)
            }

            // ── List view: thin full-width table row ──
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
                  onClick={open}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && event.key === "Enter") open()
                  }}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open goal: ${goal.title}`}
                  className={cn(
                    "group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-lg border border-border/60 bg-card/40 px-3 py-3 transition-all duration-200 hover:border-border hover:bg-card/70 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring dark:bg-slate-900/40",
                    isOpening && "border-primary/40 ring-2 ring-primary",
                  )}
                >
                  <GoalIcon
                    goal={goal}
                    icon={goalIcon}
                    onChange={(emoji) => handleIconChange(goal, emoji)}
                    className="h-11 w-11 rounded-xl text-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <h3
                      title={goal.title}
                      className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary"
                    >
                      {goal.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span className="shrink-0 truncate">{categoryLabel(goal)}</span>
                      <span aria-hidden="true">·</span>
                      {isCompleted ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Completed
                        </span>
                      ) : (
                        <HealthDot status={health.status} reason={health.reason} />
                      )}
                      <div className="h-1.5 min-w-6 flex-1 overflow-hidden rounded-full bg-foreground/8">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full"
                          style={{ background: progressGradient(progress) }}
                        />
                      </div>
                      <span className="shrink-0 tabular-nums">
                        {done}/{total}
                      </span>
                    </div>
                    {!isCompleted && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                          Next
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {nextAction
                            ? nextAction.task.title ||
                              nextAction.task.description ||
                              "Untitled task"
                            : "No next action scheduled"}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="hidden shrink-0 text-[11px] font-medium text-muted-foreground sm:inline">
                    {deadlineFooterText}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                    {progress}%
                  </span>
                  {isOpening ? (
                    <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                  )}
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
                whileHover="hover"
                whileTap="tap"
                layout
                className="group relative"
              >
                <Card
                  className={cn(
                    "h-full overflow-hidden rounded-lg border border-border/60 bg-card/40 transition-all duration-200 hover:border-border hover:bg-card/70 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring dark:bg-slate-900/40",
                    isOpening && "border-primary/40 ring-2 ring-primary",
                  )}
                  onClick={open}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && event.key === "Enter") open()
                  }}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open goal: ${goal.title}`}
                >
                  <CardContent className="flex h-full flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <GoalIcon
                        goal={goal}
                        icon={goalIcon}
                        onChange={(emoji) => handleIconChange(goal, emoji)}
                        className="h-11 w-11 rounded-xl text-xl"
                      />
                      {isOwner && (
                        <GoalActions
                          goal={goal}
                          size="h-11 w-11"
                          onDeleteGoal={onDeleteGoal}
                          onEditGoal={onEditGoal}
                          onToggleStar={onToggleStar}
                          onToggleComplete={onToggleComplete}
                        />
                      )}
                    </div>

                    <h3
                      title={goal.title}
                      className="mt-4 line-clamp-2 text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary"
                    >
                      {goal.title}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span className="shrink-0 truncate">{categoryLabel(goal)}</span>
                      <span aria-hidden="true">·</span>
                      {isCompleted ? (
                        <span className="inline-flex min-w-0 items-center gap-1 truncate text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" /> Completed
                        </span>
                      ) : (
                        <HealthDot status={health.status} reason={health.reason} />
                      )}
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Progress</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {progress}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/8">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full"
                          style={{ background: progressGradient(progress) }}
                        />
                      </div>
                    </div>

                    {!isCompleted && <NextActionBlock nextAction={nextAction} className="mt-4" />}

                    <div className="mt-4 flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <ClipboardList size={14} className="text-muted-foreground/50" />
                        {done}/{total} tasks
                      </span>
                      <span className="flex items-center gap-1.5">
                        {isOpening ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : (
                          !isCompleted && (
                            <>
                              <CalendarDays size={14} className="text-muted-foreground/50" />
                              {deadlineFooterText}
                            </>
                          )
                        )}
                      </span>
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
