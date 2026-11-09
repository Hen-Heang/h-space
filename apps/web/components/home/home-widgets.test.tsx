/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DailyMission } from "@/lib/api"
import type { Habit } from "@/lib/types"

// Synthetic habits only. `streaks` maps habit id → current streak.
const habitState = vi.hoisted(() => ({
  habits: [] as Habit[],
  streaks: {} as Record<string, number>,
}))

vi.mock("@/hooks/useHabits", () => ({
  toCheckinDate: () => "2026-11-09",
  useHabits: () => ({ activeHabits: habitState.habits, loading: false, error: null }),
  useHabitCheckins: (habitId: string) => ({
    checkins: [],
    currentStreak: habitState.streaks[habitId] ?? 0,
    loading: false,
    toggleCheckin: vi.fn(),
  }),
}))

import { CompactSummary } from "./home-primitives"
import { LearningWidget } from "./LearningWidget"
import { TodayHabitCheckins } from "./TodayHabitCheckins"

afterEach(() => {
  cleanup()
  habitState.habits = []
  habitState.streaks = {}
})

function mission(statuses: Array<"completed" | "pending">): DailyMission {
  return {
    id: "m1",
    dateKey: "2026-11-09",
    title: "Practice",
    reason: "",
    estimatedMinutes: 10,
    focusSkillCodes: [],
    createdAt: "2026-11-09T00:00:00Z",
    items: statuses.map((status, i) => ({ id: `i${i}`, status }) as DailyMission["items"][number]),
  }
}

const habit = (id: string, label: string): Habit => ({
  id,
  label,
  category: "reading",
  active: true,
  startedAt: "2026-01-01",
  createdAt: "2026-01-01T00:00:00Z",
})

describe("CompactSummary", () => {
  it("uses a muted navigation link by default", () => {
    render(
      <CompactSummary title="Active goals" action={{ href: "/goals", label: "All goals" }}>
        <p>rows</p>
      </CompactSummary>,
    )
    const link = screen.getByRole("link", { name: "All goals" })
    expect(link.className).toContain("text-muted-foreground")
    expect(link.className).not.toContain("text-primary")
  })

  it("uses the accent only for an emphasised next step", () => {
    render(
      <CompactSummary title="Korean practice" action={{ href: "/practice", label: "Start practice", emphasis: true }}>
        <p>rows</p>
      </CompactSummary>,
    )
    expect(screen.getByRole("link", { name: "Start practice" }).className).toContain("text-primary")
  })

  it("renders a quieter h3 than the page's section headings", () => {
    render(
      <CompactSummary title="Active goals">
        <p>rows</p>
      </CompactSummary>,
    )
    const heading = screen.getByRole("heading", { level: 3, name: "Active goals" })
    expect(heading.className).toContain("text-sm")
    expect(heading.className).toContain("text-muted-foreground")
    expect(heading.className).not.toContain("text-base")
  })
})

describe("LearningWidget", () => {
  const props = { loading: false, error: false, streakDays: 0 }

  it("offers practice, in the accent colour, while some is left", () => {
    render(<LearningWidget {...props} mission={mission(["completed", "pending"])} />)
    const link = screen.getByRole("link", { name: "Start practice" })
    expect(link.getAttribute("href")).toBe("/practice")
    expect(link.className).toContain("text-primary")
  })

  it.each([
    ["all practice is done", { mission: mission(["completed"]) }],
    ["nothing is planned", { mission: mission([]) }],
    ["it failed to load", { mission: null, error: true }],
  ])("calls the /learn link 'Open Learning' when %s", (_label, overrides) => {
    render(<LearningWidget {...props} {...overrides} />)
    const link = screen.getByRole("link", { name: "Open Learning" })
    expect(link.getAttribute("href")).toBe("/learn")
    expect(link.className).toContain("text-muted-foreground")
    expect(screen.queryByRole("link", { name: "Go to Learning" })).toBeNull()
  })
})

describe("TodayHabitCheckins", () => {
  it("names its link 'All habits'", () => {
    habitState.habits = [habit("h1", "Read")]
    render(<TodayHabitCheckins />)
    expect(screen.getByRole("link", { name: "All habits" }).getAttribute("href")).toBe("/growth/habits")
  })

  it("shows habit streaks as plain text, not a flame", () => {
    habitState.habits = [habit("h1", "Read"), habit("h2", "Walk")]
    habitState.streaks = { h1: 12, h2: 1 }
    const { container } = render(<TodayHabitCheckins />)
    expect(screen.getByLabelText("12-day streak").textContent).toBe("12 days")
    expect(screen.getByLabelText("1-day streak").textContent).toBe("1 day")
    expect(container.querySelector(".lucide-flame")).toBeNull()
  })
})
