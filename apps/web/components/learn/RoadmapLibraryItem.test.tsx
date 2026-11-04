/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ROADMAP_STORAGE_KEY } from "@/lib/roadmap-progress"

import { RoadmapLibraryItem } from "./RoadmapLibraryItem"

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

function renderInList() {
  return render(
    <ul>
      <RoadmapLibraryItem />
    </ul>,
  )
}

describe("RoadmapLibraryItem", () => {
  it("is a Library row linking to /roadmap, starting at phase 1", () => {
    renderInList()
    const link = screen.getByRole("link", { name: /Dev roadmap/ })
    expect(link.getAttribute("href")).toBe("/roadmap")
    expect(link.textContent).toContain("Phase 1 · Java Foundations · 0%")
  })

  it("shows the progress the roadmap page saved in this browser", () => {
    const phase1 = Array.from({ length: 14 }, (_, i) => `p1-t${i + 1}`)
    window.localStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify([...phase1, "p2-t1"]))
    renderInList()
    // 15 of 102 topics; the first unfinished phase is 2.
    expect(screen.getByRole("link", { name: /Dev roadmap/ }).textContent).toContain(
      "Phase 2 · Java Advanced · 15%",
    )
  })

  it("survives corrupted storage", () => {
    window.localStorage.setItem(ROADMAP_STORAGE_KEY, "{not json")
    renderInList()
    expect(screen.getByRole("link", { name: /Dev roadmap/ }).textContent).toContain("0%")
  })
})
