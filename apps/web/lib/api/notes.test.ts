import { beforeEach, describe, expect, it, vi } from "vitest"

// A minimal chainable stand-in for supabase.from("kori_notes").select(...)...
const selectCalls = vi.hoisted(() => [] as string[])
const responses = vi.hoisted(() => [] as { data: unknown; error: unknown }[])
const insertPayloads = vi.hoisted(() => [] as Record<string, unknown>[])
const updatePayloads = vi.hoisted(() => [] as Record<string, unknown>[])
const eqCalls = vi.hoisted(() => [] as [string, unknown][])

vi.mock("@/lib/supabase", () => {
  const chain = (result: () => { data: unknown; error: unknown }) => {
    const self: Record<string, unknown> = {}
    for (const name of ["order", "textSearch", "limit", "single", "maybeSingle", "select"]) {
      self[name] = () => self
    }
    self.eq = (column: string, value: unknown) => {
      eqCalls.push([column, value])
      return self
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
        update: (payload: Record<string, unknown>) => {
          updatePayloads.push(payload)
          return chain(() => responses.shift() ?? { data: null, error: null })
        },
      }),
    },
  }
})
vi.mock("@/lib/auth-store", () => ({ requireUserId: () => "user-1" }))

import { NoteConflictError, notesApi, resetNotesSchemaCache } from "./notes"

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
  updatePayloads.length = 0
  eqCalls.length = 0
  resetNotesSchemaCache()
})

describe("notesApi.update version check", () => {
  const version = "2026-11-09T01:00:00.123456+00:00"

  it("only updates the version the editor opened, when one is given", async () => {
    responses.push({ data: { ...row, title: "B" }, error: null })
    const note = await notesApi.update("a", { title: "B" }, { expectedUpdatedAt: version })
    expect(eqCalls).toEqual([
      ["slug", "a"],
      ["updated_at", version],
    ])
    expect(note.title).toBe("B")
    expect(updatePayloads[0].updated_at).not.toBe(version)
  })

  it("throws NoteConflictError when that version no longer exists", async () => {
    responses.push({ data: null, error: null })
    await expect(
      notesApi.update("a", { content: "mine" }, { expectedUpdatedAt: version }),
    ).rejects.toBeInstanceOf(NoteConflictError)
  })

  it("updates without a version filter when none is given (pin toggle)", async () => {
    responses.push({ data: { ...row, pinned: true }, error: null })
    await notesApi.togglePinned("a", true)
    expect(eqCalls).toEqual([["slug", "a"]])
  })

  it("reports a missing note as not found, not as a conflict", async () => {
    responses.push({ data: null, error: null })
    const result = notesApi.update("gone", { title: "B" })
    await expect(result).rejects.toThrow("Note not found.")
    await expect(result).rejects.not.toBeInstanceOf(NoteConflictError)
  })

  it("rethrows database errors", async () => {
    const dbError = { code: "23505", message: "duplicate key" }
    responses.push({ data: null, error: dbError })
    await expect(notesApi.update("a", { title: "B" }, { expectedUpdatedAt: version })).rejects.toBe(
      dbError,
    )
  })
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
