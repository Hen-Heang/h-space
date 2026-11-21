import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth-store", () => ({ requireUserId: () => "user-1" }))
const supabaseFrom = vi.hoisted(() => vi.fn())
vi.mock("@/lib/supabase", () => ({ supabase: { from: supabaseFrom } }))
const conversions = vi.hoisted(() => ({
  notes: { list: vi.fn(async () => []), create: vi.fn(async () => ({})) },
  tasks: { create: vi.fn(async () => ({ id: "task-1" })) },
  journal: { create: vi.fn(async () => ({ id: "entry-1" })) },
}))
vi.mock("./notes", () => ({ notesApi: conversions.notes }))
vi.mock("./goals", () => ({ tasksApi: conversions.tasks }))
vi.mock("./journal", () => ({ journalApi: conversions.journal }))
const reminders = vi.hoisted(() => ({ cancelForEntity: vi.fn(async () => undefined) }))
vi.mock("./reminders", () => ({ remindersApi: reminders }))

import type { InboxItem } from "@/lib/inbox"
import { inboxApi } from "./inbox"

const item: InboxItem = {
  id: "item-1",
  title: "Title",
  content: "Content",
  itemType: "task",
  tags: [],
  capturedAt: "2026-10-30T00:00:00Z",
  eventAt: null,
  goalId: null,
  status: "inbox",
  source: "manual",
  pinned: false,
  convertedToType: null,
  convertedToId: null,
  createdAt: "2026-10-30T00:00:00Z",
  updatedAt: "2026-10-30T00:00:00Z",
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("inboxApi on Supabase", () => {
  it("reads kori_inbox_items", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { ...item, item_type: "task" }, error: null })),
    }
    supabaseFrom.mockReturnValue(query)

    await inboxApi.get("item-1")

    expect(supabaseFrom).toHaveBeenCalledWith("kori_inbox_items")
  })

  it("leaves reminders to the dispatcher when deleting", async () => {
    supabaseFrom.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn(async () => ({ error: null })),
    })

    await inboxApi.remove("item-1")

    expect(supabaseFrom).toHaveBeenCalledWith("kori_inbox_items")
    expect(reminders.cancelForEntity).not.toHaveBeenCalled()
  })

  it("stamps a conversion on the source row without deleting it", async () => {
    const eq = vi.fn(async () => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    supabaseFrom.mockReturnValue({ update })

    await expect(inboxApi.convertToTask(item, "2026-10-31")).resolves.toEqual({ id: "task-1" })

    expect(conversions.tasks.create).toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({
      converted_to_type: "task",
      converted_to_id: "task-1",
      status: "processed",
    })
    expect(eq).toHaveBeenCalledWith("id", "item-1")
  })
})
