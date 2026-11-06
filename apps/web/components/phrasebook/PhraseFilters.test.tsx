/** @vitest-environment jsdom */

import { useState } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

// Desktop layout (popover). The bottom sheet uses the same panel component.
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }))

import { PhraseFilters } from "./PhraseFilters"
import type { PhraseFilters as Value } from "@/lib/korean-phrasebook/mastery"

beforeAll(() => {
  // Radix popover measures the trigger; jsdom has no ResizeObserver.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})
afterEach(() => {
  cleanup()
  changes.mockClear()
})

const changes = vi.fn<(value: Value) => void>()
const lastChange = () => changes.mock.calls.at(-1)?.[0]

function Harness({ initial = {} }: { initial?: Value }) {
  const [value, setValue] = useState<Value>(initial)
  return (
    <PhraseFilters
      value={value}
      onChange={(next) => {
        setValue(next)
        changes(next)
      }}
      categories={["daily", "workplace"]}
      situations={["blocker-delay", "code-review-feedback", "requirement-clarification"]}
      difficulties={["easy", "hard"]}
    />
  )
}

describe("PhraseFilters", () => {
  it("shows search and readable category chips, not a wall of situation chips", () => {
    render(<Harness />)
    expect(screen.getByRole("searchbox", { name: "Search Phrasebook" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Daily life" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Workplace" })).toBeTruthy()
    // Situations live in the Filters panel until it's opened.
    expect(screen.queryByText("Clarify requirements")).toBeNull()
  })

  it("selects a situation in the panel by its label while storing the key", () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: "Filters" }))
    fireEvent.change(screen.getByRole("searchbox", { name: "Find a situation" }), {
      target: { value: "review" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Review feedback" }))
    expect(lastChange()?.situation).toBe("code-review-feedback")
  })

  it("shows the active-filter count and removable chips, and Clear all resets everything", () => {
    render(<Harness initial={{ query: "회의", situation: "blocker-delay", difficulty: "hard" }} />)
    expect(screen.getByRole("button", { name: "Filters, 2 selected" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Remove filter: Report a blocker" }))
    expect(lastChange()).toEqual({ query: "회의", difficulty: "hard" })

    const clear = screen.getByRole("button", { name: "Clear all" })
    clear.focus()
    expect(document.activeElement).toBe(clear) // reachable from the keyboard
    fireEvent.click(clear)
    expect(lastChange()).toEqual({})
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull()
  })
})
