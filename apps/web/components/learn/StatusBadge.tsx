import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  RotateCcw,
  Trophy,
  type LucideIcon,
} from "lucide-react"

import { LEARN_STATUS_LABEL, type LearnStatus } from "@/lib/learning/course"
import { cn } from "@/lib/utils"

// The same five states, words, and colors on every course-like Learning
// surface (Foundations, Reading, Phrasebook). Icon + text, never color alone.
const STYLES: Record<LearnStatus, { icon: LucideIcon; className: string }> = {
  new: { icon: CircleDashed, className: "bg-muted text-muted-foreground" },
  in_progress: { icon: Clock3, className: "bg-primary/10 text-primary" },
  review_due: {
    icon: RotateCcw,
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  completed: {
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  mastered: { icon: Trophy, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
}

export function StatusBadge({ status, className }: { status: LearnStatus; className?: string }) {
  const { icon: Icon, className: tone } = STYLES[status]
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {LEARN_STATUS_LABEL[status]}
    </span>
  )
}
