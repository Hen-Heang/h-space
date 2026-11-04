"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileText,
  Flame,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  EXAM_DATE,
  EXAM_DATE_LABEL,
  SCRIPT_DUE_DATE,
  STUDY_WEEKS,
  daysUntil,
  getCurrentWeek,
} from "@/lib/study-plan"
import { cn } from "@/lib/utils"

// Checkbox + custom-task state is frontend-only, same convention as the script writer.
const DONE_KEY = "koriai-study-plan:done"
const CUSTOM_KEY = "koriai-study-plan:custom"

interface CustomTask {
  id: string
  text: string
}

export function StudyPlanCard() {
  // Date math + localStorage are client-only; render after mount to avoid drift.
  const [mounted, setMounted] = useState(false)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [custom, setCustom] = useState<Record<string, CustomTask[]>>({})

  useEffect(() => {
    setMounted(true)
    try {
      const d = window.localStorage.getItem(DONE_KEY)
      if (d) setDone(JSON.parse(d) as Record<string, boolean>)
      const c = window.localStorage.getItem(CUSTOM_KEY)
      if (c) setCustom(JSON.parse(c) as Record<string, CustomTask[]>)
    } catch {
      /* ignore */
    }
  }, [])

  const week = useMemo(() => getCurrentWeek(), [])
  const daysToExam = useMemo(() => daysUntil(EXAM_DATE), [])
  const daysToScript = useMemo(() => daysUntil(SCRIPT_DUE_DATE), [])

  const weekCustom = custom[week.id] ?? []

  const [showAll, setShowAll] = useState(false)
  const [newTask, setNewTask] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")

  const persistDone = (next: Record<string, boolean>) => {
    setDone(next)
    try {
      window.localStorage.setItem(DONE_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable */
    }
  }

  const persistCustom = (next: Record<string, CustomTask[]>) => {
    setCustom(next)
    try {
      window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable */
    }
  }

  const toggle = (key: string) => persistDone({ ...done, [key]: !done[key] })

  const addTask = () => {
    const text = newTask.trim()
    if (!text) return
    const task: CustomTask = { id: crypto.randomUUID(), text }
    persistCustom({ ...custom, [week.id]: [...weekCustom, task] })
    setNewTask("")
  }

  const saveEdit = () => {
    const text = editingValue.trim()
    if (editingId && text) {
      persistCustom({
        ...custom,
        [week.id]: weekCustom.map((t) => (t.id === editingId ? { ...t, text } : t)),
      })
    }
    setEditingId(null)
    setEditingValue("")
  }

  const deleteTask = (id: string) => {
    persistCustom({ ...custom, [week.id]: weekCustom.filter((t) => t.id !== id) })
    const { [`${week.id}:c:${id}`]: _removed, ...rest } = done
    persistDone(rest)
  }

  const fixedDone = mounted ? week.tasks.filter((_, i) => done[`${week.id}:${i}`]).length : 0
  const customDone = mounted ? weekCustom.filter((t) => done[`${week.id}:c:${t.id}`]).length : 0
  const completed = fixedDone + customDone
  const total = week.tasks.length + weekCustom.length

  const taskRow = (key: string, text: string, custom?: CustomTask) => {
    const checked = mounted && !!done[key]
    if (custom && editingId === custom.id) {
      return (
        <li key={key} className="px-2 py-1">
          <input
            autoFocus
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit()
              if (e.key === "Escape") {
                setEditingId(null)
                setEditingValue("")
              }
            }}
            onBlur={saveEdit}
            className="w-full rounded-lg border border-amber-500/40 bg-background px-2 py-1.5 text-sm font-medium outline-none"
          />
        </li>
      )
    }
    return (
      <li key={key} className="group/task flex items-start gap-1">
        <button
          type="button"
          onClick={() => toggle(key)}
          className="flex flex-1 items-start gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent/50 active:scale-[0.99]"
        >
          {checked ? (
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              strokeWidth={2.5}
            />
          ) : (
            <Circle
              size={18}
              className="mt-0.5 shrink-0 text-muted-foreground/50"
              strokeWidth={2}
            />
          )}
          <span
            className={cn(
              "text-sm font-medium leading-snug",
              checked ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {text}
          </span>
        </button>
        {custom && (
          <div className="flex shrink-0 items-center gap-0.5 pt-1.5 opacity-0 transition-opacity group-hover/task:opacity-100">
            <button
              type="button"
              aria-label="Edit task"
              onClick={() => {
                setEditingId(custom.id)
                setEditingValue(custom.text)
              }}
              className="rounded-lg p-1.5 text-muted-foreground/50 hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Delete task"
              onClick={() => deleteTask(custom.id)}
              className="rounded-lg p-1.5 text-muted-foreground/50 hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </li>
    )
  }

  return (
    <Card className="rounded-[1.8rem] border-amber-500/40 bg-amber-500/5 shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
      <CardContent className="p-5 sm:p-6">
        {/* Countdown header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <CalendarDays size={18} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-foreground">Exam Prep Plan</p>
              <p className="text-xs font-medium text-muted-foreground">
                {week.phase} · {week.label} ({week.range})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
              <Flame size={12} strokeWidth={3} />
              {mounted ? `${daysToExam}d` : "—"} to exam
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
              <FileText size={12} strokeWidth={3} />
              {mounted ? `${daysToScript}d` : "—"} to script
            </span>
          </div>
        </div>

        {/* This week's checklist */}
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            This week
          </p>
          <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-xs">
            {completed}/{total}
          </Badge>
        </div>

        <ul className="mt-3 space-y-1.5">
          {week.tasks.map((task, i) => taskRow(`${week.id}:${i}`, task))}
          {weekCustom.map((t) => taskRow(`${week.id}:c:${t.id}`, t.text, t))}
        </ul>

        {/* Add a custom task for this week */}
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 focus-within:border-amber-500/50">
          <Plus className="h-4 w-4 shrink-0 text-muted-foreground/40" />
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask()
            }}
            placeholder="Add your own task this week…"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/40"
          />
          <button
            type="button"
            onClick={addTask}
            disabled={!newTask.trim()}
            className="relative shrink-0 rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs after:absolute after:-inset-y-2.5 after:inset-x-0 after:content-[''] font-bold uppercase tracking-wide text-amber-700 disabled:opacity-40 dark:text-amber-400"
          >
            Add
          </button>
        </div>

        {/* Full schedule (collapsed) */}
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-background/40 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent/50"
        >
          {showAll ? "Hide" : "View"} full 10-week schedule
          <ChevronDown size={14} className={cn("transition-transform", showAll && "rotate-180")} />
        </button>

        {showAll && (
          <ul className="mt-3 space-y-1">
            {STUDY_WEEKS.map((w) => (
              <li
                key={w.id}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-1.5 text-xs",
                  w.id === week.id
                    ? "bg-amber-500/10 font-bold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <span>{w.range}</span>
                <span className="font-semibold">{w.phase}</span>
              </li>
            ))}
            <li className="flex items-center justify-between rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
              <span>{EXAM_DATE_LABEL}</span>
              <span>EXAM 🎯</span>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
