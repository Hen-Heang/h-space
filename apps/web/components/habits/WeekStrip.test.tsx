/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { HabitCheckIn } from "@/lib/types"
import { WeekStrip } from "./WeekStrip"

// Synthetic habit data only.
const NOW = new Date("2026-07-15T12:00:00") // a Wednesday

function checkin(date: string): HabitCheckIn {
  return { id: date, habitId: "h1", date, completed: true, createdAt: `${date}T00:00:00.000Z` }
}

afterEach(cleanup)

function renderStrip(props: Partial<Parameters<typeof WeekStrip>[0]> = {}) {
  const onToggle = vi.fn()
  render(
    <WeekStrip
      habitLabel="Read"
      checkins={[]}
      startedAt="2026-07-01T09:00:00.000Z"
      onToggle={onToggle}
      now={NOW}
      {...props}
    />,
  )
  return { onToggle }
}

describe("WeekStrip", () => {
  it("shows the last 7 days, oldest first, ending today", () => {
    renderStrip()
    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(7)
    expect(buttons[0].getAttribute("aria-label")).toBe("Read, Thursday 9 July")
    expect(buttons[6].getAttribute("aria-label")).toBe("Read, today")
  })

  it("marks done days as pressed", () => {
    renderStrip({ checkins: [checkin("2026-07-14")] })
    expect(
      screen.getByRole("button", { name: "Read, Tuesday 14 July" }).getAttribute("aria-pressed"),
    ).toBe("true")
    expect(screen.getByRole("button", { name: "Read, today" }).getAttribute("aria-pressed")).toBe(
      "false",
    )
  })

  it("toggles the tapped date", () => {
    const { onToggle } = renderStrip()
    fireEvent.click(screen.getByRole("button", { name: "Read, Monday 13 July" }))
    expect(onToggle).toHaveBeenCalledWith("2026-07-13")
  })

  it("disables days before the habit started", () => {
    const { onToggle } = renderStrip({ startedAt: "2026-07-14T09:00:00" })
    const beforeStart = screen.getByRole("button", { name: "Read, Monday 13 July" })
    expect((beforeStart as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(beforeStart)
    expect(onToggle).not.toHaveBeenCalled()
    expect(
      (screen.getByRole("button", { name: "Read, Tuesday 14 July" }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it("marks a date that is still saving as busy", () => {
    renderStrip({ pendingDates: new Set(["2026-07-15"]) })
    expect(screen.getByRole("button", { name: "Read, today" }).getAttribute("aria-busy")).toBe(
      "true",
    )
  })
})
