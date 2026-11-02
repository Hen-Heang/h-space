import { beforeEach, describe, expect, it, vi } from "vitest"

// A minimal chainable stand-in for supabase.from("kori_notes").select(...)...
const selectCalls = vi.hoisted(() => [] as string[])
const responses = vi.hoisted(() => [] as { data: unknown; error: unknown }[])
const insertPayloads = vi.hoisted(() => [] as Record<string, unknown>[])

vi.mock("@/lib/supabase", () => {
  const chain = (result: () => { data: unknown; error: unknown }) => {
    const self: Record<string, unknown> = {}
    for (const name of ["order", "textSearch", "limit", "eq", "single", "select"]) {
      self[name] = () => self
    }
    self.then = (resolve: (v: unknown) => unknown) => resolve(result())
    return self
  }
  return {
    supabase: {
      from: () => ({
        select: (columns: string) => {
          selectCalls.push(columns)
          return chain(() => responses.shift() ?? { data: [], error: null })
        },
        insert: (payload: Record<string, unknown>) => {
          insertPayloads.push(payload)
          return chain(() => ({
            data: { ...payload, id: "n1", created_at: "", updated_at: "" },
            error: null,
          }))
        },
      }),
    },
  }
})
vi.mock("@/lib/auth-store", () => ({ requireUserId: () => "user-1" }))

import { notesApi, resetNotesSchemaCache } from "./notes"

const row = {
  id: "n1",
  slug: "a",
  title: "A",
  description: "",
  icon: "common",
  category: null,
  note_type: "technical",
  tags: [],
  pinned: false,
  source_url: null,
  goal_id: null,
  task_id: null,
  inbox_item_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

beforeEach(() => {
  selectCalls.length = 0
  responses.length = 0
  insertPayloads.length = 0
  resetNotesSchemaCache()
})

describe("notesApi project_id compatibility", () => {
  it("selects project_id and maps it", async () => {
    responses.push({ data: [{ ...row, project_id: "p1" }], error: null })
    const notes = await notesApi.list()
    expect(selectCalls[0]).toContain("project_id")
    expect(notes[0].projectId).toBe("p1")
  })

  it("falls back to the old columns when project_id doesn't exist yet, and remembers it", async () => {
    responses.push({ data: null, error: { code: "42703", message: "column does not exist" } })
    responses.push({ data: [row], error: null })
    const notes = await notesApi.list()
    expect(selectCalls).toHaveLength(2)
    expect(selectCalls[1]).not.toContain("project_id")
    expect(notes[0].projectId).toBeNull()

    responses.push({ data: [row], error: null })
    await notesApi.list()
    expect(selectCalls).toHaveLength(3)
    expect(selectCalls[2]).not.toContain("project_id")
  })

  it("rethrows other errors instead of hiding them", async () => {
    responses.push({ data: null, error: { code: "42501", message: "permission denied" } })
    await expect(notesApi.list()).rejects.toMatchObject({ code: "42501" })
    expect(selectCalls).toHaveLength(1)
  })

  it("only sends project_id on create when a project was chosen", async () => {
    await notesApi.create({ slug: "a", title: "A", content: "x" })
    expect(insertPayloads[0]).not.toHaveProperty("project_id")

    await notesApi.create({ slug: "b", title: "B", content: "x", projectId: "p1" })
    expect(insertPayloads[1]).toMatchObject({ project_id: "p1" })
  })
})
