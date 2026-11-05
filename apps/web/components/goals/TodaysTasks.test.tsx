/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Task } from "@/lib/tasks"

import { TodaysTasks } from "./TodaysTasks"

// Synthetic tasks only. The hook is mocked so the component renders without
// Supabase; these cases pin which time labels a row shows in each group.
function task(id: string, title: string, extra: Partial<Task> = {}): Task {
  return {
    id,
    title,
    description: "",
    completed: false,
    goal_id: null,
    is_anytime: true,
    daily_start_time: null,
    daily_end_time: null,
    ...extra,
  } as Task
}

const carriedOver = task("t1", "Carried over from yesterday")
const lateToday = task("t2", "Timed and already late", {
  is_anytime: false,
  daily_start_time: "08:00:00",
  daily_end_time: "08:30:00",
})
const laterToday = task("t3", "Timed later today", {
  is_anytime: false,
  daily_start_time: "21:00:00",
  daily_end_time: "22:00:00",
})
const whenever = task("t4", "Whenever today")

const overdueIds = new Set(["t1", "t2"])

vi.mock("@/hooks/useTodaysTasks", () => ({
  useTodaysTasks: () => ({
    tasks: [carriedOver, lateToday, laterToday, whenever],
    loading: false,
    error: null,
    availableGoals: [],
    selectedGoalIds: [],
    newTaskTitle: "",
    setNewTaskTitle: vi.fn(),
    newTaskGoalId: null,
    setNewTaskGoalId: vi.fn(),
    isMarkingAll: false,
    canUndo: false,
    completedCount: 0,
    totalCount: 4,
    progressPct: 0,
    groups: {
      overdue: [carriedOver],
      scheduled: [lateToday, laterToday],
      anytime: [whenever],
      completed: [],
      isOverdue: (t: Task) => overdueIds.has(t.id),
    },
    goalTitleById: {},
    toggleGoal: vi.fn(),
    toggleAll: vi.fn(),
    createTask: vi.fn(),
    handleToggleTaskCompletion: vi.fn(),
    handleMarkAllCompleted: vi.fn(),
    handleUndoMarkAllCompleted: vi.fn(),
    editTask: vi.fn(),
    deleteTask: vi.fn(),
  }),
}))

afterEach(cleanup)

function row(title: string) {
  const li = screen.getByRole("link", { name: title }).closest("li")
  if (!li) throw new Error(`no row for ${title}`)
  return li
}

describe("TodaysTasks rows", () => {
  it("doesn't repeat 'Anytime' under the Anytime header, but keeps it for screen readers", () => {
    render(<TodaysTasks />)
    const li = row("Whenever today")
    const srOnly = li.querySelector(".sr-only")
    expect(srOnly?.textContent).toBe("Anytime")
    // The only "Anytime" text in the row is the sr-only one.
    expect(within(li).getAllByText("Anytime")).toHaveLength(1)
  })

  it("doesn't repeat 'Overdue' under the Overdue header, but keeps it for screen readers", () => {
    render(<TodaysTasks />)
    const li = row("Carried over from yesterday")
    expect(li.querySelector(".sr-only")?.textContent).toBe("Overdue")
    expect(li.textContent).not.toContain("Overdue · ")
    // A carried-over anytime task still says it was an anytime task.
    expect(li.textContent).toContain("Anytime")
  })

  it("still flags a scheduled task that ran late today as overdue", () => {
    render(<TodaysTasks />)
    const li = row("Timed and already late")
    expect(li.textContent).toContain("Overdue · 08:00")
    expect(li.querySelector(".sr-only")).toBeNull()
  })

  it("shows the start time for a scheduled task", () => {
    render(<TodaysTasks />)
    expect(row("Timed later today").textContent).toContain("21:00")
  })
})
