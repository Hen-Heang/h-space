import { describe, expect, it } from "vitest"
import { registerReadTools, registerWriteTools } from "./index"
import { captureRegisteredTools, fakeContext, fakeDb, fakeQuery } from "./test-support"

// Layer 2 (design doc §14): drives each tool's registered handler directly
// against a fake, chainable Supabase query builder — no network, no real
// McpServer/transport.

describe("registerReadTools", () => {
  it("registers all read tools as read-only and non-destructive", () => {
    const { fakeServer, tools } = captureRegisteredTools()
    registerReadTools(fakeServer, fakeContext(fakeDb({})))

    expect([...tools.keys()].sort()).toEqual(
      [
        "get_goal",
        "get_goal_tasks",
        "get_learning_progress",
        "get_today_overview",
        "get_weekly_progress",
        "list_goals",
        "list_tasks",
        "list_knowledge_projects",
        "list_project_notes",
        "get_project_note",
      ].sort(),
    )
    for (const tool of tools.values()) {
      expect(tool.config.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      })
    }
  })

  it("list_goals maps rows, computes isOwner/isStarred, and reports total/truncated", async () => {
    const { fakeServer, tools } = captureRegisteredTools()
    const goalRow = {
      id: "goal-1",
      title: "Learn Korean",
      description: "",
      status: "active",
      target_date: null,
      health_status: "on_track",
      user_id: "someone-else",
      goal_stars: [{ user_id: "user-1" }],
      tasks: [
        { id: "t1", completed: true },
        { id: "t2", completed: false },
      ],
      goal_key_results: [],
    }
    registerReadTools(
      fakeServer,
      fakeContext(fakeDb({ goals: fakeQuery({ data: [goalRow], error: null, count: 3 }) })),
    )

    const result = await tools.get("list_goals")!.handler({ status: "active", limit: 1 })
    expect(result.isError).toBeFalsy()
    const structured = result.structuredContent as {
      goals: { isOwner: boolean; isStarred: boolean }[]
      total: number
      truncated: boolean
    }
    expect(structured.total).toBe(3)
    expect(structured.truncated).toBe(true)
    expect(structured.goals[0].isOwner).toBe(false) // owned by "someone-else", not user-1
    expect(structured.goals[0].isStarred).toBe(true) // starred by user-1
  })

  it('get_goal never distinguishes "doesn\'t exist" from "not yours" — both are a plain not-found error', async () => {
    const { fakeServer, tools } = captureRegisteredTools()
    registerReadTools(
      fakeServer,
      fakeContext(fakeDb({ goals: fakeQuery({ data: null, error: null }) })),
    )

    const result = await tools
      .get("get_goal")!
      .handler({ goalId: "11111111-1111-1111-1111-111111111111" })
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toBeUndefined()
    expect(result.content[0].text.toLowerCase()).not.toMatch(/goal_id|sql|table|not yours/)
  })
})

describe("registerWriteTools", () => {
  it("registers all write tools as non-read-only and non-destructive", () => {
    const { fakeServer, tools } = captureRegisteredTools()
    registerWriteTools(fakeServer, fakeContext(fakeDb({}), { writeEnabled: true }))

    expect([...tools.keys()].sort()).toEqual(
      [
        "capture_korean_phrase",
        "capture_reflection",
        "complete_task",
        "create_goal",
        "create_task",
        "update_goal",
        "update_task",
        "create_knowledge_project",
        "create_project_note",
        "update_project_note",
      ].sort(),
    )
    for (const tool of tools.values()) {
      expect(tool.config.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      })
    }
  })

  it("create_task refuses to write into a goal the caller does not own, even though RLS's own goal-member policy would allow it", async () => {
    const { fakeServer, tools } = captureRegisteredTools()
    const ctx = fakeContext(
      fakeDb({ goals: fakeQuery({ data: { user_id: "someone-else" }, error: null }) }),
      { writeEnabled: true },
    )
    registerWriteTools(fakeServer, ctx)

    const result = await tools.get("create_task")!.handler({
      title: "Write the report",
      goalId: "11111111-1111-1111-1111-111111111111",
      startDate: "2026-08-10",
    })
    expect(result.isError).toBe(true)
    expect(result.content[0].text.toLowerCase()).toContain("don't own")
  })

  it("create_task dedupes a retry within the lookback window — no insert, created: false", async () => {
    const { fakeServer, tools } = captureRegisteredTools()
    let insertCalled = false
    const tasksQuery = fakeQuery({
      data: {
        id: "task-1",
        title: "Write the report",
        description: "",
        goal_id: null,
        start_date: "2026-08-10",
        end_date: "2026-08-10",
        is_anytime: true,
        duration_minutes: null,
        completed: false,
        status: "scheduled",
        blocked_reason: null,
        tags: [],
      },
      error: null,
    })
    tasksQuery.insert = () => {
      insertCalled = true
      return tasksQuery
    }
    registerWriteTools(
      fakeServer,
      fakeContext(fakeDb({ tasks: tasksQuery }), { writeEnabled: true }),
    )

    const result = await tools
      .get("create_task")!
      .handler({ title: "Write the report", startDate: "2026-08-10" })
    expect(result.isError).toBeFalsy()
    expect((result.structuredContent as { created: boolean }).created).toBe(false)
    expect(insertCalled).toBe(false)
  })

  it("complete_task is idempotent: an already-completed task is reported unchanged, with no write issued", async () => {
    const { fakeServer, tools } = captureRegisteredTools()
    const alreadyCompletedTask = {
      id: "task-1",
      user_id: "user-1",
      goal_id: null,
      title: "Ship the release",
      description: "",
      start_date: "2026-08-01",
      end_date: "2026-08-01",
      is_anytime: true,
      duration_minutes: null,
      completed: true,
      status: "completed",
      blocked_reason: null,
      tags: [],
    }
    let updateCalled = false
    const tasksQuery = fakeQuery({ data: alreadyCompletedTask, error: null })
    // Recording whether `update` is ever invoked on this table's query chain
    // is the whole point of the idempotency guarantee — a real double-write
    // would show up here as `updateCalled === true`.
    tasksQuery.update = () => {
      updateCalled = true
      return tasksQuery
    }
    registerWriteTools(
      fakeServer,
      fakeContext(fakeDb({ tasks: tasksQuery }), { writeEnabled: true }),
    )

    const result = await tools.get("complete_task")!.handler({ taskId: "task-1" })
    expect(result.isError).toBeFalsy()
    expect((result.structuredContent as { changed: boolean }).changed).toBe(false)
    expect(updateCalled).toBe(false)
  })

  it("capture_reflection never returns full journal content back — write-only by design", async () => {
    const { fakeServer, tools } = captureRegisteredTools()
    registerWriteTools(
      fakeServer,
      fakeContext(
        fakeDb({
          kori_journal_entries: fakeQuery({
            data: { id: "j1", occurred_at: "2026-08-07T00:00:00.000Z" },
            error: null,
          }),
        }),
        {
          writeEnabled: true,
        },
      ),
    )

    const result = await tools.get("capture_reflection")!.handler({ content: "Today went well." })
    expect(result.isError).toBeFalsy()
    const structured = result.structuredContent as { reflection: { id: string }; created: boolean }
    expect(structured.reflection.id).toBe("j1")
    expect(JSON.stringify(structured)).not.toContain("Today went well")
  })
})
