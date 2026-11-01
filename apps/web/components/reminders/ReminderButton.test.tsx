/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Reminder } from "@/lib/reminders"

const state = vi.hoisted(() => ({ reminders: [] as unknown[] }))
vi.mock("@/hooks/useReminders", () => ({
  useReminders: () => ({ reminders: state.reminders, loading: false }),
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
