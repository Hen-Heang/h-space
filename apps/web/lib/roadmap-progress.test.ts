import { describe, expect, it } from "vitest"

import { getRoadmapProgress, parseCompletedTopics, ROADMAP_PHASES } from "./roadmap-progress"

/** Every topic id of a 1-based phase. */
const phaseIds = (phase: number) =>
  Array.from({ length: ROADMAP_PHASES[phase - 1].topics }, (_, i) => `p${phase}-t${i + 1}`)

describe("parseCompletedTopics", () => {
  it("reads a stored id list", () => {
    expect(parseCompletedTopics('["p1-t1","p1-t2"]')).toEqual(new Set(["p1-t1", "p1-t2"]))
  })

  it("treats missing or malformed storage as no progress", () => {
    expect(parseCompletedTopics(null).size).toBe(0)
    expect(parseCompletedTopics("").size).toBe(0)
    expect(parseCompletedTopics("{not json").size).toBe(0)
    expect(parseCompletedTopics('{"p1-t1":true}').size).toBe(0)
    expect(parseCompletedTopics('["p1-t1", 7, null]')).toEqual(new Set(["p1-t1"]))
  })
})

describe("getRoadmapProgress", () => {
  it("starts at phase 1 with nothing done", () => {
    expect(getRoadmapProgress(new Set())).toEqual({
      phase: 1,
      title: "Java Foundations",
      phasePct: 0,
      overallPct: 0,
    })
  })

  it("reports the first unfinished phase and its share done", () => {
    const done = new Set([
      ...phaseIds(1),
      "p2-t1",
      "p2-t2",
      "p2-t3",
      "p2-t4",
      "p2-t5",
      "p2-t6",
      "p2-t7",
    ])
    expect(getRoadmapProgress(done)).toMatchObject({
      phase: 2,
      title: "Java Advanced",
      phasePct: 50, // 7 of 14
      overallPct: 21, // 21 of 102
    })
  })

  it("matches the roadmap page's 102 topics, so finishing everything reaches 100%", () => {
    // The old teaser hard-coded 105 and topped out at 97%.
    expect(ROADMAP_PHASES.reduce((sum, p) => sum + p.topics, 0)).toBe(102)
  })

  it("moves past a finished phase even when a later one was started first", () => {
    const done = new Set(["p3-t1", ...phaseIds(1)])
    expect(getRoadmapProgress(done)).toMatchObject({ phase: 2, phasePct: 0 })
  })

  it("stays on the last phase at 100% once everything is done", () => {
    const all = new Set(ROADMAP_PHASES.flatMap((_, i) => phaseIds(i + 1)))
    expect(getRoadmapProgress(all)).toEqual({
      phase: 7,
      title: "System Design",
      phasePct: 100,
      overallPct: 100,
    })
  })

  it("ignores ids that aren't roadmap topics", () => {
    const done = new Set(["p1-t1", "p9-t1", "p1-t99", "anything"])
    expect(getRoadmapProgress(done).overallPct).toBe(1) // 1 of 102
  })
})
