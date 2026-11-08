"use client"

import Link from "next/link"
import { format } from "date-fns"
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeadlineStatusBadge } from "@/components/goals/DeadlineStatusBadge"
import { HealthBadge } from "@/components/goals/HealthBadge"
import type { GoalDeadlineInfo, Goal } from "@/lib/goals"
import type { GoalHealthStatus } from "@/lib/goals"
import { cn } from "@/lib/utils"

interface GoalDetailHeaderProps {
  goal: Goal
  deadlineInfo: GoalDeadlineInfo | null
  health: { status: GoalHealthStatus; reason?: string | null } | null
  progressLabel: string
  progressValue: number
  isMutatingStatus: boolean
  isOwner: boolean
  memberCount: number
  onToggleComplete: () => void
  onToggleStar: () => void
  onPlanWeek: () => void
  onAddTask: () => void
  onAskAi: () => void
  onEdit: () => void
  onManage: () => void
  onDelete: () => void
}

/**
 * Compact goal hero. Everything that used to live in a 300px-tall gradient
 * card plus four stat tiles now fits in one band: identity, one health
 * sentence, outcome progress, and the three primary actions. Supporting
 * statistics moved into the Overview tab (see docs/goal-planning-scheduling-audit.md).
 */
export function GoalDetailHeader({
  goal,
  deadlineInfo,
  health,
  progressLabel,
  progressValue,
  isMutatingStatus,
  isOwner,
  memberCount,
  onToggleComplete,
  onToggleStar,
  onPlanWeek,
  onAddTask,
  onAskAi,
  onEdit,
  onManage,
  onDelete,
}: GoalDetailHeaderProps) {
  const isCompleted = goal.status === "completed"
  const icon = goal.metadata?.icon

  return (
    <header className="space-y-4 border-b border-border/60 pb-5">
      <div className="flex items-start gap-3">
        <Link
          href="/goals"
          aria-label="Back to goals"
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </Link>

        <div
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-semibold text-primary"
        >
          {icon || (goal.title ? goal.title.charAt(0).toUpperCase() : "G")}
        </div>

        <div className="min-w-0 flex-1">
          {/* h2, not h1: the shell header renders the page's only h1. The
              goal title wraps (two lines) instead of truncating to a few
              words on phones. */}
          <h2 className="line-clamp-2 break-words text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">
            {goal.title}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {health && <HealthBadge status={health.status} reason={health.reason} />}
            {deadlineInfo && <DeadlineStatusBadge deadlineInfo={deadlineInfo} size="sm" />}
            {goal.target_date && (
              <span className="text-xs font-medium text-muted-foreground">
                Target {format(new Date(goal.target_date), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleStar}
            aria-label={goal.isStarred ? "Unpin goal" : "Pin goal"}
            className={cn(
              "h-11 w-11 rounded-lg",
              goal.isStarred ? "text-amber-500" : "text-muted-foreground/60 hover:text-amber-500",
            )}
          >
            <Star className={cn("h-4 w-4", goal.isStarred && "fill-current")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Goal actions"
                className="h-11 w-11 rounded-lg"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
              <DropdownMenuItem className="rounded-lg" onSelect={onEdit}>
                <Settings2 className="mr-2.5 h-4 w-4 text-muted-foreground" /> Edit goal
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg" onSelect={onManage}>
                <Users className="mr-2.5 h-4 w-4 text-muted-foreground" /> Members &amp; sharing
                {memberCount > 1 && (
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {memberCount}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg"
                disabled={isMutatingStatus}
                onSelect={onToggleComplete}
              >
                {isCompleted ? (
                  <RotateCcw className="mr-2.5 h-4 w-4 text-blue-500" />
                ) : (
                  <CheckCircle2 className="mr-2.5 h-4 w-4 text-emerald-500" />
                )}
                {isCompleted ? "Reopen goal" : "Mark complete"}
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuSeparator className="my-1.5" />
                  <DropdownMenuItem
                    variant="destructive"
                    className="rounded-lg"
                    onSelect={onDelete}
                  >
                    <Trash2 className="mr-2.5 h-4 w-4" /> Delete goal
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Outcome progress — one bar, no gradient, no animation loop. */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3 text-xs font-medium text-muted-foreground">
          <span>{progressLabel}</span>
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {progressValue}%
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/8"
          role="progressbar"
          aria-label={progressLabel}
          aria-valuenow={progressValue}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${progressValue}%` }}
          />
        </div>
        {health?.reason && (
          <p className="text-xs font-medium text-muted-foreground">{health.reason}</p>
        )}
      </div>

      {/* Primary actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={onPlanWeek}
          className="h-10 min-h-11 gap-1.5 rounded-xl px-3.5 text-xs font-semibold sm:min-h-0"
        >
          <CalendarPlus className="h-4 w-4" /> Plan week
        </Button>
        <Button
          variant="outline"
          onClick={onAddTask}
          className="h-10 min-h-11 gap-1.5 rounded-xl px-3.5 text-xs font-semibold sm:min-h-0"
        >
          <Plus className="h-4 w-4" /> Add task
        </Button>
        <Button
          variant="outline"
          onClick={onAskAi}
          className="h-10 min-h-11 gap-1.5 rounded-xl px-3.5 text-xs font-semibold sm:min-h-0"
        >
          <Sparkles className="h-4 w-4 text-violet-500" /> Ask AI
        </Button>
        {isMutatingStatus && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </header>
  )
}
