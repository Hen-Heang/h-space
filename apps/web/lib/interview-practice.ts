// Pure logic for the interview-practice extension (kori_interview_questions /
// _question_progress / _answers / _script_versions — see the migration
// comment in supabase/migrations/20260722010000_interview_practice.sql for
// why these exist alongside the older kori_interview_scripts/_attempts).
// Kept side-effect-free and unit-tested, same split as lib/srs.ts /
// lib/learning/corrections.ts: the actual Supabase reads/writes live in
// lib/api/interview.ts and just call these.

export type QuestionCategory =
  | "topic_selection"
  | "korean_summer"
  | "cambodian_weather"
  | "comparison"
  | "daily_life"
  | "health"
  | "personal_experience"
  | "swimming_pool"
  | "seonyudo_park"
  | "adaptation"
  | "opinion"
  | "unexpected_followup"

export type QuestionDifficulty = "beginner" | "normal" | "challenging"
export type PracticeDifficulty = QuestionDifficulty | "mixed"
export type QuestionPriority = "must_practice" | "recommended" | "optional"
export type QuestionProgressStatus = "new" | "practicing" | "improving" | "strong"

export interface QuestionBankItem {
  id: string
  questionKo: string
  questionEn: string | null
  sampleAnswerKo: string | null
  sampleAnswerEn: string | null
  category: QuestionCategory
  difficulty: QuestionDifficulty
  priority: QuestionPriority
  keywords: string[]
  displayOrder: number
  ownedByUser: boolean
}

export interface QuestionProgress {
  questionId: string
  timesPracticed: number
  avgScore: number | null
  lastScore: number | null
  lastPracticedAt: string | null
  status: QuestionProgressStatus
}

export const INTERVIEW_TIME_ZONE = "Asia/Seoul"

export interface QuestionProgressSummary {
  total: number
  practiced: number
  newCount: number
  practicing: number
  improving: number
  strong: number
  needsRetry: number
}

function civilDateNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000
}

function dateKeyInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

/** Whole Seoul civil days remaining, including 0 on exam day. */
export function daysRemainingInSeoul(
  examDate: string,
  now: Date = new Date(),
  timeZone = INTERVIEW_TIME_ZONE,
): number {
  const today = dateKeyInZone(now, timeZone)
  return Math.max(0, civilDateNumber(examDate) - civilDateNumber(today))
}

export function recommendedDifficulty(daysRemaining: number): PracticeDifficulty {
  if (daysRemaining >= 25) return "beginner"
  if (daysRemaining >= 14) return "normal"
  if (daysRemaining >= 6) return "challenging"
  return "mixed"
}

export function difficultyRecommendationLabel(difficulty: PracticeDifficulty): string {
  switch (difficulty) {
    case "beginner":
      return "Beginner foundation"
    case "normal":
      return "Normal questions"
    case "challenging":
      return "Challenging follow-ups"
    case "mixed":
      return "Mixed weak-question review"
  }
}

/** Mean of every numeric value in a scores object (works for both the 6-key
 *  drill SpeakingCheckResponse.scores and the 4-key mock-interview scores). */
export function averageScore(scores: Record<string, number>): number {
  const values = Object.values(scores)
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function deriveStatus(timesPracticed: number, avgScore: number): QuestionProgressStatus {
  if (timesPracticed === 0) return "new"
  if (avgScore >= 4.3) return "strong"
  if (timesPracticed >= 2 && avgScore >= 3.5) return "improving"
  return "practicing"
}

export function summarizeQuestionProgress(
  questions: QuestionBankItem[],
  progressByQuestionId: Record<string, QuestionProgress>,
): QuestionProgressSummary {
  const summary: QuestionProgressSummary = {
    total: questions.length,
    practiced: 0,
    newCount: 0,
    practicing: 0,
    improving: 0,
    strong: 0,
    needsRetry: 0,
  }
  for (const question of questions) {
    const progress = progressByQuestionId[question.id]
    const status =
      !progress || progress.timesPracticed === 0
        ? "new"
        : deriveStatus(progress.timesPracticed, progress.avgScore ?? 0)
    if (status === "new") summary.newCount += 1
    else summary.practiced += 1
    if (status === "practicing") summary.practicing += 1
    if (status === "improving") summary.improving += 1
    if (status === "strong") summary.strong += 1
    if (status === "practicing") summary.needsRetry += 1
  }
  return summary
}

/** Incremental-average update of a question's progress after one new answer
 *  is scored. `existing` is null the first time a question is practiced. */
export function computeNextProgress(
  existing: Pick<QuestionProgress, "timesPracticed" | "avgScore"> | null,
  newScore: number,
  now: Date = new Date(),
): Omit<QuestionProgress, "questionId"> {
  const timesPracticed = (existing?.timesPracticed ?? 0) + 1
  const previousAvg = existing?.avgScore ?? newScore
  const avgScore = previousAvg + (newScore - previousAvg) / timesPracticed
  return {
    timesPracticed,
    avgScore,
    lastScore: newScore,
    lastPracticedAt: now.toISOString(),
    status: deriveStatus(timesPracticed, avgScore),
  }
}

const PRIORITY_WEIGHT: Record<QuestionPriority, number> = {
  must_practice: 30,
  recommended: 15,
  optional: 0,
}

// Days-since-last-practiced contribution is capped so a question practiced
// months ago doesn't permanently dominate the queue over a genuinely weak one.
const MAX_STALENESS_DAYS = 30

/**
 * Deterministic urgency score for "Focus on weak questions" mode — higher
 * sorts first. Never-practiced questions always outrank practiced ones;
 * among practiced questions, lower average score wins, with priority and
 * staleness (days since last practiced) as tiebreakers. No randomness, so
 * ordering is stable and testable.
 */
export function focusScore(
  question: Pick<QuestionBankItem, "priority">,
  progress: QuestionProgress | null,
  now: Date = new Date(),
): number {
  const priorityWeight = PRIORITY_WEIGHT[question.priority]
  if (!progress || progress.timesPracticed === 0) {
    return 1000 + priorityWeight
  }
  const avgScore = progress.avgScore ?? 0
  const urgency = (5 - avgScore) * 20
  const daysSince = progress.lastPracticedAt
    ? Math.min(
        MAX_STALENESS_DAYS,
        Math.floor((now.getTime() - new Date(progress.lastPracticedAt).getTime()) / 86_400_000),
      )
    : MAX_STALENESS_DAYS
  return urgency + priorityWeight + daysSince
}

/**
 * Orders questions for "Focus on weak questions" mode and returns the top
 * `size`. Ties (equal focusScore) keep the bank's own displayOrder so the
 * result is fully deterministic — no RNG, per the "simple deterministic
 * selection first" requirement.
 */
export function selectFocusQueue(
  questions: QuestionBankItem[],
  progressByQuestionId: Record<string, QuestionProgress>,
  size: number,
  now: Date = new Date(),
): QuestionBankItem[] {
  return [...questions]
    .sort((a, b) => {
      const scoreDiff =
        focusScore(a, progressByQuestionId[a.id] ?? null, now) -
        focusScore(b, progressByQuestionId[b.id] ?? null, now)
      if (scoreDiff !== 0) return -scoreDiff
      return a.displayOrder - b.displayOrder
    })
    .slice(0, Math.max(0, size))
}

function dailyRank(
  question: QuestionBankItem,
  progress: QuestionProgress | null,
): [number, number, number, number] {
  const priority =
    question.priority === "must_practice" ? 0 : question.priority === "recommended" ? 1 : 2
  const isNew = !progress || progress.timesPracticed === 0
  const learningState = isNew ? 0 : progress.status === "strong" ? 2 : 1
  const score = isNew ? 0 : (progress.avgScore ?? 0)
  return [priority, learningState, score, question.displayOrder]
}

function compareRank(a: number[], b: number[]): number {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

/**
 * Deterministic Today's 5 selector. Stored ids are accepted first so progress
 * written during a drill cannot reshuffle the same Seoul-day queue on refresh.
 * A short difficulty pool is filled from the remaining mixed bank.
 */
/**
 * localStorage key that pins one Seoul day's Today's 5 per difficulty. The
 * format is load-bearing (existing devices hold these keys) — don't change it.
 */
export function todayQueueStorageKey(dateKey: string, difficulty: PracticeDifficulty): string {
  return `koriai.interview.today:${dateKey}:${difficulty}`
}

/**
 * How many of today's pinned questions were practiced on the same Seoul day.
 * Uses `lastPracticedAt` from the synced progress rows, so it works across
 * devices; a question practiced yesterday doesn't count for today.
 */
export function countDoneToday(
  queueIds: string[],
  progressByQuestionId: Record<string, QuestionProgress>,
  now: Date = new Date(),
  timeZone = INTERVIEW_TIME_ZONE,
): { done: number; total: number } {
  const unique = [...new Set(queueIds)]
  const done = unique.filter((id) =>
    wasPracticedToday(progressByQuestionId[id], now, timeZone),
  ).length
  return { done, total: unique.length }
}

/** True when the progress row's last practice falls on `now`'s day in `timeZone`. */
export function wasPracticedToday(
  progress: QuestionProgress | undefined,
  now: Date = new Date(),
  timeZone = INTERVIEW_TIME_ZONE,
): boolean {
  const practicedAt = progress?.lastPracticedAt
  if (!practicedAt) return false
  const date = new Date(practicedAt)
  return (
    !Number.isNaN(date.getTime()) && dateKeyInZone(date, timeZone) === dateKeyInZone(now, timeZone)
  )
}

export function selectTodaysQueue(
  questions: QuestionBankItem[],
  progressByQuestionId: Record<string, QuestionProgress>,
  difficulty: PracticeDifficulty,
  size = 5,
  storedIds: string[] = [],
): QuestionBankItem[] {
  const wanted = Math.max(0, size)
  const byId = new Map(questions.map((question) => [question.id, question]))
  const selected: QuestionBankItem[] = []
  const selectedIds = new Set<string>()

  for (const id of storedIds) {
    const question = byId.get(id)
    if (!question || selectedIds.has(id) || selected.length >= wanted) continue
    selected.push(question)
    selectedIds.add(id)
  }

  const ordered = [...questions].sort((a, b) =>
    compareRank(
      dailyRank(a, progressByQuestionId[a.id] ?? null),
      dailyRank(b, progressByQuestionId[b.id] ?? null),
    ),
  )
  const preferred =
    difficulty === "mixed"
      ? ordered
      : ordered.filter((question) => question.difficulty === difficulty)
  const fallback =
    difficulty === "mixed" ? [] : ordered.filter((question) => question.difficulty !== difficulty)

  for (const question of [...preferred, ...fallback]) {
    if (selected.length >= wanted) break
    if (selectedIds.has(question.id)) continue
    selected.push(question)
    selectedIds.add(question.id)
  }
  return selected
}

export function difficultyCounts(
  questions: QuestionBankItem[],
): Record<PracticeDifficulty, number> {
  return {
    beginner: questions.filter((question) => question.difficulty === "beginner").length,
    normal: questions.filter((question) => question.difficulty === "normal").length,
    challenging: questions.filter((question) => question.difficulty === "challenging").length,
    mixed: questions.length,
  }
}

export function scoreImprovement(firstScore: number, retryScore: number): number {
  return Math.round((retryScore - firstScore) * 10) / 10
}

export function shouldRecommendRetry(score: number): boolean {
  return score < 3.5
}

export type RetryFlowState = "ready" | "correction" | "retrying" | "completed"
export type RetryFlowEvent = "score" | "retry" | "retry_scored" | "skip"

export function transitionRetryFlow(state: RetryFlowState, event: RetryFlowEvent): RetryFlowState {
  if (state === "ready" && event === "score") return "correction"
  if (state === "correction" && event === "retry") return "retrying"
  if (state === "correction" && event === "skip") return "completed"
  if (state === "retrying" && event === "retry_scored") return "correction"
  return state
}

export function duplicateVersionLabel(label: string, existingLabels: string[]): boolean {
  const normalized = label.trim().toLocaleLowerCase()
  return existingLabels.some((existing) => existing.trim().toLocaleLowerCase() === normalized)
}

export function suggestUniqueVersionLabel(preferred: string, existingLabels: string[]): string {
  if (!duplicateVersionLabel(preferred, existingLabels)) return preferred
  let suffix = 2
  while (duplicateVersionLabel(`${preferred} ${suffix}`, existingLabels)) suffix += 1
  return `${preferred} ${suffix}`
}

export interface ScriptVersionRef {
  id: string
  isActive: boolean
}

/**
 * "Only one active script version at a time": given the current versions and
 * the id being activated, returns the ids that must be flipped to inactive.
 * Pure so the invariant is testable without a database — lib/api/interview.ts
 * runs this then issues the actual updates.
 */
export function versionsToDeactivate(versions: ScriptVersionRef[], activatingId: string): string[] {
  return versions.filter((v) => v.isActive && v.id !== activatingId).map((v) => v.id)
}

/** The N lowest-scoring practiced questions — the dashboard's "most difficult
 *  questions" list. Unpracticed questions are excluded (nothing to rank yet). */
export function mostDifficultQuestions(
  questions: QuestionBankItem[],
  progressByQuestionId: Record<string, QuestionProgress>,
  size: number,
): QuestionBankItem[] {
  return questions
    .filter((q) => (progressByQuestionId[q.id]?.timesPracticed ?? 0) > 0)
    .sort((a, b) => {
      const scoreA = progressByQuestionId[a.id]?.avgScore ?? 0
      const scoreB = progressByQuestionId[b.id]?.avgScore ?? 0
      return scoreA - scoreB
    })
    .slice(0, Math.max(0, size))
}
