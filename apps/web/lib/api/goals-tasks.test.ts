// Integration tests for the task mutation layer.
//
// SAFETY: `@/lib/supabase` is replaced wholesale by an in-memory fake before
// the module under test is imported, and `assertNoLiveDatabase()` below fails
// the suite outright if a real Supabase URL is present in the environment.
// Nothing here can reach a live project — no network client is ever built.

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Task } from "@/lib/tasks"

// ── Test-environment guard ──────────────────────────────────────────────────

/**
 * These tests mutate task rows. If a real project URL is configured we refuse
 * to run rather than risk anyone wiring the fake up to a live client later.
 * Only an explicitly local/test host is ever acceptable here.
 */
function assertNoLiveDatabase(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  if (!url) return
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/.test(url)
  const isExplicitTestProject = process.env.SUPABASE_TEST_PROJECT === "true"
  if (!isLocal && !isExplicitTestProject) {
    throw new Error(
      `Refusing to run mutation tests against a non-local Supabase URL (${url}). ` +
        `Use a local stack, or set SUPABASE_TEST_PROJECT=true for a dedicated test project.`,
    )
  }
}

assertNoLiveDatabase()

// ── In-memory Supabase fake ─────────────────────────────────────────────────

interface Captured {
  table: string
  op: "update" | "insert" | "delete"
  payload: Record<string, unknown> | null
  eq: [string, unknown][]
}

const captured: Captured[] = []
/** Row the fake returns from `.single()`; tests override per case. */
let returnedRow: Record<string, unknown> = {}
let failNext: { message: string } | null = null

function builder(table: string, op: Captured["op"], payload: Record<string, unknown> | null) {
  const entry: Captured = { table, op, payload, eq: [] }
  captured.push(entry)
  const chain = {
    eq: (col: string, val: unknown) => {
      entry.eq.push([col, val])
      return chain
    },
    select: () => chain,
    single: async () => {
      if (failNext) {
        const error = failNext
        failNext = null
        return { data: null, error }
      }
      return { data: { ...returnedRow, ...payload }, error: null }
    },
    then: (resolve: (v: { error: unknown }) => unknown) =>
      resolve({ error: failNext ? ((failNext = null), { message: "failed" }) : null }),
  }
  return chain
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      update: (payload: Record<string, unknown>) => builder(table, "update", payload),
      insert: (payload: Record<string, unknown>) => builder(table, "insert", payload),
      delete: () => builder(table, "delete", null),
      select: () => builder(table, "update", null),
    }),
  },
}))

vi.mock("@/lib/auth-store", () => ({
  getUserId: () => "user-1",
  requireUserId: () => "user-1",
}))

const { tasksApi } = await import("./goals")

const lastUpdate = (): Captured => {
  const update = [...captured].reverse().find((c) => c.op === "update" && c.payload)
  if (!update) throw new Error("no update captured")
  return update
}

let seq = 0
const task = (overrides: Partial<Task> = {}): Task => ({
  id: `t${++seq}`,
  description: "",
  completed: false,
  user_id: "user-1",
  title: "Task",
  start_date: "2026-07-25",
  end_date: "2026-07-25",
  daily_start_time: "09:00",
  daily_end_time: "10:00",
  is_anytime: false,
  ...overrides,
})

beforeEach(() => {
  captured.length = 0
  returnedRow = {}
  failNext = null
})

// ── The canonical status/completed sync rule ────────────────────────────────

describe("tasksApi.setStatus", () => {
  it("always writes `completed` alongside `status`", async () => {
    for (const status of ["backlog", "scheduled", "in_progress", "blocked"] as const) {
      await tasksApi.setStatus("t1", status)
      const payload = lastUpdate().payload!
      expect(payload.status).toBe(status)
      // The invariant: completed === (status === 'completed'), always.
      expect(payload.completed).toBe(false)
    }

    await tasksApi.setStatus("t1", "completed")
    expect(lastUpdate().payload).toMatchObject({ status: "completed", completed: true })
  })

  it("stores a blocked reason only for the blocked status", async () => {
    await tasksApi.setStatus("t1", "blocked", "  waiting on review  ")
    expect(lastUpdate().payload!.blocked_reason).toBe("waiting on review")

    // Leaving `blocked` must clear the stale note rather than leave it dangling.
    await tasksApi.setStatus("t1", "in_progress", "waiting on review")
    expect(lastUpdate().payload!.blocked_reason).toBeNull()
  })

  it("treats a whitespace-only blocked reason as absent", async () => {
    await tasksApi.setStatus("t1", "blocked", "   ")
    expect(lastUpdate().payload!.blocked_reason).toBeNull()
  })
})

describe("tasksApi.setCompleted", () => {
  it("reopens a future-dated task as scheduled and a past-dated one as backlog", async () => {
    await tasksApi.setCompleted(
      task({ start_date: "2026-07-30", end_date: "2026-07-30" }),
      false,
      "2026-07-22",
    )
    expect(lastUpdate().payload).toMatchObject({ status: "scheduled", completed: false })

    await tasksApi.setCompleted(
      task({ start_date: "2026-07-01", end_date: "2026-07-01" }),
      false,
      "2026-07-22",
    )
    expect(lastUpdate().payload).toMatchObject({ status: "backlog", completed: false })
  })
})

// ── Regression: moveToBacklog left a stale status ───────────────────────────

describe("tasksApi.moveToBacklog", () => {
  it("moves the status to backlog, not just the time slot", async () => {
    // Before the fix this wrote only the slot fields, so a task that had been
    // `scheduled` kept that status: the row badge said "Scheduled" while its
    // schedule column said "Unscheduled", and a status=scheduled filter still
    // matched tasks sitting in the backlog.
    await tasksApi.moveToBacklog(task({ status: "scheduled" }))
    const payload = lastUpdate().payload!

    expect(payload.status).toBe("backlog")
    expect(payload.completed).toBe(false)
    expect(payload.daily_start_time).toBeNull()
    expect(payload.daily_end_time).toBeNull()
    expect(payload.is_anytime).toBe(true)
  })

  it("keeps the task's day so it stays visible on the calendar", async () => {
    await tasksApi.moveToBacklog(task())
    const payload = lastUpdate().payload!
    // Deliberately untouched — the product rule is "keeps its day, drops the slot".
    expect(payload).not.toHaveProperty("start_date")
    expect(payload).not.toHaveProperty("end_date")
  })

  it("counts as a slip and bumps reschedule_count", async () => {
    await tasksApi.moveToBacklog(task({ reschedule_count: 2 }))
    expect(lastUpdate().payload).toMatchObject({
      reschedule_count: 3,
      scheduling_source: "rescheduled",
    })
  })
})

// ── reschedule_count means "times this slipped", not "times it was edited" ──

describe("reschedule_count", () => {
  it("is bumped by reschedule but never by a plain update", async () => {
    await tasksApi.reschedule(task({ reschedule_count: 0 }), { start_date: "2026-07-26" })
    expect(lastUpdate().payload!.reschedule_count).toBe(1)

    await tasksApi.update("t1", { description: "edited copy" })
    expect(lastUpdate().payload).not.toHaveProperty("reschedule_count")

    await tasksApi.setStatus("t1", "completed")
    expect(lastUpdate().payload).not.toHaveProperty("reschedule_count")
  })

  it("starts from zero when the column is absent on a legacy row", async () => {
    await tasksApi.reschedule({ id: "t-legacy" } as Task, { start_date: "2026-07-26" })
    expect(lastUpdate().payload!.reschedule_count).toBe(1)
  })
})

// ── Errors must surface, never be swallowed into a fake success ─────────────

describe("error propagation", () => {
  it("throws when the update fails instead of returning a partial row", async () => {
    failNext = { message: "permission denied for table tasks" }
    await expect(tasksApi.setStatus("t1", "completed")).rejects.toBeTruthy()
  })
})
