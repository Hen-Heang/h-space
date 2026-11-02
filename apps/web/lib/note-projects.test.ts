import { describe, expect, it } from "vitest"

import {
  filterProjectsByStatus,
  MAX_PROJECT_NAME_LENGTH,
  MAX_PROJECT_TAGS,
  normalizeProjectInput,
  parseTagList,
  projectStatusLabel,
  projectTypeLabel,
  selectDecisionNotes,
  selectRecentlyOpenedProjects,
  validateProjectInput,
  type Project,
} from "./note-projects"
import type { NoteMeta } from "./notes"

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Project",
    description: "",
    projectType: "personal",
    status: "active",
    tags: [],
    repoUrl: null,
    startDate: null,
    targetDate: null,
    lastOpenedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeNote(overrides: Partial<NoteMeta> = {}): NoteMeta {
  return {
    slug: "n",
    title: "Note",
    description: "",
    icon: "common",
    noteType: "technical",
    pinned: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("validateProjectInput", () => {
  it("accepts a name-only project", () => {
    expect(validateProjectInput({ name: "Docker practice" })).toEqual({})
  })

  it("requires a non-blank name with the design's message", () => {
    expect(validateProjectInput({ name: "   " }).name).toBe("Give the project a name to continue.")
  })

  it("rejects an over-long name", () => {
    expect(validateProjectInput({ name: "x".repeat(MAX_PROJECT_NAME_LENGTH + 1) }).name).toBeTruthy()
  })

  it("rejects non-http links", () => {
    expect(validateProjectInput({ name: "a", repoUrl: "javascript:alert(1)" }).repoUrl).toBeTruthy()
    expect(validateProjectInput({ name: "a", repoUrl: "github.com/x" }).repoUrl).toBeTruthy()
    expect(validateProjectInput({ name: "a", repoUrl: "https://github.com/x" }).repoUrl).toBeUndefined()
  })

  it("rejects a target date before the start date", () => {
    expect(
      validateProjectInput({ name: "a", startDate: "2026-05-02", targetDate: "2026-05-01" })
        .targetDate,
    ).toBeTruthy()
    expect(
      validateProjectInput({ name: "a", startDate: "2026-05-01", targetDate: "2026-05-01" })
        .targetDate,
    ).toBeUndefined()
  })

  it("limits the number of tags", () => {
    const tags = Array.from({ length: MAX_PROJECT_TAGS + 1 }, (_, i) => `t${i}`)
    expect(validateProjectInput({ name: "a", tags }).tags).toBeTruthy()
  })
})

describe("parseTagList / normalizeProjectInput", () => {
  it("splits, trims and de-duplicates case-insensitively", () => {
    expect(parseTagList(" Spring Boot,PostgreSQL ,, spring boot,  jwt  ")).toEqual([
      "Spring Boot",
      "PostgreSQL",
      "jwt",
    ])
  })

  it("trims fields, fills defaults, and turns blanks into null", () => {
    expect(normalizeProjectInput({ name: "  A  ", repoUrl: "  ", startDate: "" })).toEqual({
      name: "A",
      description: "",
      projectType: "personal",
      status: "active",
      tags: [],
      repoUrl: null,
      startDate: null,
      targetDate: null,
    })
  })

  it("labels types and statuses", () => {
    expect(projectTypeLabel("open_source")).toBe("Open Source")
    expect(projectStatusLabel("on_hold")).toBe("On Hold")
  })
})

describe("project selection", () => {
  const projects = [
    makeProject({ id: "old", updatedAt: "2026-01-01T00:00:00.000Z" }),
    makeProject({
      id: "opened",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastOpenedAt: "2026-10-01T00:00:00.000Z",
    }),
    makeProject({ id: "updated", updatedAt: "2026-09-01T00:00:00.000Z" }),
    makeProject({
      id: "archived",
      status: "archived",
      lastOpenedAt: "2026-11-01T00:00:00.000Z",
    }),
  ]

  it("orders recently opened by last open, falling back to update, skipping archived", () => {
    expect(selectRecentlyOpenedProjects(projects).map((p) => p.id)).toEqual([
      "opened",
      "updated",
      "old",
    ])
  })

  it("filters by status, newest update first", () => {
    expect(filterProjectsByStatus(projects, "archived").map((p) => p.id)).toEqual(["archived"])
    expect(filterProjectsByStatus(projects, "all")[0].id).toBe("updated")
  })

  it("selects only the project's Decision notes, newest first", () => {
    const notes = [
      makeNote({ slug: "d1", noteType: "decision", projectId: "p1", updatedAt: "2026-02-01T00:00:00.000Z" }),
      makeNote({ slug: "d2", noteType: "decision", projectId: "p1", updatedAt: "2026-03-01T00:00:00.000Z" }),
      makeNote({ slug: "other-project", noteType: "decision", projectId: "p2" }),
      makeNote({ slug: "tech", noteType: "technical", projectId: "p1" }),
      makeNote({ slug: "loose", noteType: "decision", projectId: null }),
    ]
    expect(selectDecisionNotes(notes, "p1").map((n) => n.slug)).toEqual(["d2", "d1"])
  })
})
