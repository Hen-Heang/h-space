"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ChevronRight, Compass } from "lucide-react"

import { itemVariants } from "@/lib/motion"
import type { RecoveryHabit } from "@/lib/types"

function startedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function RecoveryHabitCard({ habit }: { habit: RecoveryHabit }) {
  return (
    <motion.div variants={itemVariants}>
      <Link
        href={`/growth/recovery/${habit.id}`}
        className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50 sm:p-5"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
          <Compass size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{habit.label}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {habit.replacementBehavior || `since ${startedLabel(habit.startedAt)}`}
          </p>
        </div>

        <ChevronRight size={16} className="shrink-0 text-muted-foreground/50" />
      </Link>
    </motion.div>
  )
}
