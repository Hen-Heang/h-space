/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Project } from "@/lib/note-projects"
import type { NoteMeta } from "@/lib/notes"

vi.mock("@/lib/supabase", () => ({ supabase: {} }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
const mockSearch = vi.hoisted(() => ({ results: [] as NoteMeta[] }))
vi.mock("@/hooks/useNotes", () => ({
  useNoteSearch: (query: string) => ({
    results: query.trim() ? mockSearch.results : [],
    searching: false,
    error: "",
  }),
}))

import { NotesHome } from "./NotesHome"

// Synthetic test data only.
function note(overrides: Partial<NoteMeta>): NoteMeta {
  return {
    slug: "n",
    title: "Note",
    description: "",
    icon: "common",
    noteType: "technical",
    tags: [],
    pinned: false,
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  }
}

function project(overrides: Partial<Project>): Project {
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
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  }
}

const notes = [
  note({ slug: "jwt", title: "JWT rotation", projectId: "p1", pinned: true }),
  note({ slug: "why", title: "Why RLS", noteType: "decision", projectId: "p1" }),
  note({ slug: "loose", title: "한국어 메모 with English" }),
]
const projects = [project({}), project({ id: "p2", name: "Old idea", status: "archived" })]

function renderHome(overrides: Partial<React.ComponentProps<typeof NotesHome>> = {}) {
  const onNewProject = vi.fn()
  render(
    <NotesHome
      notes={notes}
      projects={projects}
      projectsLoading={false}
      projectsUnavailable={false}
      projectsError=""
      onNewProject={onNewProject}
      {...overrides}
    />,
  )
  return { onNewProject }
}

const listTitles = (heading: string) => {
  const section = screen
    .getByRole("heading", { name: new RegExp(`^${heading}`) })
    .closest("section")!
  return within(section)
    .queryAllByRole("link")
    .map((link) => link.textContent)
}

beforeEach(() => {
  mockSearch.results = []
  // A phone: filters open in a bottom sheet.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})
afterEach(cleanup)

describe("NotesHome", () => {
  it("starts on Notes with the list right under search and a count by the heading", () => {
    renderHome()
    expect(screen.getByRole("button", { name: "Notes" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("heading", { name: /^Notes/ }).textContent).toContain("3")
    // Pinned first.
    expect(listTitles("Notes")[0]).toContain("JWT rotation")
    expect(screen.getByRole("img", { name: "Pinned" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "New project" })).toBeNull()
  })

  it("switches to Projects with New project, Recently opened and the full list", () => {
    const { onNewProject } = renderHome()
    fireEvent.click(screen.getByRole("button", { name: "Projects" }))
    expect(screen.getByRole("heading", { name: "Recently opened" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: /^All projects/ }).textContent).toContain("2")
    fireEvent.click(screen.getByRole("button", { name: "New project" }))
    expect(onNewProject).toHaveBeenCalledOnce()
  })

  it("opens the No project notes from the project list, then clears the filter", () => {
    renderHome()
    fireEvent.click(screen.getByRole("button", { name: "Projects" }))
    fireEvent.click(screen.getByRole("button", { name: /No project/ }))
    expect(screen.getByRole("button", { name: "Notes" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByText("No project", { selector: "span" })).toBeTruthy()
    expect(listTitles("Notes")).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Filters (1 active)" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(listTitles("Notes")).toHaveLength(3)
    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy()
  })

  it("filters by type in the filter sheet and shows the filter in words", () => {
    renderHome()
    fireEvent.click(screen.getByRole("button", { name: "Filters" }))
    fireEvent.click(screen.getByRole("button", { name: "Decision" }))
    fireEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(listTitles("Notes").map((t) => t?.includes("Why RLS"))).toEqual([true])
    expect(screen.getByRole("heading", { name: /^Notes/ }).textContent).toContain("1 of 3")
    expect(screen.getByText("Decision", { selector: "span" })).toBeTruthy()
  })

  it("groups search results as Notes and Projects and clears the search", () => {
    mockSearch.results = [notes[1]]
    renderHome()
    const search = screen.getByRole("searchbox", { name: "Search notes and projects" })
    fireEvent.change(search, { target: { value: "sample" } })
    expect(screen.getByRole("heading", { name: /^Notes/ })).toBeTruthy()
    expect(screen.getByRole("heading", { name: /^Projects/ })).toBeTruthy()
    expect(screen.getByRole("status").textContent).toBe("2 results in all notes")

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
    expect((search as HTMLInputElement).value).toBe("")
    expect(screen.queryByRole("heading", { name: /^Projects/ })).toBeNull()
  })

  it("says when a search finds nothing", () => {
    renderHome()
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } })
    expect(screen.getByText("Nothing found")).toBeTruthy()
  })

  it("hides the Projects view while projects aren't set up", () => {
    renderHome({ projects: [], projectsUnavailable: true })
    expect(screen.queryByRole("button", { name: "Projects" })).toBeNull()
    expect(screen.getByText(/Projects aren.t set up yet/)).toBeTruthy()
  })
})
