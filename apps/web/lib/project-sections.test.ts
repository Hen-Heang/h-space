import { describe, expect, it } from "vitest"

import type { NoteMeta } from "@/lib/notes"
import { groupNotesBySection, selectKeyNotes, UNSORTED_SECTION } from "@/lib/project-sections"

function note(slug: string, overrides: Partial<NoteMeta> = {}): NoteMeta {
  return {
    slug,
    title: slug,
    description: "",
    icon: "",
    noteType: "technical",
    pinned: false,
    updatedAt: "2026-11-01T00:00:00Z",
    ...overrides,
  }
}

describe("groupNotesBySection", () => {
  it("returns no sections for no notes", () => {
    expect(groupNotesBySection([])).toEqual([])
  })

  it("orders suggested sections first, then others A-Z, then Unsorted", () => {
    const sections = groupNotesBySection([
      note("a", { category: "Zeta" }),
      note("b"),
      note("c", { category: "Reference" }),
      note("d", { category: "Alpha" }),
      note("e", { category: "Architecture" }),
    ])
    expect(sections.map((s) => s.label)).toEqual([
      "Architecture",
      "Reference",
      "Alpha",
      "Zeta",
      UNSORTED_SECTION,
    ])
  })

  it("merges categories that differ only in case or spacing", () => {
    const sections = groupNotesBySection([
      note("a", { category: "how-to" }),
      note("b", { category: "  How-to " }),
      note("c", { category: "backend  notes" }),
      note("d", { category: "Backend notes" }),
    ])
    expect(sections).toHaveLength(2)
    expect(sections[0]).toMatchObject({ label: "How-to" })
    expect(sections[0].notes.map((n) => n.slug).sort()).toEqual(["a", "b"])
    expect(sections[1].notes).toHaveLength(2)
  })

  it("treats a blank category as Unsorted", () => {
    const sections = groupNotesBySection([note("a", { category: "   " }), note("b")])
    expect(sections).toEqual([expect.objectContaining({ key: "", label: UNSORTED_SECTION })])
    expect(sections[0].notes).toHaveLength(2)
  })

  it("sorts each section pinned first, then most recently updated", () => {
    const [section] = groupNotesBySection([
      note("old", { category: "Guides", updatedAt: "2026-10-01T00:00:00Z" }),
      note("new", { category: "Guides", updatedAt: "2026-11-05T00:00:00Z" }),
      note("pinned-old", { category: "Guides", pinned: true, updatedAt: "2026-09-01T00:00:00Z" }),
    ])
    expect(section.notes.map((n) => n.slug)).toEqual(["pinned-old", "new", "old"])
  })
})

describe("selectKeyNotes", () => {
  it("returns only pinned notes, newest first, up to the limit", () => {
    const notes = [
      note("a", { pinned: true, updatedAt: "2026-10-01T00:00:00Z" }),
      note("b"),
      note("c", { pinned: true, updatedAt: "2026-11-01T00:00:00Z" }),
      note("d", { pinned: true, updatedAt: "2026-09-01T00:00:00Z" }),
    ]
    expect(selectKeyNotes(notes).map((n) => n.slug)).toEqual(["c", "a", "d"])
    expect(selectKeyNotes(notes, 2).map((n) => n.slug)).toEqual(["c", "a"])
  })

  it("returns nothing when no note is pinned", () => {
    expect(selectKeyNotes([note("a"), note("b")])).toEqual([])
  })
})
