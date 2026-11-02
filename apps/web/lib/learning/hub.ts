import type { DailyMission, MissionItem } from "@/lib/api"

// Selection logic for the Learning Hub (`/learn`). Pure reads of the daily
// mission the engine already built (lib/learning/mission-engine.ts) — never a
// second priority calculation. Kept out of the components so it's testable.

export type HubContinue =
  /** No mission row yet — /practice creates it on open. */
  | { kind: "start" }
  /** The engine's highest-weighted step that isn't done yet. */
  | { kind: "next"; item: MissionItem; position: number; total: number }
  /** Plan finished, but the SRS backlog still has a batch to offer. */
  | { kind: "extra-review"; batch: number }
  /** Plan finished and nothing else is due. */
  | { kind: "done" }

/**
 * What the hub's Continue card should offer. `nextBatch` is
 * `nextReviewBatchSize(dueCount)` from the caller, so this stays free of the
 * API layer.
 */
export function selectHubContinue(mission: DailyMission | null, nextBatch: number): HubContinue {
  if (!mission || mission.items.length === 0) return { kind: "start" }
  const index = mission.items.findIndex((item) => item.status !== "completed")
  if (index === -1)
    return nextBatch > 0 ? { kind: "extra-review", batch: nextBatch } : { kind: "done" }
  return {
    kind: "next",
    item: mission.items[index],
    position: index + 1,
    total: mission.items.length,
  }
}

export type MissionProgress = {
  completed: number
  total: number
  /** Estimated minutes of the steps not completed yet. */
  remainingMinutes: number
}

export function summarizeMissionProgress(mission: DailyMission): MissionProgress {
  let completed = 0
  let remainingMinutes = 0
  for (const item of mission.items) {
    if (item.status === "completed") completed += 1
    else remainingMinutes += item.estimatedMinutes
  }
  return { completed, total: mission.items.length, remainingMinutes }
}

/**
 * Where the hub sends a step. Vocabulary opens the review straight away
 * (`?review=session`, the same param the "Review N more" link uses) instead of
 * the long /vocab page; a scenario hands off to /practice, which creates the
 * conversation + session first.
 */
export function hubStepHref(item: MissionItem, fallback: string | null): string {
  if (item.type === "vocab_review") return "/vocab?review=session"
  if (item.type === "scenario") return "/practice"
  return fallback ?? "/practice"
}
