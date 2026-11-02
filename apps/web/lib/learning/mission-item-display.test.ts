import { describe, expect, it } from "vitest"

import type { MissionItem } from "@/lib/api"
import { missionItemHref } from "./mission-item-display"

function item(overrides: Partial<MissionItem>): MissionItem {
  return {
    id: "i1",
    type: "listening",
    title: "",
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

describe("missionItemHref", () => {
  it("opens the vocabulary review session directly", () => {
    expect(missionItemHref(item({ type: "vocab_review" }))).toBe("/vocab?review=session")
  })

  it("sends the daily phrase to the Phrases tab, where today's phrase is shown", () => {
    expect(missionItemHref(item({ type: "daily_phrase" }))).toBe("/vocab?tab=phrases")
  })

  it("carries a listening topic and leaves scenarios to their async handler", () => {
    expect(missionItemHref(item({ type: "listening", referenceIds: ["office & lunch"] }))).toBe(
      "/listening?topic=office%20%26%20lunch",
    )
    expect(missionItemHref(item({ type: "listening" }))).toBe("/listening")
    expect(missionItemHref(item({ type: "scenario" }))).toBeNull()
  })
})
