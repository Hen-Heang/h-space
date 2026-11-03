/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Inbox } from "lucide-react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EmptyState } from "./empty-state"
import { PageSection } from "./page-section"
import { InteractiveRow, RowList } from "./row-list"

afterEach(cleanup)

describe("PageSection", () => {
  it("is a region named by its h2 heading — the shell keeps the only h1", () => {
    render(
      <PageSection title="Today" description="What needs you now" action={<button>Add</button>}>
        <p>content</p>
      </PageSection>,
    )
    const region = screen.getByRole("region", { name: "Today" })
    expect(region).toBeTruthy()
    expect(screen.getByRole("heading", { level: 2, name: "Today" })).toBeTruthy()
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
    expect(screen.getByText("What needs you now")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy()
  })

  it("keeps a hidden title available to screen readers", () => {
    render(
      <PageSection title="Tasks" hideTitle>
        <p>content</p>
      </PageSection>,
    )
    expect(screen.getByRole("region", { name: "Tasks" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Tasks" }).closest(".sr-only")).toBeTruthy()
  })
})

describe("RowList / InteractiveRow", () => {
  it("renders a link row, a button row and a static row as list items", () => {
    const onClick = vi.fn()
    render(
      <RowList>
        <InteractiveRow href="/notes" title="Notes" description="Your library" />
        <InteractiveRow onClick={onClick} title="Open capture" />
        <InteractiveRow title="Read-only" trailing="3" />
      </RowList>,
    )
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getByRole("link", { name: /Notes/ }).getAttribute("href")).toBe("/notes")
    fireEvent.click(screen.getByRole("button", { name: "Open capture" }))
    expect(onClick).toHaveBeenCalledOnce()
    expect(screen.getByText("Read-only")).toBeTruthy()
  })

  it("marks external rows as opening a new tab", () => {
    render(
      <RowList>
        <InteractiveRow href="https://example.com" external title="Docs" />
      </RowList>,
    )
    const link = screen.getByRole("link", { name: /Docs/ })
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toContain("noopener")
    expect(link.textContent).toContain("opens in a new tab")
  })
})

describe("EmptyState", () => {
  it("shows a title, one sentence and one next action", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Nothing captured yet"
        description="Capture a thought and it lands here."
        action={<button>Capture</button>}
      />,
    )
    expect(screen.getByText("Nothing captured yet")).toBeTruthy()
    expect(screen.getByText("Capture a thought and it lands here.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Capture" })).toBeTruthy()
  })
})
