// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SavingsGoalDetailSheet } from "./savings-goal-detail-sheet"
import { SavingsGoalRow } from "./savings-goal-row"
import { SavingsSummary } from "./savings-summary"
import type { SavingsGoal } from "@/types/finance"

afterEach(cleanup)

function goal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: "g1",
    name: "Laptop",
    icon: "💻",
    color: "#3b82f6",
    targetUsd: 2_000,
    currentUsd: 500,
    deadline: null,
    note: "Synthetic note",
    purpose: "sinking_fund",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("SavingsGoalRow", () => {
  it("shows saved of target and the percent, and opens the goal sheet", () => {
    const onOpen = vi.fn()
    const row = goal()
    render(
      <ul>
        <SavingsGoalRow goal={row} onOpen={onOpen} />
      </ul>,
    )
    const button = screen.getByRole("button")
    expect(button.textContent).toContain("Laptop")
    expect(button.textContent).toContain("25%")
    expect(button.textContent).toContain("of")
    // Purpose and note live in the goal sheet now, not on the row.
    expect(button.textContent).not.toContain("Sinking fund")
    expect(button.textContent).not.toContain("Synthetic note")
    fireEvent.click(button)
    expect(onOpen).toHaveBeenCalledWith(row)
  })

  it("says Target reached in words, not colour alone", () => {
    render(
      <ul>
        <SavingsGoalRow goal={goal({ currentUsd: 2_000 })} onOpen={() => {}} />
      </ul>,
    )
    expect(screen.getByRole("button").textContent).toContain("Target reached")
  })
})

describe("SavingsSummary", () => {
  it("keeps the four old tile figures", () => {
    render(<SavingsSummary goals={[goal(), goal({ id: "g2", currentUsd: 2_500 })]} />)
    const section = screen.getByRole("region", { name: "Summary" })
    expect(section.textContent).toContain("saved")
    expect(section.textContent).toContain("75% of combined targets")
    expect(section.textContent).toContain("$4,000.00")
    expect(section.textContent).toContain("1 of 2 goals reached")
  })
})

describe("SavingsGoalDetailSheet", () => {
  it("holds Add contribution, Edit and Delete plus the purpose and note", () => {
    const handlers = { onContribute: vi.fn(), onEdit: vi.fn(), onDeleteRequest: vi.fn() }
    const row = goal()
    render(<SavingsGoalDetailSheet goal={row} open onOpenChange={() => {}} {...handlers} />)

    expect(screen.getByText("Sinking fund")).toBeTruthy()
    expect(screen.getByText("Synthetic note")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Add contribution" }))
    fireEvent.click(screen.getByRole("button", { name: "Edit goal" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete goal" }))
    expect(handlers.onContribute).toHaveBeenCalledWith(row)
    expect(handlers.onEdit).toHaveBeenCalledWith(row)
    expect(handlers.onDeleteRequest).toHaveBeenCalledWith(row)
  })
})
