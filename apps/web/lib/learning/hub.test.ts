import { describe, expect, it } from "vitest"

import type { DailyMission, MissionItem } from "@/lib/api"
import { hubStepHref, selectHubContinue, summarizeMissionProgress } from "./hub"

function item(overrides: Partial<MissionItem> = {}): MissionItem {
  return {
    id: "i1",
    type: "listening",
    title: "Listening",
    reason: "",
    targetCount: 1,
    referenceIds: [],
    skillCodes: [],
    estimatedMinutes: 5,
    status: "pending",
    progressCount: 0,
    completedAt: null,
    ...overrides,
  }
}

function mission(items: MissionItem[]): DailyMission {
  return {
    id: "m1",
    dateKey: "2026-11-02",
    title: "Today",
    reason: "",
    estimatedMinutes: 20,
    focusSkillCodes: [],
    createdAt: "2026-11-02T00:00:00Z",
    items,
  }
}

describe("selectHubContinue", () => {
  it("asks to start when there is no mission or it has no steps", () => {
    expect(selectHubContinue(null, 20)).toEqual({ kind: "start" })
    expect(selectHubContinue(mission([]), 20)).toEqual({ kind: "start" })
  })

  it("picks the first step that isn't completed, with its position", () => {
    const steps = [
      item({ id: "a", status: "completed" }),
      item({ id: "b", status: "in_progress" }),
      item({ id: "c" }),
    ]
    const result = selectHubContinue(mission(steps), 0)
    expect(result).toMatchObject({ kind: "next", position: 2, total: 3 })
    expect(result.kind === "next" && result.item.id).toBe("b")
  })

  it("offers an extra review batch only when the plan is done and words are due", () => {
    const done = mission([item({ status: "completed" })])
    expect(selectHubContinue(done, 20)).toEqual({ kind: "extra-review", batch: 20 })
    expect(selectHubContinue(done, 0)).toEqual({ kind: "done" })
  })
})

describe("summarizeMissionProgress", () => {
  it("counts completed steps and the minutes still left", () => {
    const result = summarizeMissionProgress(
      mission([
        item({ status: "completed", estimatedMinutes: 10 }),
        item({ status: "in_progress", estimatedMinutes: 6 }),
        item({ estimatedMinutes: 4 }),
      ]),
    )
    expect(result).toEqual({ completed: 1, total: 3, remainingMinutes: 10 })
  })
})

describe("hubStepHref", () => {
  it("hands scenarios to /practice", () => {
    expect(hubStepHref(item({ type: "scenario" }), null)).toBe("/practice")
  })

  it("uses the step's own link otherwise, falling back to /practice", () => {
    expect(hubStepHref(item({ type: "listening" }), "/listening?topic=x")).toBe(
      "/listening?topic=x",
    )
    expect(hubStepHref(item({ type: "interview" }), null)).toBe("/practice")
  })
})
