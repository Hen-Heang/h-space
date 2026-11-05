// Universal Reminders — pure domain types + recurrence engine. Framework-free
// so it's covered by colocated Vitest tests; Supabase access lives in
// lib/api/reminders.ts. The actual unattended dispatch runs server-side in
// Postgres (see supabase/migrations/..._reminders.sql's kori_next_reminder_run
// function) since a pg_cron job can't call into this file — that SQL function
// deliberately mirrors the algorithm below (walk forward one calendar day at a
// time, reconstructing a timezone-anchored timestamp each time) so the two
// independently-implemented versions agree. `computeNextRunAt` here is the
// one the UI calls for a live "next reminder: ..." preview while editing.

import { TZDate } from "@date-fns/tz"

/** Matches lib/task-status.ts's APP_TIMEZONE — the app's default planning zone. */
export const DEFAULT_REMINDER_TIMEZONE = "Asia/Seoul"

/**
 * The IANA zone this device is set to, so "every day at 9:00" means 9:00
 * where the owner actually is. A one-time reminder's datetime-local input is
 * already read in the device's zone; recurring ones used to be pinned to
 * Seoul, so the two kinds disagreed whenever the device was elsewhere. Falls
 * back to the default when the runtime can't name or accept its own zone.
 */
export function getDeviceTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (zone) {
      // Throws a RangeError for a zone this runtime doesn't recognise.
      new Intl.DateTimeFormat("en-US", { timeZone: zone })
      return zone
    }
  } catch {
    /* fall through to the default */
  }
  return DEFAULT_REMINDER_TIMEZONE
}

export type ReminderFrequency = "daily" | "weekly" | "weekdays"
export type ReminderChannel = "web" | "telegram"
export type ReminderStatus = "active" | "paused" | "completed" | "cancelled"
export type ReminderEntityType =
  "task" | "goal" | "habit" | "note" | "inbox_item" | "journal_prompt" | "manual_activity"

export const REMINDER_ENTITY_LABELS: Record<ReminderEntityType, string> = {
  task: "Task",
  goal: "Goal",
  habit: "Habit",
  note: "Note",
  inbox_item: "Inbox item",
  journal_prompt: "Journal prompt",
  manual_activity: "Activity",
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export interface RecurrenceRule {
  frequency: ReminderFrequency
  /** 24h "HH:MM", local to the reminder's own timezone. */
  time: string
  /** 0 (Sun) – 6 (Sat). Required when frequency === "weekly". */
  anchorWeekday?: number
  /** 0 (Sun) – 6 (Sat), one or more. Required when frequency === "weekdays". */
  weekdays?: number[]
}

export interface Reminder {
  id: string
  title: string
  body: string | null
  entityType: ReminderEntityType
  entityId: string | null
  scheduledFor: string | null
  recurrence: RecurrenceRule | null
  timezone: string
  channels: ReminderChannel[]
  status: ReminderStatus
  nextRunAt: string | null
  lastSentAt: string | null
  lastError: string | null
  snoozedUntil: string | null
  deepLink: string | null
  createdAt: string
  updatedAt: string
}

export interface ReminderInput {
  title: string
  body?: string | null
  entityType: ReminderEntityType
  entityId?: string | null
  scheduledFor?: string | null
  recurrence?: RecurrenceRule | null
  timezone?: string
  channels?: ReminderChannel[]
  deepLink?: string | null
}

const MAX_ITERATIONS = 400

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(":").map(Number)
  return { hour, minute }
}

function matchesFrequency(rule: RecurrenceRule, weekday: number): boolean {
  if (rule.frequency === "daily") return true
  if (rule.frequency === "weekly") return weekday === rule.anchorWeekday
  return (rule.weekdays ?? []).includes(weekday)
}

/**
 * The next occurrence strictly after `after`, for a recurring reminder.
 * Walks forward one calendar day at a time in `timeZone`, reconstructing a
 * fresh timezone-anchored timestamp for each candidate day rather than doing
 * millisecond arithmetic — so a DST transition can never silently shift the
 * wall-clock time the user actually asked for (e.g. "9:00 AM" stays 9:00 AM
 * on both sides of a spring-forward/fall-back boundary).
 */
export function computeNextRunAt(rule: RecurrenceRule, timeZone: string, after: Date): Date {
  const { hour, minute } = parseTime(rule.time)
  const afterInZone = new TZDate(after, timeZone)
  const year = afterInZone.getFullYear()
  const month = afterInZone.getMonth()
  let date = afterInZone.getDate()

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const candidate = new TZDate(year, month, date, hour, minute, timeZone)
    if (candidate.getTime() > after.getTime() && matchesFrequency(rule, candidate.getDay())) {
      return candidate
    }
    date += 1
  }

  throw new Error("Could not compute the next reminder occurrence — check the recurrence rule.")
}

/** Human-readable summary for the reminder form/list ("Every day at 9:00 AM"). */
export function describeRecurrence(rule: RecurrenceRule): string {
  const [hourStr, minuteStr] = rule.time.split(":")
  const hour24 = Number(hourStr)
  const period = hour24 >= 12 ? "PM" : "AM"
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  const timeLabel = `${hour12}:${minuteStr} ${period}`

  if (rule.frequency === "daily") return `Every day at ${timeLabel}`
  if (rule.frequency === "weekly") {
    const day = rule.anchorWeekday != null ? WEEKDAY_LABELS[rule.anchorWeekday] : "…"
    return `Every ${day} at ${timeLabel}`
  }
  const days = (rule.weekdays ?? [])
    .slice()
    .sort()
    .map((d) => WEEKDAY_LABELS[d])
  return `${days.join(", ") || "…"} at ${timeLabel}`
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface ReminderValidationErrors {
  title?: string
  schedule?: string
  channels?: string
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function validateReminderInput(input: {
  title: string
  scheduledFor?: string | null
  recurrence?: RecurrenceRule | null
  channels?: ReminderChannel[]
}): ReminderValidationErrors {
  const errors: ReminderValidationErrors = {}

  if (!input.title.trim()) errors.title = "Give the reminder a title."

  if (!input.recurrence && !input.scheduledFor) {
    errors.schedule = "Pick a one-time date/time or a recurrence."
  } else if (input.recurrence) {
    if (!TIME_PATTERN.test(input.recurrence.time)) {
      errors.schedule = "Pick a valid time."
    } else if (input.recurrence.frequency === "weekly" && input.recurrence.anchorWeekday == null) {
      errors.schedule = "Pick which day of the week to repeat on."
    } else if (
      input.recurrence.frequency === "weekdays" &&
      (input.recurrence.weekdays ?? []).length === 0
    ) {
      errors.schedule = "Pick at least one weekday."
    }
  }

  if (!input.channels || input.channels.length === 0) {
    errors.channels = "Choose at least one delivery channel."
  }

  return errors
}

export function isReminderInputValid(input: {
  title: string
  scheduledFor?: string | null
  recurrence?: RecurrenceRule | null
  channels?: ReminderChannel[]
}): boolean {
  return Object.keys(validateReminderInput(input)).length === 0
}
