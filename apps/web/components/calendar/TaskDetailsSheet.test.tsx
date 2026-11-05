/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Task } from "@/lib/tasks"

import { TaskDetailsSheet } from "./TaskDetailsSheet"

afterEach(cleanup)

const task = {
  id: "t1",
  title: "Synthetic task",
  description: "",
  completed: false,
  is_anytime: true,
  start_date: "2026-11-05T00:00:00.000Z",
  end_date: "2026-11-05T23:59:59.000Z",
} as Task

function renderSheet() {
  render(
    <TaskDetailsSheet
      isOpen
      onClose={vi.fn()}
      selectedTask={task}
      onToggleTaskCompletion={vi.fn()}
      onEditTask={vi.fn()}
      onDeleteTask={vi.fn()}
      goalTitle="Synthetic goal"
    />,
  )
}

describe("TaskDetailsSheet", () => {
  it("has one close control, not the Sheet's X stacked on the panel's Delete", () => {
    renderSheet()
    expect(screen.getAllByRole("button", { name: /close/i })).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Delete task" })).toBeTruthy()
  })

  it("names the completion toggle and leaves the page's h1 to the shell", () => {
    renderSheet()
    // The footer has its own "Mark complete" button too (audit: deduplicate
    // later); the checkbox-style toggle is the one carrying aria-pressed.
    const toggles = screen
      .getAllByRole("button", { name: "Mark complete" })
      .filter((b) => b.hasAttribute("aria-pressed"))
    expect(toggles).toHaveLength(1)
    expect(toggles[0].getAttribute("aria-pressed")).toBe("false")
    expect(screen.getByRole("heading", { level: 2, name: "Synthetic task" })).toBeTruthy()
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
  })
})
