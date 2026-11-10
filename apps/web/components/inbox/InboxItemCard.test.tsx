/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { InboxItem } from "@/lib/inbox"

vi.mock("@/components/reminders/ReminderButton", () => ({ ReminderButton: () => null }))
vi.mock("@/hooks/useInbox", () => {
  const mutation = () => ({ mutateAsync: vi.fn(), isPending: false })
  return {
    useInboxMutations: () => ({
      togglePinned: mutation(),
      archive: mutation(),
      restore: mutation(),
      remove: mutation(),
      convertToNote: mutation(),
      convertToTask: mutation(),
      convertToJournal: mutation(),
    }),
  }
})

import { InboxItemCard } from "./InboxItemCard"

// Synthetic item — no real user content.
const ITEM: InboxItem = {
  id: "inbox-1",
  title: "Synthetic idea",
  content: "Synthetic capture text",
  itemType: "note",
  tags: [],
  capturedAt: "2026-11-10T00:00:00.000Z",
  eventAt: null,
  goalId: null,
  status: "inbox",
  source: "manual",
  pinned: false,
  convertedToType: null,
  convertedToId: null,
  createdAt: "2026-11-10T00:00:00.000Z",
  updatedAt: "2026-11-10T00:00:00.000Z",
}

/** Radix menus open on pointerdown in jsdom. */
async function openConvertMenu() {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Convert" }), {
    button: 0,
    ctrlKey: false,
    pointerType: "mouse",
  })
  return screen.findAllByRole("menuitem")
}

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe("InboxItemCard — Convert menu", () => {
  it("offers task and journal but not note while Notes is retired (the default)", async () => {
    render(<InboxItemCard item={ITEM} />)
    const labels = (await openConvertMenu()).map((el) => el.textContent?.trim())
    expect(labels).toEqual(
      expect.arrayContaining(["Convert to task (today)", "Convert to journal entry"]),
    )
    expect(labels).not.toContain("Convert to note")
  })

  it("offers Convert to note again with NEXT_PUBLIC_FEATURE_NOTES=true", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_NOTES", "true")
    render(<InboxItemCard item={ITEM} />)
    const labels = (await openConvertMenu()).map((el) => el.textContent?.trim())
    expect(labels).toContain("Convert to note")
  })
})
