import { describe, expect, it } from "vitest"

import { canFinishInterview, decideExamExpiry } from "./interview-expiry"

describe("decideExamExpiry", () => {
  it("evaluates once when time is up and there are answers", () => {
    expect(decideExamExpiry({ alreadyHandled: false, busy: false, answeredCount: 3 })).toBe(
      "evaluate",
    )
  })

  it("ignores every later tick, so a failed evaluation is not retried automatically", () => {
    expect(decideExamExpiry({ alreadyHandled: true, busy: false, answeredCount: 3 })).toBe("ignore")
    expect(decideExamExpiry({ alreadyHandled: true, busy: true, answeredCount: 3 })).toBe("ignore")
  })

  it("waits without using up the attempt while the examiner or an evaluation is busy", () => {
    expect(decideExamExpiry({ alreadyHandled: false, busy: true, answeredCount: 3 })).toBe("wait")
    expect(decideExamExpiry({ alreadyHandled: false, busy: true, answeredCount: 0 })).toBe("wait")
  })

  it("does not score an exam with no answers", () => {
    expect(decideExamExpiry({ alreadyHandled: false, busy: false, answeredCount: 0 })).toBe(
      "nothing-to-score",
    )
  })
})

describe("canFinishInterview", () => {
  it("keeps the minimum-answers rule before time is up", () => {
    expect(canFinishInterview({ answeredCount: 3, minAnswersBeforeFinish: 4, timeUp: false })).toBe(
      false,
    )
    expect(canFinishInterview({ answeredCount: 4, minAnswersBeforeFinish: 4, timeUp: false })).toBe(
      true,
    )
  })

  it("lets any answered exam be finished (or retried) once time is up", () => {
    expect(canFinishInterview({ answeredCount: 1, minAnswersBeforeFinish: 4, timeUp: true })).toBe(
      true,
    )
  })

  it("never offers to score an empty exam", () => {
    expect(canFinishInterview({ answeredCount: 0, minAnswersBeforeFinish: 1, timeUp: true })).toBe(
      false,
    )
  })
})
