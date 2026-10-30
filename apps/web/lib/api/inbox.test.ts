import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const http = vi.hoisted(() => ({ hspaceRequest: vi.fn() }))
vi.mock("./hspace-http", () => http)

const flags = vi.hoisted(() => ({
  isSpringInboxEnabled: vi.fn(() => true),
  isVaultLiveEnabled: vi.fn(() => false),
  isCalendarIntegrationsEnabled: vi.fn(() => false),
}))
vi.mock("@/lib/feature-flags", () => flags)

// The Supabase store and the conversion targets must not be touched while the
// Spring store is selected.
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

beforeEach(() => {
  flags.isSpringInboxEnabled.mockReturnValue(true)
  http.hspaceRequest.mockResolvedValue(item)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("inboxApi on hspace-api", () => {
  it("lists with only the filters that narrow the result", async () => {
    http.hspaceRequest.mockResolvedValue([item])

    await expect(inboxApi.list({ status: "all", itemType: "idea" })).resolves.toEqual([item])
    expect(http.hspaceRequest).toHaveBeenCalledWith("/api/v1/inbox-items?itemType=idea&limit=500")

    await inboxApi.list({ status: "archived", limit: 20 })
    expect(http.hspaceRequest).toHaveBeenLastCalledWith(
      "/api/v1/inbox-items?status=archived&limit=20",
    )
  })

  it("treats an empty list response as no items", async () => {
    http.hspaceRequest.mockResolvedValue(undefined)
    await expect(inboxApi.list()).resolves.toEqual([])
  })

  it("creates with trimmed text and defaults, never sending a user id", async () => {
    await inboxApi.create({ title: "  ", content: "  Buy milk  ", itemType: "task" })

    expect(http.hspaceRequest).toHaveBeenCalledWith("/api/v1/inbox-items", {
      method: "POST",
      body: {
        title: null,
        content: "Buy milk",
        itemType: "task",
        tags: [],
        eventAt: null,
        goalId: null,
        source: "manual",
      },
    })
  })

  it("patches only the given fields, keeping explicit nulls", async () => {
    await inboxApi.update("item-1", { title: null, pinned: true })

    const [path, options] = http.hspaceRequest.mock.calls[0]
    expect(path).toBe("/api/v1/inbox-items/item-1")
    expect(options.method).toBe("PATCH")
    expect(JSON.parse(JSON.stringify(options.body))).toEqual({ title: null, pinned: true })
  })

  it("archives, restores and deletes through hspace-api", async () => {
    await inboxApi.archive("item-1")
    await inboxApi.restore("item-1")
    await inboxApi.remove("item-1")

    expect(http.hspaceRequest.mock.calls).toEqual([
      ["/api/v1/inbox-items/item-1", { method: "PATCH", body: { status: "archived" } }],
      ["/api/v1/inbox-items/item-1", { method: "PATCH", body: { status: "inbox" } }],
      ["/api/v1/inbox-items/item-1", { method: "DELETE" }],
    ])
  })

  it("stamps a conversion on the hspace-api item", async () => {
    await expect(inboxApi.convertToTask(item, "2026-10-31")).resolves.toEqual({ id: "task-1" })

    expect(conversions.tasks.create).toHaveBeenCalled()
    expect(http.hspaceRequest).toHaveBeenCalledWith("/api/v1/inbox-items/item-1", {
      method: "PATCH",
      body: { convertedToType: "task", convertedToId: "task-1", status: "processed" },
    })
    expect(supabaseFrom).not.toHaveBeenCalled()
  })

  it("encodes ids into the path", async () => {
    await inboxApi.get("a/b")
    expect(http.hspaceRequest).toHaveBeenCalledWith("/api/v1/inbox-items/a%2Fb")
  })
})

describe("inboxApi with the flag off", () => {
  it("stays on Supabase", async () => {
    flags.isSpringInboxEnabled.mockReturnValue(false)
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { ...item, item_type: "task" }, error: null })),
    }
    supabaseFrom.mockReturnValue(query)

    await inboxApi.get("item-1")

    expect(supabaseFrom).toHaveBeenCalledWith("kori_inbox_items")
    expect(http.hspaceRequest).not.toHaveBeenCalled()
  })
})
