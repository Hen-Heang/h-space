// Mission persistence + evidence tests for the work_message step.
//
// SAFETY: `@/lib/supabase` and every other lib/api dependency are replaced by
// in-memory fakes before missions.ts is imported — nothing can reach a live
// project. Synthetic data only.

import { beforeEach, describe, expect, it, vi } from "vitest"

type Row = Record<string, unknown>
type Err = { code: string; message: string } | null

const db: Record<string, Row[]> = {}
let workTypeAllowed = true
let seq = 0

const OLD_TYPES = [
  "vocab_review",
  "correction_review",
  "daily_phrase",
  "scenario",
  "listening",
  "interview",
  "phrase_review",
]

function table(name: string) {
  db[name] ??= []
  return db[name]
}

function builder(name: string) {
  const filters: Array<(r: Row) => boolean> = []
  let mode: "select" | "insert" | "update" = "select"
  let payload: Row | Row[] | null = null
  let lim = Infinity

  const run = (): { data: unknown; error: Err } => {
    if (mode === "insert") {
      const rows = Array.isArray(payload) ? payload : [payload as Row]
      if (name === "kori_daily_mission_items" && !workTypeAllowed) {
        if (rows.some((r) => !OLD_TYPES.includes(r.item_type as string)))
          return { data: null, error: { code: "23514", message: "check violation" } }
      }
      const stored = rows.map((r) => ({
        id: `${name}-${++seq}`,
        created_at: new Date(Date.UTC(2026, 10, 6, 0, 0, seq)).toISOString(),
        status: "pending",
        progress_count: 0,
        completed_at: null,
        ...r,
      }))
      table(name).push(...stored)
      return { data: Array.isArray(payload) ? stored : stored[0], error: null }
    }
    const matched = table(name).filter((r) => filters.every((f) => f(r)))
    if (mode === "update") {
      for (const r of matched) Object.assign(r, payload)
      return { data: matched, error: null }
    }
    return { data: matched.slice(0, lim), error: null }
  }

  const b = {
    select: () => b,
    insert: (rows: Row | Row[]) => {
      mode = "insert"
      payload = rows
      return b
    },
    update: (row: Row) => {
      mode = "update"
      payload = row
      return b
    },
    eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), b),
    in: (k: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[k])), b),
    gte: (k: string, v: string) => (filters.push((r) => String(r[k]) >= v), b),
    lte: (k: string, v: string) => (filters.push((r) => String(r[k]) <= v), b),
    order: () => b,
    limit: (n: number) => ((lim = n), b),
    maybeSingle: async () => {
      const { data, error } = run()
      return { data: Array.isArray(data) ? (data[0] ?? null) : data, error }
    },
    single: async () => {
      const { data, error } = run()
      return { data: Array.isArray(data) ? data[0] : data, error }
    },
    then: (resolve: (v: { data: unknown; error: Err }) => unknown) => resolve(run()),
  }
  return b
}

vi.mock("@/lib/supabase", () => ({ supabase: { from: (name: string) => builder(name) } }))
vi.mock("@/lib/auth-store", () => ({ requireUserId: () => "user-a", getUserId: () => "user-a" }))

const workCards = vi.fn(async () => [{ id: "work-1" }, { id: "work-2" }])
vi.mock("./phrasebook", () => ({
  phrasebookApi: {
    getDuePhrases: async () => [],
    getWorkMessageCards: () => workCards(),
  },
}))
vi.mock("./vocab", () => ({
  vocabApi: {
    getDueWords: async () =>
      Array.from({ length: 20 }, (_, i) => ({ id: `v${i}`, term: "t", meaning: "m" })),
    getDueCount: async () => 1856,
  },
}))
vi.mock("./learning", () => ({
  correctionApi: { getDueReviews: async () => [] },
  dailyPhraseApi: { getToday: async () => ({ learned: true }) },
  scenarioApi: { getList: async () => [] },
}))
vi.mock("./listening", () => ({ listeningApi: { getTopics: async () => [] } }))
vi.mock("./skills", () => ({ skillsApi: { getWeakSkills: async () => [] } }))

import { missionsApi } from "./missions"

beforeEach(() => {
  for (const key of Object.keys(db)) delete db[key]
  workTypeAllowed = true
  seq = 0
  table("kori_profiles").push({ timezone: "Asia/Seoul", korean_level: "BEGINNER" })
  table("kori_korean_coach_preferences").push({
    main_goal: "workplace",
    daily_practice_goal_minutes: 10,
  })
})

describe("missionsApi.getOrCreateToday with the work focus", () => {
  it("persists a work_message step pointing at a work card, within the budget", async () => {
    const mission = await missionsApi.getOrCreateToday()
    const work = mission.items.find((i) => i.type === "work_message")
    expect(work?.referenceIds).toHaveLength(1)
    expect(["work-1", "work-2"]).toContain(work!.referenceIds[0])
    const vocab = mission.items.find((i) => i.type === "vocab_review")!
    expect(vocab.targetCount).toBeLessThan(20)
  })

  it("returns the same persisted mission on a refresh — nothing is regenerated", async () => {
    const first = await missionsApi.getOrCreateToday()
    workCards.mockResolvedValueOnce([{ id: "work-9" }])
    const second = await missionsApi.getOrCreateToday()
    expect(second.id).toBe(first.id)
    expect(second.items.map((i) => i.id)).toEqual(first.items.map((i) => i.id))
    expect(table("kori_daily_missions")).toHaveLength(1)
  })

  it("still creates today's items when the database doesn't know work_message yet", async () => {
    workTypeAllowed = false
    const mission = await missionsApi.getOrCreateToday()
    expect(mission.items.length).toBeGreaterThan(0)
    expect(mission.items.some((i) => i.type === "work_message")).toBe(false)
    expect(table("kori_daily_missions")).toHaveLength(1)
  })
})

describe("missionsApi.refreshProgress for work_message", () => {
  async function setup() {
    const mission = await missionsApi.getOrCreateToday()
    const work = mission.items.find((i) => i.type === "work_message")!
    table("kori_phrase_cards").push({ id: work.referenceIds[0], user_id: "user-a", active: true })
    return { mission, work }
  }

  it("does not complete the step without a graded reply (opening or listening isn't evidence)", async () => {
    const { work } = await setup()
    // A listening attempt is not a reply.
    table("kori_phrase_attempts").push({
      id: "a1",
      user_id: "user-a",
      phrase_id: work.referenceIds[0],
      practice_mode: "listen",
      task_completed: true,
      created_at: "2099-01-01T00:00:00.000Z",
    })
    const refreshed = await missionsApi.refreshProgress()
    expect(refreshed!.items.find((i) => i.id === work.id)!.status).not.toBe("completed")
  })

  it("completes it after a graded reply to that card", async () => {
    const { work } = await setup()
    table("kori_phrase_attempts").push({
      id: "a2",
      user_id: "user-a",
      phrase_id: work.referenceIds[0],
      practice_mode: "speak",
      task_completed: true,
      created_at: "2099-01-01T00:00:00.000Z",
    })
    const refreshed = await missionsApi.refreshProgress()
    expect(refreshed!.items.find((i) => i.id === work.id)!.status).toBe("completed")
  })

  it("ignores a reply made before the mission was created", async () => {
    const { work } = await setup()
    table("kori_phrase_attempts").push({
      id: "a3",
      user_id: "user-a",
      phrase_id: work.referenceIds[0],
      practice_mode: "speak",
      task_completed: true,
      created_at: "2000-01-01T00:00:00.000Z",
    })
    const refreshed = await missionsApi.refreshProgress()
    expect(refreshed!.items.find((i) => i.id === work.id)!.status).not.toBe("completed")
  })

  it("accepts any graded reply today when the picked card was deleted", async () => {
    const mission = await missionsApi.getOrCreateToday()
    const work = mission.items.find((i) => i.type === "work_message")!
    // No card row: it was deleted after the mission was built.
    table("kori_phrase_attempts").push({
      id: "a4",
      user_id: "user-a",
      phrase_id: "some-other-card",
      practice_mode: "speak",
      task_completed: true,
      created_at: "2099-01-01T00:00:00.000Z",
    })
    const refreshed = await missionsApi.refreshProgress()
    expect(refreshed!.items.find((i) => i.id === work.id)!.status).toBe("completed")
  })
})
