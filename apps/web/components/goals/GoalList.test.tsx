/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { computeListGoalHealth } from "@/lib/goal-health"
import { GOAL_HEALTH_LABELS, type Goal } from "@/lib/goals"

import { GoalList } from "./GoalList"

const USER_ID = "11111111-1111-4111-8111-111111111111"

vi.mock("@/lib/auth-store", () => ({ getUserId: () => USER_ID }))
// The list only calls goalsApi.update (icon change); keep Supabase out of it.
vi.mock("@/lib/api", () => ({ goalsApi: { update: vi.fn(), list: vi.fn() } }))

afterEach(cleanup)

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-1",
    title: "Build a calm daily planning routine that has a deliberately long title",
    description: "",
    target_date: null,
    status: "active",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    metadata: { goal_type: "general" },
    user_id: USER_ID,
    outcome_progress: 0,
    health_status: "on_track",
    taskCounts: { total: 3, completed: 1, incomplete: 2 },
    keyResults: [],
    tasks: [],
    ...overrides,
  }
}

function renderList(goals: Goal[], props: Partial<React.ComponentProps<typeof GoalList>> = {}) {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <GoalList
        goals={goals}
        isLoading={false}
        isDeleting={null}
        sortOption={{ field: "created_at", direction: "desc" }}
        onDeleteGoal={vi.fn()}
        onToggleStar={vi.fn()}
        onToggleComplete={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  )
}

describe("GoalList (list view)", () => {
  it("makes each goal one real link to its page, with the full title", () => {
    renderList([goal()])
    const link = screen.getByRole("link", { name: /Build a calm daily planning routine/ })
    expect(link.getAttribute("href")).toBe("/goals/goal-1")
    // The whole title is there — wrapping (line-clamp-2), not cut in the DOM.
    expect(link.textContent).toBe(
      "Build a calm daily planning routine that has a deliberately long title",
    )
  })

  it("keeps the actions as separate controls, never nested inside the link", () => {
    renderList([goal()])
    const link = screen.getByRole("link", { name: /Build a calm/ })
    expect(within(link).queryByRole("button")).toBeNull()
    expect(screen.getByRole("button", { name: "Goal actions" })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Change icon for/ })).toBeTruthy()
    // The favourite toggle is still a labelled button (shown from sm up).
    expect(screen.getByRole("button", { name: "Add to favorites" })).toBeTruthy()
  })

  it("shows status, task count and progress on the metadata line", () => {
    const g = goal()
    renderList([g])
    // Health is computed live from the goal, the same way the list does it.
    const label = GOAL_HEALTH_LABELS[computeListGoalHealth(g, new Date()).status]
    expect(screen.getByText(label)).toBeTruthy()
    expect(screen.getByText(/1\/3 tasks/)).toBeTruthy()
    expect(screen.getAllByText(/33%/).length).toBeGreaterThan(0)
  })

  it("renders the toolbar in the same control row as the view toggle", () => {
    renderList([goal()], { toolbar: <button type="button">Sort</button> })
    const sort = screen.getByRole("button", { name: "Sort" })
    const listView = screen.getByRole("button", { name: "List view" })
    // One row holds both: the sort menu's row also contains the view toggle.
    expect(sort.closest(".justify-between")?.contains(listView)).toBe(true)
  })

  it("keeps the toolbar and shows one empty state when there are no goals", () => {
    renderList([], {
      toolbar: <button type="button">Sort</button>,
      emptyState: { title: "No goals yet", description: "Create your first goal." },
    })
    expect(screen.getByRole("button", { name: "Sort" })).toBeTruthy()
    expect(screen.getByText("No goals yet")).toBeTruthy()
    expect(screen.getByText("Create your first goal.")).toBeTruthy()
  })

  it("hides owner actions on someone else's goal", () => {
    renderList([goal({ user_id: "someone-else" })])
    expect(screen.queryByRole("button", { name: "Goal actions" })).toBeNull()
    expect(screen.getByRole("link", { name: /Build a calm/ })).toBeTruthy()
  })
})
