/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Task } from "@/lib/tasks"

import { TodayTasksCard } from "./TodayTasksCard"

const toggle = vi.fn()
let state: {
  loading: boolean
  error: string
  tasks: Task[]
  overdueIds: string[]
}

vi.mock("@/hooks/useTodaysTasks", () => ({
  useTodaysTasks: () => {
    const pending = state.tasks.filter((t) => !t.completed)
    return {
      loading: state.loading,
      error: state.error,
      totalCount: state.tasks.length,
      handleToggleTaskCompletion: toggle,
      groups: {
        overdue: pending.filter((t) => state.overdueIds.includes(t.id)),
        scheduled: [],
        anytime: pending.filter((t) => !state.overdueIds.includes(t.id)),
        completed: state.tasks.filter((t) => t.completed),
        isOverdue: (t: Task) => state.overdueIds.includes(t.id),
      },
    }
  },
}))

function task(id: string, title: string, extra: Partial<Task> = {}): Task {
  return {
    id,
    title,
    description: "",
    completed: false,
    user_id: "u",
    goal_id: "goal-1",
    start_date: "2026-11-03T09:00:00Z",
    end_date: "2026-11-03T10:00:00Z",
    ...extra,
  }
}

beforeEach(() => {
  toggle.mockReset()
  state = { loading: false, error: "", tasks: [], overdueIds: [] }
})
afterEach(cleanup)

describe("TodayTasksCard", () => {
  it("renders each task as a toggle button beside a link — never nested", () => {
    state.tasks = [task("t1", "Draft the weekly plan")]
    render(<TodayTasksCard />)

    const link = screen.getByRole("link", { name: /Draft the weekly plan/ })
    expect(link.getAttribute("href")).toBe("/goals/goal-1?task=t1")
    expect(within(link).queryByRole("button")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: 'Mark "Draft the weekly plan" complete' }))
    expect(toggle).toHaveBeenCalledWith("t1", false)
  })

  it("links a standalone task to the calendar and flags overdue ones", () => {
    state.tasks = [task("t2", "Personal errand", { goal_id: null })]
    state.overdueIds = ["t2"]
    render(<TodayTasksCard />)
    expect(screen.getByRole("link", { name: /Personal errand/ }).getAttribute("href")).toBe(
      "/goals/calendar",
    )
    expect(screen.getByText("Overdue")).toBeTruthy()
  })

  it("caps the list at three and says how many more there are", () => {
    state.tasks = ["a", "b", "c", "d", "e"].map((id) => task(id, `Task ${id}`))
    render(<TodayTasksCard />)
    expect(screen.getAllByRole("link", { name: /^Task / })).toHaveLength(3)
    expect(screen.getByText("+2 more tasks today")).toBeTruthy()
  })

  it("shows an alert on error and a next step when empty", () => {
    state.error = "Failed to load tasks."
    const { unmount } = render(<TodayTasksCard />)
    expect(screen.getByRole("alert").textContent).toContain("Couldn't load today's tasks.")
    unmount()

    state.error = ""
    render(<TodayTasksCard />)
    expect(screen.getByText(/No tasks for today/)).toBeTruthy()
    expect(screen.getByRole("link", { name: "Add one" }).getAttribute("href")).toBe("/goals/tasks")
  })
})
