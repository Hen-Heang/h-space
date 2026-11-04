// Types ported from Orbit src/types/task.ts. The original imported `User` from
// @supabase/supabase-js (unused) — dropped, since auth is unified on KoriAI's JWT.

export interface Task {
  id: string
  description: string
  completed: boolean
  user_id: string
  updated_by?: string | null
  created_at?: string
  updated_at?: string
  // Unified datetime fields
  title?: string
  goal_id?: string | null // null = personal (standalone) task
  start_date: string // ISO datetime (date portion used for the day)
  end_date: string // ISO datetime (date portion used for the day)
  daily_start_time?: string | null // 'HH:MM:SS'
  daily_end_time?: string | null // 'HH:MM:SS'
  is_anytime?: boolean | null
  duration_minutes?: number | null
  tags?: string[]
  color?: string | null // custom task color (hex, e.g. "#3b82f6")
  // ── Goal System v2 quality fields (Goal System v2 — see
  //    docs/goal-system-v2-audit.md) — all optional/nullable so every
  //    pre-v2 task keeps working unchanged.
  key_result_id?: string | null
  expected_output?: string | null
  completion_criteria?: string | null
  evidence_required?: boolean
  impact_level?: "low" | "medium" | "high" | null
  effort_minutes?: number | null
  source?: "manual" | "ai" | "template"
  reschedule_count?: number
  // ── Plan / schedule linkage (Goal Planning & Scheduling — see
  //    docs/goal-planning-scheduling-audit.md). All nullable/defaulted so
  //    every pre-existing task keeps working unchanged.
  phase_id?: string | null
  schedule_rule_id?: string | null
  /** Set only on tasks materialised from a schedule rule (YYYY-MM-DD). */
  occurrence_date?: string | null
  scheduling_source?: TaskSchedulingSource
  // ── Workflow status. `completed` above is kept in sync with this and stays
  //    authoritative on read while external (Orbit) writers exist — the one
  //    canonical rule lives in lib/task-status.ts.
  status?: TaskStatus
  blocked_reason?: string | null
}

export type TaskSchedulingSource = "manual" | "ai" | "recurring_rule" | "rescheduled"

export type TaskStatus = "backlog" | "scheduled" | "in_progress" | "blocked" | "completed"

export interface TaskTag {
  name: string
  color?: "red" | "blue" | "green" | "yellow" | "purple" | "orange" | "pink" | "gray"
  icon?: "flag" | "star" | "bell" | "clock" | "target" | "heart" | "circle" | "check"
}

export interface TaskManagerProps {
  goalId: string
  goalTitle: string
  goalDescription?: string
}

export interface FinancialData {
  goalId: string
  monthlyIncome?: number
  targetSavings?: number
  currency?: string
}

// Kept for the deferred AI task-generation seam.
export interface TaskGenerationParams {
  goalTitle: string
  goalDescription?: string
  financialData?: FinancialData | null
  startDate: string
  targetDate: string
  goalType?: string
  travelDetails?: {
    destination?: string
    accommodation?: string
    transportation?: string
    budget?: string
    activities?: string[]
  }
  userContext?: unknown
}

// 8 preset task colors (ported from Orbit's TaskColorPicker).
export const TASK_COLOR_PRESETS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#eab308", // yellow
  "#a855f7", // purple
  "#f97316", // orange
  "#ec4899", // pink
  "#6b7280", // gray
] as const

export const DEFAULT_TASK_COLOR = TASK_COLOR_PRESETS[0]

export const getTaskColor = (task?: Pick<Task, "color"> | null): string =>
  task?.color && /^#[0-9a-fA-F]{6}$/.test(task.color) ? task.color : DEFAULT_TASK_COLOR

// Named swatches for the TaskColorPicker (ported from Orbit's taskColors.ts).
export interface TaskColorOption {
  name: string
  value: string
}

export const TASK_COLORS: TaskColorOption[] = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Slate", value: "#64748b" },
]

/** Append an alpha channel (0–1) to a #rrggbb hex → #rrggbbaa. */
export const hexWithAlpha = (hex: string, alpha: number): string => {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0")
  return `${hex}${a}`
}
