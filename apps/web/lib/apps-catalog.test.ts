/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest"

import {
  APP_FAVORITES_STORAGE_KEY,
  appCategories,
  filterApps,
  readAppFavorites,
  toggleFavorite,
  writeAppFavorites,
} from "@/lib/apps-catalog"
import type { HSpaceProject } from "@/lib/projects"

const project = (id: string, area: string, stack: string[] = []): HSpaceProject =>
  ({
    id,
    name: `App ${id}`,
    area,
    description: `${id} description`,
    stack,
    links: [],
  }) as unknown as HSpaceProject

const projects = [
  project("a", "Learning", ["Next.js"]),
  project("b", "Finance", ["Neon Postgres"]),
  project("c", "Learning", ["Spring Boot"]),
]

const all = { query: "", category: "all", favoritesOnly: false }

describe("appCategories", () => {
  it("lists distinct categories in catalog order", () => {
    expect(appCategories(projects)).toEqual(["Learning", "Finance"])
  })
})

describe("filterApps", () => {
  it("returns everything in catalog order with no filter or favorites", () => {
    expect(filterApps(projects, all, new Set()).map((p) => p.id)).toEqual(["a", "b", "c"])
  })

  it("filters by category", () => {
    const ids = filterApps(projects, { ...all, category: "Learning" }, new Set()).map((p) => p.id)
    expect(ids).toEqual(["a", "c"])
  })

  it("searches technologies case-insensitively", () => {
    const ids = filterApps(projects, { ...all, query: "  spring " }, new Set()).map((p) => p.id)
    expect(ids).toEqual(["c"])
  })

  it("puts favorites first without reordering the rest", () => {
    const ids = filterApps(projects, all, new Set(["c"])).map((p) => p.id)
    expect(ids).toEqual(["c", "a", "b"])
  })

  it("can show favorites only", () => {
    const ids = filterApps(projects, { ...all, favoritesOnly: true }, new Set(["b"])).map(
      (p) => p.id,
    )
    expect(ids).toEqual(["b"])
  })
})

describe("favorites persistence", () => {
  afterEach(() => window.localStorage.clear())

  it("round-trips through localStorage", () => {
    writeAppFavorites(["a", "c"])
    expect(readAppFavorites()).toEqual(["a", "c"])
  })

  it("ignores corrupted values", () => {
    window.localStorage.setItem(APP_FAVORITES_STORAGE_KEY, "{not json")
    expect(readAppFavorites()).toEqual([])
    window.localStorage.setItem(APP_FAVORITES_STORAGE_KEY, JSON.stringify([1, "b"]))
    expect(readAppFavorites()).toEqual(["b"])
  })

  it("toggles an id in and out", () => {
    expect(toggleFavorite(["a"], "b")).toEqual(["a", "b"])
    expect(toggleFavorite(["a", "b"], "a")).toEqual(["b"])
  })
})
