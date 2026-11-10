import { describe, expect, it } from "vitest"

import type { Project } from "./note-projects"
import type { NoteMeta } from "./notes"
import {
  buildCaptureInput,
  buildNoteSearchResults,
  CAPTURE_TITLE_LENGTH,
  countNotesByType,
  DEFAULT_NOTES_HOME_FILTERS,
  describeActiveFilters,
  filterHomeNotes,
  groupNotesIntoProjects,
  NO_PROJECT_ID,
  selectPinnedNotes,
  selectRecentNotes,
  type NoteProject,
} from "./notes-home"

function makeNote(overrides: Partial<NoteMeta> = {}): NoteMeta {
  return {
    slug: "note",
    title: "A note",
    description: "",
    icon: "common",
    noteType: "technical",
    tags: [],
    pinned: false,
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}

const realProject: NoteProject = {
  id: "p1",
  name: "Sample API",
  description: "Practice REST API",
  tags: ["Spring Boot"],
  noteCount: 2,
  isInbox: false,
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Sample API",
    description: "",
    projectType: "learning",
    status: "active",
    tags: [],
    repoUrl: null,
    startDate: null,
    targetDate: null,
    lastOpenedAt: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("groupNotesIntoProjects", () => {
  it("returns no projects when there are no notes or projects", () => {
    expect(groupNotesIntoProjects([])).toEqual([])
  })

  it("keeps an empty real project and counts its notes", () => {
    const grouped = groupNotesIntoProjects(
      [makeNote({ slug: "a", projectId: "p1", updatedAt: "2026-09-01T00:00:00.000Z" })],
      [makeProject(), makeProject({ id: "p2", name: "Empty" })],
    )
    expect(grouped.map((g) => [g.id, g.noteCount])).toEqual([
      ["p1", 1],
      ["p2", 0],
    ])
    expect(grouped[0].updatedAt).toBe("2026-09-01T00:00:00.000Z")
    expect(grouped[1].updatedAt).toBe("2026-06-01T00:00:00.000Z")
  })

  it("puts notes without a project, or with an unknown one, into No project last", () => {
    const grouped = groupNotesIntoProjects(
      [
        makeNote({ slug: "a", projectId: null }),
        makeNote({ slug: "b", projectId: "deleted" }),
        makeNote({ slug: "c", projectId: "p1" }),
      ],
      [makeProject()],
    )
    expect(grouped.map((g) => g.id)).toEqual(["p1", NO_PROJECT_ID])
    expect(grouped[1].noteCount).toBe(2)
  })

  it("puts every note into the No project bucket when there are no projects", () => {
    const projects = groupNotesIntoProjects([
      makeNote({ slug: "a", updatedAt: "2026-07-01T00:00:00.000Z" }),
      makeNote({ slug: "b", updatedAt: "2026-08-01T00:00:00.000Z" }),
    ])
    expect(projects).toHaveLength(1)
    expect(projects[0]).toMatchObject({
      id: NO_PROJECT_ID,
      isInbox: true,
      noteCount: 2,
      updatedAt: "2026-08-01T00:00:00.000Z",
    })
  })
})

describe("buildNoteSearchResults", () => {
  const notes = [
    makeNote({ slug: "jwt", title: "JWT rotation", noteType: "technical" }),
    makeNote({ slug: "why", title: "Why RLS", noteType: "decision" }),
  ]
  const projects = [realProject, ...groupNotesIntoProjects(notes)]

  it("returns nothing for an empty query", () => {
    const res = buildNoteSearchResults({ query: "  ", scope: "all", projects, noteMatches: notes })
    expect(res.total).toBe(0)
    expect(res.noteHits).toEqual([])
    expect(res.projectHits).toEqual([])
  })

  it("matches real projects by name or description, never the No project bucket", () => {
    const byName = buildNoteSearchResults({
      query: "sample",
      scope: "all",
      projects,
      noteMatches: [],
    })
    expect(byName.projectHits.map((p) => p.id)).toEqual(["p1"])

    const bucket = buildNoteSearchResults({
      query: "project",
      scope: "all",
      projects,
      noteMatches: [],
    })
    expect(bucket.projectHits).toEqual([])
  })

  it("hides project hits when a project scope is set and names the scope", () => {
    const res = buildNoteSearchResults({
      query: "sample",
      scope: NO_PROJECT_ID,
      projects,
      noteMatches: notes,
    })
    expect(res.projectHits).toEqual([])
    expect(res.scopeLabel).toBe("No project")
    expect(res.summary).toBe("2 results in No project")
  })

  it("keeps only notes inside the scoped project", () => {
    const res = buildNoteSearchResults({ query: "x", scope: "p1", projects, noteMatches: notes })
    expect(res.noteHits).toEqual([])
    expect(res.summary).toBe("0 results in Sample API")

    const inProject = makeNote({ slug: "in", projectId: "p1" })
    const scoped = buildNoteSearchResults({
      query: "x",
      scope: "p1",
      projects,
      noteMatches: [...notes, inProject],
    })
    expect(scoped.noteHits.map((n) => n.slug)).toEqual(["in"])
  })

  it("matches projects by tag", () => {
    const res = buildNoteSearchResults({ query: "spring", scope: "all", projects, noteMatches: [] })
    expect(res.projectHits.map((p) => p.id)).toEqual(["p1"])
  })

  it("falls back to all notes for an unknown scope", () => {
    const res = buildNoteSearchResults({ query: "x", scope: "gone", projects, noteMatches: notes })
    expect(res.scopeLabel).toBe("all notes")
    expect(res.noteHits).toHaveLength(2)
  })

  it("applies the type filter and uses a singular summary", () => {
    const res = buildNoteSearchResults({
      query: "x",
      scope: "all",
      projects: [],
      noteMatches: notes,
      noteType: "decision",
    })
    expect(res.noteHits.map((n) => n.slug)).toEqual(["why"])
    expect(res.summary).toBe("1 result in all notes")
  })
})

describe("selectPinnedNotes / selectRecentNotes", () => {
  const notes = [
    makeNote({ slug: "old-pin", pinned: true, updatedAt: "2026-01-01T00:00:00.000Z" }),
    makeNote({ slug: "new", updatedAt: "2026-09-01T00:00:00.000Z" }),
    makeNote({ slug: "new-pin", pinned: true, updatedAt: "2026-08-01T00:00:00.000Z" }),
    makeNote({ slug: "no-date", updatedAt: undefined }),
  ]

  it("returns pinned notes newest first", () => {
    expect(selectPinnedNotes(notes).map((n) => n.slug)).toEqual(["new-pin", "old-pin"])
  })

  it("returns the newest notes up to the limit without mutating the input", () => {
    const before = notes.map((n) => n.slug)
    expect(selectRecentNotes(notes, 2).map((n) => n.slug)).toEqual(["new", "new-pin"])
    expect(notes.map((n) => n.slug)).toEqual(before)
  })

  it("counts notes by type", () => {
    expect(countNotesByType([makeNote({ noteType: "reference" }), makeNote()], "reference")).toBe(1)
  })
})

describe("buildCaptureInput", () => {
  it("returns null for blank text", () => {
    expect(buildCaptureInput("   \n ")).toBeNull()
  })

  it("uses the first line as the title and keeps the full text as content", () => {
    expect(buildCaptureInput("  Ask about tests\nmore detail ")).toEqual({
      title: "Ask about tests",
      content: "Ask about tests\nmore detail",
      itemType: "note",
      source: "manual",
    })
  })

  it("cuts long titles to the capture limit", () => {
    const input = buildCaptureInput("a".repeat(100))
    expect(input?.title).toHaveLength(CAPTURE_TITLE_LENGTH)
    expect(input?.title?.endsWith("…")).toBe(true)
    expect(input?.content).toHaveLength(100)
  })
})

describe("search filters for pinned and project status", () => {
  const hits = [makeNote({ slug: "a", pinned: true }), makeNote({ slug: "b" })]
  const groups = groupNotesIntoProjects(
    [],
    [
      makeProject({ id: "p1", name: "Spring A" }),
      makeProject({ id: "p2", name: "Spring B", status: "archived" }),
    ],
  )

  it("keeps only pinned note hits when asked", () => {
    const res = buildNoteSearchResults({
      query: "x",
      scope: "all",
      projects: [],
      noteMatches: hits,
      pinnedOnly: true,
    })
    expect(res.noteHits.map((n) => n.slug)).toEqual(["a"])
  })

  it("keeps only project hits with the chosen status", () => {
    const all = buildNoteSearchResults({
      query: "spring",
      scope: "all",
      projects: groups,
      noteMatches: [],
    })
    expect(all.projectHits.map((p) => p.id)).toEqual(["p1", "p2"])
    const archived = buildNoteSearchResults({
      query: "spring",
      scope: "all",
      projects: groups,
      noteMatches: [],
      projectStatus: "archived",
    })
    expect(archived.projectHits.map((p) => p.id)).toEqual(["p2"])
  })
})

describe("filterHomeNotes", () => {
  const known = new Set(["p1"])
  const notes = [
    makeNote({ slug: "in", projectId: "p1", noteType: "decision", pinned: true }),
    makeNote({ slug: "loose" }),
    makeNote({ slug: "orphan", projectId: "deleted" }),
  ]
  const slugs = (list: NoteMeta[]) => list.map((n) => n.slug)

  it("returns every note with the default filters", () => {
    expect(slugs(filterHomeNotes(notes, DEFAULT_NOTES_HOME_FILTERS, known))).toEqual([
      "in",
      "loose",
      "orphan",
    ])
  })

  it("scopes to a project or to notes with no known project", () => {
    expect(
      slugs(filterHomeNotes(notes, { ...DEFAULT_NOTES_HOME_FILTERS, scope: "p1" }, known)),
    ).toEqual(["in"])
    expect(
      slugs(filterHomeNotes(notes, { ...DEFAULT_NOTES_HOME_FILTERS, scope: NO_PROJECT_ID }, known)),
    ).toEqual(["loose", "orphan"])
  })

  it("combines type and pinned filters", () => {
    const f = { ...DEFAULT_NOTES_HOME_FILTERS, noteType: "decision" as const, pinnedOnly: true }
    expect(slugs(filterHomeNotes(notes, f, known))).toEqual(["in"])
    expect(slugs(filterHomeNotes(notes, { ...f, noteType: "idea" }, known))).toEqual([])
  })
})

describe("describeActiveFilters", () => {
  const groups = groupNotesIntoProjects([makeNote({ slug: "loose" })], [makeProject()])

  it("lists nothing for the defaults", () => {
    expect(describeActiveFilters(DEFAULT_NOTES_HOME_FILTERS, groups)).toEqual([])
  })

  it("writes out each active filter", () => {
    const labels = describeActiveFilters(
      { scope: "p1", noteType: "decision", pinnedOnly: true, projectStatus: "on_hold" },
      groups,
    )
    expect(labels).toEqual([
      "In: Sample API",
      "Decision",
      "Pinned only",
      expect.stringMatching(/^Status: /),
    ])
  })

  it("names the No project scope and ignores a scope that no longer exists", () => {
    expect(
      describeActiveFilters({ ...DEFAULT_NOTES_HOME_FILTERS, scope: NO_PROJECT_ID }, groups),
    ).toEqual(["No project"])
    expect(describeActiveFilters({ ...DEFAULT_NOTES_HOME_FILTERS, scope: "gone" }, groups)).toEqual(
      [],
    )
  })

  it("limits the list to the kinds the view uses", () => {
    const f = { ...DEFAULT_NOTES_HOME_FILTERS, pinnedOnly: true, projectStatus: "active" as const }
    expect(describeActiveFilters(f, groups, { notes: false, projects: true })).toEqual([
      "Status: Active",
    ])
    expect(describeActiveFilters(f, groups, { notes: true, projects: false })).toEqual([
      "Pinned only",
    ])
  })
})
