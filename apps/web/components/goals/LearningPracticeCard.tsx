"use client"

import Link from "next/link"
import { CheckCircle2, Circle, GraduationCap } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getLearningTaskLink } from "@/lib/learning-task-link"
import type { Task } from "@/lib/tasks"

// Goal tasks have no backend link to real learning activity — this surfaces
// the tasks that DO name a learning feature (vocab, scenarios, listening...)
// with a direct "Practice" deep link, so a Korean-learning goal's checklist
// actually leads somewhere instead of sitting there as plain text.
export function LearningPracticeCard({
  tasks,
  onToggle,
}: {
  tasks: Task[]
  onToggle: (taskId: string, completed: boolean) => void
}) {
  const matches = tasks
    .map((task) => ({ task, link: getLearningTaskLink(task) }))
    .filter(
      (m): m is { task: Task; link: NonNullable<ReturnType<typeof getLearningTaskLink>> } =>
        m.link !== null,
    )

  if (matches.length === 0) return null

  const completedCount = matches.filter((m) => m.task.completed).length

  return (
    <Card className="border-border bg-card/50 p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <GraduationCap size={14} strokeWidth={2.5} />
          Learning Practice
        </h3>
        <span className="text-xs font-bold text-muted-foreground">
          {completedCount}/{matches.length}
        </span>
      </div>
      <ul className="mt-5 space-y-2">
        {matches.map(({ task, link }) => (
          <li
            key={task.id}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3"
          >
            <button
              type="button"
              onClick={() => onToggle(task.id, task.completed)}
              aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
              className={cn(
                "shrink-0 transition-transform active:scale-90",
                task.completed ? "text-emerald-500" : "text-muted-foreground/60 hover:text-primary",
              )}
            >
              {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
            </button>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm font-bold",
                task.completed ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {task.title || task.description}
            </span>
            <Link
              href={link.href}
              className="shrink-0 rounded-xl bg-blue-600/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-600 transition-colors hover:bg-blue-600/20 dark:text-blue-400"
            >
              {link.label} →
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
