import { describe, expect, it } from "vitest"

import { nextGoalFormStep, prevGoalFormStep } from "./goal-form"

describe("goal form steps", () => {
  it("sends a travel goal through the travel step to the submit step", () => {
    expect(nextGoalFormStep("basics", "travel")).toBe("travel")
    // The bug: "next" from the travel step used to land on the travel step again.
    expect(nextGoalFormStep("travel", "travel")).toBe("advanced")
    expect(prevGoalFormStep("advanced", "travel")).toBe("travel")
    expect(prevGoalFormStep("travel", "travel")).toBe("basics")
  })

  it("skips the travel step for every other goal type", () => {
    for (const type of ["general", "finance", "education", "financial"]) {
      expect(nextGoalFormStep("basics", type)).toBe("advanced")
      expect(prevGoalFormStep("advanced", type)).toBe("basics")
    }
  })
})
