/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Reminder } from "@/lib/reminders"

const state = vi.hoisted(() => ({ reminders: [] as unknown[], loading: false }))
vi.mock("@/hooks/useReminders", () => ({
  useReminders: () => ({ reminders: state.reminders, loading: state.loading }),
  useReminderMutations: () => ({
    pause: { mutateAsync: vi.fn() },
    cancel: { mutateAsync: vi.fn() },
  }),
}))
vi.mock("./ReminderDialog", () => ({ ReminderDialog: () => null }))

import { ReminderButton } from "./ReminderButton"

const active = {
  id: "rem-1",
  title: "Follow up",
  recurrence: null,
  status: "active",
} as unknown as Reminder

afterEach(() => {
  cleanup()
  state.reminders = []
  state.loading = false
})

const props = { entityType: "inbox_item" as const, entityId: "item-1", defaultTitle: "Item" }

describe("ReminderButton", () => {
  it("offers to add a reminder by default", () => {
    render(<ReminderButton {...props} />)
    expect(screen.getByRole("button", { name: "Add reminder" })).toBeTruthy()
  })

  it("hides 'Add reminder' when creating isn't allowed", () => {
    render(<ReminderButton {...props} allowCreate={false} />)
    expect(screen.queryByRole("button", { name: "Add reminder" })).toBeNull()
  })

  it("still lets an existing reminder be managed when creating isn't allowed", () => {
    state.reminders = [active]
    render(<ReminderButton {...props} allowCreate={false} />)
    expect(screen.getByRole("button", { name: "Manage reminder" })).toBeTruthy()
  })
})

describe("ReminderButton while loading", () => {
  it("reserves the button's space without an interactive control", () => {
    state.loading = true
    const { container } = render(<ReminderButton {...props} />)
    expect(screen.queryByRole("button")).toBeNull()
    const placeholder = container.querySelector('[data-slot="reminder-placeholder"]')
    expect(placeholder?.getAttribute("aria-hidden")).toBe("true")
  })

  it("reserves nothing when creating isn't allowed", () => {
    state.loading = true
    const { container } = render(<ReminderButton {...props} allowCreate={false} />)
    expect(container.firstChild).toBeNull()
  })
})
