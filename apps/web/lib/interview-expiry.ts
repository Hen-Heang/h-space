/**
 * What the mock interview should do when its exam timer reports time is up.
 *
 * `ExamTimer` calls `onExpire` on every tick once time runs out, so that a
 * session still ends as soon as the examiner finishes streaming. Without a
 * latch, a failed evaluation would be retried on the next tick, and the next,
 * paying for two AI calls (evaluate + chat fallback) about once a second for
 * as long as the page stays open.
 *
 * - `ignore`: time-up was already handled; any retry is the candidate's tap.
 * - `wait`: the examiner is streaming or an evaluation is running; try again
 *   next tick without using up the one automatic attempt.
 * - `nothing-to-score`: no answers, so don't pay to score an empty exam.
 * - `evaluate`: run the one automatic evaluation.
 */
export type ExamExpiryAction = "ignore" | "wait" | "nothing-to-score" | "evaluate"

export function decideExamExpiry({
  alreadyHandled,
  busy,
  answeredCount,
}: {
  alreadyHandled: boolean
  busy: boolean
  answeredCount: number
}): ExamExpiryAction {
  if (alreadyHandled) return "ignore"
  if (busy) return "wait"
  if (answeredCount === 0) return "nothing-to-score"
  return "evaluate"
}

/**
 * Exam mode normally wants a few answers before an early finish. Once time is
 * up that rule no longer applies: any answered exam can be scored, and the
 * button is the candidate's way to retry after a failed evaluation.
 */
export function canFinishInterview({
  answeredCount,
  minAnswersBeforeFinish,
  timeUp,
}: {
  answeredCount: number
  minAnswersBeforeFinish: number
  timeUp: boolean
}): boolean {
  if (timeUp) return answeredCount > 0
  return answeredCount >= minAnswersBeforeFinish
}
