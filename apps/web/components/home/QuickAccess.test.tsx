/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { APP_FAVORITES_STORAGE_KEY } from "@/lib/apps-catalog"
import { hSpaceProjects } from "@/lib/projects"

import { QuickAccess } from "./QuickAccess"

const favoriteProject = hSpaceProjects.find((project) =>
  project.links.some((link) => link.kind === "app"),
)!

beforeEach(() => {
  localStorage.setItem(APP_FAVORITES_STORAGE_KEY, JSON.stringify([favoriteProject.id]))
})

afterEach(() => {
  cleanup()
  localStorage.removeItem(APP_FAVORITES_STORAGE_KEY)
})

describe("QuickAccess", () => {
  it("shows at most four app shortcuts and puts favorites first", () => {
    render(<QuickAccess />)

    const links = screen.getAllByRole("link")
    const firstAppLink = favoriteProject.links.find((link) => link.kind === "app")!

    expect(links).toHaveLength(
      Math.min(
        4,
        hSpaceProjects.filter((project) => project.links.some((link) => link.kind === "app"))
          .length,
      ),
    )
    expect(links[0].textContent).toContain(favoriteProject.name)
    expect(links[0].getAttribute("href")).toBe(firstAppLink.href)
  })
})
