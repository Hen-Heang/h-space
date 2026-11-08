"use client"

import Link from "next/link"
import { CheckSquare, Compass, Flame, NotebookPen, Sparkles, Zap } from "lucide-react"

import { TIMELINE_KIND_META, type TimelineEntry, type TimelineKind } from "@/lib/timeline"
import { cn } from "@/lib/utils"

const KIND_ICON: Record<TimelineKind, React.ElementType> = {
  task: CheckSquare,
  habit_checkin: Flame,
  hengo_session: Sparkles,
  manual_activity: Zap,
  journal: NotebookPen,
  recovery_checkin: Compass,
}

const KIND_COLOR: Record<TimelineKind, string> = {
  task: "text-blue-600 dark:text-blue-400",
  habit_checkin: "text-amber-600 dark:text-amber-400",
  hengo_session: "text-violet-600 dark:text-violet-400",
  manual_activity: "text-emerald-600 dark:text-emerald-400",
  journal: "text-sky-600 dark:text-sky-400",
  recovery_checkin: "text-rose-600 dark:text-rose-400",
}

export function TimelineEntryRow({ entry }: { entry: TimelineEntry }) {
  const Icon = KIND_ICON[entry.kind]
  const time = new Date(entry.occurredAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })

  const content = (
    <div className="flex min-h-16 items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-3 transition-colors hover:border-border">
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background",
          KIND_COLOR[entry.kind],
        )}
      >
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {TIMELINE_KIND_META[entry.kind].label}
          </span>
          <span className="text-xs text-muted-foreground/70">{time}</span>
        </div>
        <p className="mt-0.5 break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">
          {entry.title}
        </p>
        {entry.description && (
          <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {entry.description}
          </p>
        )}
      </div>
    </div>
  )

  return entry.href ? (
    <Link href={entry.href} className="block">
      {content}
    </Link>
  ) : (
    content
  )
}
