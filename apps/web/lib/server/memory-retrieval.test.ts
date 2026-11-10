import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import { retrieveMemoryContext } from "./memory-retrieval"

// A chainable stand-in for the Supabase query builder: records which tables
// were queried and resolves every query with the rows given for that table.
function fakeDb(rows: Record<string, Record<string, unknown>[]> = {}) {
  const tables: string[] = []
  const db = {
    from(table: string) {
      tables.push(table)
      const result = { data: rows[table] ?? [], error: null }
      const builder = {
        select: () => builder,
        textSearch: () => builder,
        order: () => builder,
        eq: () => builder,
        limit: () => builder,
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      }
      return builder
    },
  }
  return { db: db as unknown as SupabaseClient, tables }
}

const NOTE_ROW = {
  id: "note-1",
  slug: "synthetic-note",
  title: "Synthetic note",
  description: "",
  content: "Synthetic content about practice routines.",
}

describe("retrieveMemoryContext — notes", () => {
  it("searches kori_notes and cites them by default", async () => {
    const { db, tables } = fakeDb({ kori_notes: [NOTE_ROW] })
    const items = await retrieveMemoryContext(db, "practice routines")
    expect(tables).toContain("kori_notes")
    expect(items.find((i) => i.type === "note")).toMatchObject({
      id: "note-1",
      href: "/notes/synthetic-note",
    })
  })

  it("never queries or cites notes when includeNotes is false (Notes retired)", async () => {
    const { db, tables } = fakeDb({ kori_notes: [NOTE_ROW] })
    const items = await retrieveMemoryContext(db, "practice routines", { includeNotes: false })
    expect(tables).not.toContain("kori_notes")
    expect(items.some((i) => i.type === "note")).toBe(false)
    expect(items.some((i) => i.href?.startsWith("/notes"))).toBe(false)
    // The other sources are still searched.
    expect(tables).toEqual(expect.arrayContaining(["kori_inbox_items", "kori_journal_entries"]))
  })
})
