// Pure selection logic for the Exam Prep home (/interview). Every number the
// home shows comes from data the app already stores — the question bank and
// progress rows, the saved script, and today's pinned queue in localStorage —
// so nothing here invents a value. Framework-free; tested.

import { dateKeyInTimeZone } from "@/lib/date-key"
import type { InterviewTopic } from "@/lib/interview"
import {
  INTERVIEW_TIME_ZONE,
  selectTodaysQueue,
  wasPracticedToday,
  type PracticeDifficulty,
  type QuestionBankItem,
  type QuestionProgress,
} from "@/lib/interview-practice"

// ── Countdown ──────────────────────────────────────────────────────────────

export type DateCountdown =
  { kind: "upcoming"; days: number } | { kind: "today" } | { kind: "past"; daysAgo: number }

function civilDay(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000
}

/** Whole civil days from `now` (in `timeZone`) to a YYYY-MM-DD date. */
export function countdownTo(
  dateKey: string,
  now: Date = new Date(),
  timeZone = INTERVIEW_TIME_ZONE,
): DateCountdown {
  const diff = civilDay(dateKey) - civilDay(dateKeyInTimeZone(now, timeZone))
  if (diff > 0) return { kind: "upcoming", days: diff }
  if (diff === 0) return { kind: "today" }
  return { kind: "past", daysAgo: -diff }
}

/** "26 days left" / "today" / "passed" — short enough for one header line. */
export function countdownLabel(countdown: DateCountdown): string {
  switch (countdown.kind) {
    case "upcoming":
      return countdown.days === 1 ? "tomorrow" : `${countdown.days} days left`
    case "today":
      return "today"
    case "past":
      return "passed"
  }
}

// ── Today's practice ───────────────────────────────────────────────────────

/** Today's pinned question ids from their localStorage value; tolerant of junk. */
export function parseStoredQueueIds(raw: string | null): string[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []
  } catch {
    return []
  }
}

export type TodayPracticeStatus = "empty" | "not-started" | "in-progress" | "done"

export interface TodayPracticePlan {
  status: TodayPracticeStatus
  /** The queue the Speaking drill will run (pinned ids first, same order). */
  queue: QuestionBankItem[]
  done: number
  total: number
  /** First question not yet practiced today; null once all are done. */
  next: QuestionBankItem | null
}

/**
 * Previews Today's 5 exactly as the Speaking drill will build it, without
 * pinning anything (only starting the drill writes the queue to storage).
 */
export function planTodayPractice({
  questions,
  progress,
  difficulty,
  storedIds,
  size,
  now = new Date(),
}: {
  questions: QuestionBankItem[]
  progress: Record<string, QuestionProgress>
  difficulty: PracticeDifficulty
  storedIds: string[]
  size: number
  now?: Date
}): TodayPracticePlan {
  const queue = selectTodaysQueue(questions, progress, difficulty, size, storedIds)
  if (queue.length === 0) return { status: "empty", queue, done: 0, total: 0, next: null }

  // Only questions pinned for today can count as done today; an unpinned
  // preview hasn't been started, whatever the progress rows say.
  const pinned = new Set(storedIds)
  const isDone = (question: QuestionBankItem) =>
    pinned.has(question.id) && wasPracticedToday(progress[question.id], now)
  const done = queue.filter(isDone).length
  const next = queue.find((question) => !isDone(question)) ?? null
  const total = queue.length
  const status: TodayPracticeStatus =
    done === 0 ? "not-started" : done >= total ? "done" : "in-progress"
  return { status, queue, done, total, next }
}

// ── Script ─────────────────────────────────────────────────────────────────

/**
 * The script editor's localStorage autosave keys (`/interview/script`). The
 * format is load-bearing — existing devices hold these keys.
 */
export function interviewScriptStorageKeys(topicId: string) {
  const sections = `koriai-interview-script:${topicId}`
  return { sections, updatedAt: `${sections}:updated-at` }
}

export interface ScriptSnapshot {
  sections: Record<string, string>
  updatedAt: string | null
}

/**
 * The copy the script editor would show: the newer of this device's autosave
 * and the account copy (the editor hydrates the same way).
 */
export function pickNewerScript(
  local: ScriptSnapshot | null,
  remote: ScriptSnapshot | null,
): ScriptSnapshot | null {
  if (!local) return remote
  if (!remote) return local
  const localTime = local.updatedAt ? Date.parse(local.updatedAt) : Number.NaN
  const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : Number.NaN
  if (Number.isNaN(localTime)) return remote
  if (Number.isNaN(remoteTime)) return local
  return remoteTime >= localTime ? remote : local
}

export interface ScriptSummary {
  sectionsWritten: number
  totalSections: number
  words: number
  /** ISO time of the last save, or null when the script was never saved. */
  lastSavedAt: string | null
  /** True when every section is still exactly the drafted starting text. */
  untouched: boolean
}

function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/** Counts only the outline's Korean sections; blank sections fall back to the draft like the editor. */
export function summarizeScript(
  topic: Pick<InterviewTopic, "scriptOutline" | "scriptSeed">,
  snapshot: ScriptSnapshot | null,
): ScriptSummary {
  const outline = topic.scriptOutline ?? []
  const seed = topic.scriptSeed ?? {}
  let sectionsWritten = 0
  let words = 0
  let untouched = true
  for (const section of outline) {
    const saved = snapshot?.sections[section.id] ?? ""
    const text = saved.trim() ? saved : (seed[section.id] ?? "")
    if (text.trim()) sectionsWritten += 1
    words += countWords(text)
    if (saved.trim() && saved.trim() !== (seed[section.id] ?? "").trim()) untouched = false
  }
  return {
    sectionsWritten,
    totalSections: outline.length,
    words,
    lastSavedAt: snapshot?.updatedAt ?? null,
    untouched,
  }
}

export interface DisplayScriptSection {
  id: string
  /** "0. 인사 및 주제 소개" — memorization order, then the Korean title. */
  title: string
  text: string
}

/**
 * The script in outline order as the learner would read it: saved text, or the
 * drafted text for blank sections (like the editor). Empty sections are left out.
 */
export function scriptSectionsForDisplay(
  topic: Pick<InterviewTopic, "scriptOutline" | "scriptSeed">,
  snapshot: ScriptSnapshot | null,
): DisplayScriptSection[] {
  return (topic.scriptOutline ?? [])
    .map((section, index) => {
      const saved = snapshot?.sections[section.id] ?? ""
      const text = saved.trim() ? saved : (topic.scriptSeed?.[section.id] ?? "")
      return { id: section.id, title: `${index}. ${section.titleKo}`, text }
    })
    .filter((section) => section.text.trim())
}
