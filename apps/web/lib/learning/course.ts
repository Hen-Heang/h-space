// One vocabulary for "where am I in this material?" across Foundations
// lessons, Reading units, and Phrasebook cards. Each area keeps its own
// progress data; this only maps it onto the same five display states and picks
// what "Continue" should open. Pure, no I/O — the areas' progress stores stay
// the source of truth.

export type LearnStatus = "new" | "in_progress" | "review_due" | "completed" | "mastered"

export const LEARN_STATUS_LABEL: Record<LearnStatus, string> = {
  new: "New",
  in_progress: "In progress",
  review_due: "Review due",
  completed: "Completed",
  mastered: "Mastered",
}

/** Foundations lesson: `completed` once passed, `progress` = best attempt %. */
export function lessonStatus(lesson: { completed: boolean; progress: number }): LearnStatus {
  if (lesson.completed) return "completed"
  return lesson.progress > 0 ? "in_progress" : "new"
}

/** Reading unit: not_started → New, in_progress, completed. */
export function readingStatus(
  entry: { status: "not_started" | "in_progress" | "completed" } | undefined,
): LearnStatus {
  if (entry?.status === "completed") return "completed"
  if (entry?.status === "in_progress") return "in_progress"
  return "new"
}

/**
 * Phrasebook card. A due review outranks the mastery state, since "review
 * due" is the actionable one.
 */
export function phraseStatus(
  progress: { state: "new" | "learning" | "mastered"; nextReviewAt: string } | null | undefined,
  now: Date = new Date(),
): LearnStatus {
  if (!progress) return "new"
  if (new Date(progress.nextReviewAt).getTime() <= now.getTime()) return "review_due"
  if (progress.state === "mastered") return "mastered"
  return progress.state === "new" ? "new" : "in_progress"
}

/** The lesson "Continue" opens: the first one not yet completed, in order. */
export function nextIncompleteLesson<T extends { completed: boolean }>(
  lessons: T[],
): T | undefined {
  return lessons.find((lesson) => !lesson.completed)
}

/** The lesson after `currentId` in the same ordered list, if any. */
export function lessonAfter<T extends { id: string }>(
  lessons: T[],
  currentId: string,
): T | undefined {
  const index = lessons.findIndex((lesson) => lesson.id === currentId)
  return index === -1 ? undefined : lessons[index + 1]
}

/**
 * The reading unit "Continue" opens: the first one already started, else the
 * first one not started yet. Undefined when everything is completed.
 */
export function continueReadingUnit<T extends { id: string }>(
  units: T[],
  progress: Record<string, { status: "not_started" | "in_progress" | "completed" } | undefined>,
): T | undefined {
  return (
    units.find((unit) => progress[unit.id]?.status === "in_progress") ??
    units.find((unit) => (progress[unit.id]?.status ?? "not_started") === "not_started")
  )
}
