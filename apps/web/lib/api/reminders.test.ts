import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const flags = vi.hoisted(() => ({ isSpringInboxEnabled: vi.fn(() => false) }))
vi.mock("@/lib/feature-flags", () => flags)
vi.mock("@/lib/auth-store", () => ({ requireUserId: () => "user-1" }))

const supabase = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }))
vi.mock("@/lib/supabase", () => ({ supabase }))

import { INBOX_REMINDERS_UNAVAILABLE, remindersApi } from "./reminders"

const row = {
  id: "rem-1",
  title: "Follow up",
  body: null,
  entity_type: "inbox_item",
  entity_id: "item-1",
  scheduled_for: "2026-11-02T00:00:00Z",
  recurrence: null,
  timezone: "Asia/Seoul",
  channels: ["web"],
  status: "active",
  next_run_at: "2026-11-02T00:00:00Z",
  last_sent_at: null,
  last_error: null,
  snoozed_until: null,
  dedupe_key: null,
  deep_link: null,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
}

function insertQuery() {
  const query = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(async () => ({ data: row, error: null })),
  }
  supabase.from.mockReturnValue(query)
  return query
}

const inboxReminder = {
  title: "Follow up",
  entityType: "inbox_item" as const,
  entityId: "item-1",
  scheduledFor: "2026-11-02T00:00:00Z",
}

beforeEach(() => {
  flags.isSpringInboxEnabled.mockReturnValue(false)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("remindersApi.create for inbox items", () => {
  it("refuses while the inbox runs on hspace-api, without writing anything", async () => {
    flags.isSpringInboxEnabled.mockReturnValue(true)

    await expect(remindersApi.create(inboxReminder)).rejects.toThrow(INBOX_REMINDERS_UNAVAILABLE)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it("saves while the inbox is on Supabase", async () => {
    const query = insertQuery()

    await expect(remindersApi.create(inboxReminder)).resolves.toMatchObject({ id: "rem-1" })
    expect(supabase.from).toHaveBeenCalledWith("kori_reminders")
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: "inbox_item",
        entity_id: "item-1",
        user_id: "user-1",
      }),
    )
  })

  it("still saves reminders for other entities while the inbox runs on hspace-api", async () => {
    flags.isSpringInboxEnabled.mockReturnValue(true)
    insertQuery()

    await expect(
      remindersApi.create({ ...inboxReminder, entityType: "note", entityId: "note-1" }),
    ).resolves.toMatchObject({ id: "rem-1" })
  })
})

describe("remindersApi.cancelForEntity", () => {
  function updateQuery(error: unknown = null) {
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn(async () => ({ error })),
    }
    supabase.from.mockReturnValue(query)
    return query
  }

  it("cancels only the entity's active and paused reminders", async () => {
    const query = updateQuery()

    await remindersApi.cancelForEntity("inbox_item", "item-1")

    expect(supabase.from).toHaveBeenCalledWith("kori_reminders")
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ status: "cancelled" }))
    expect(query.eq).toHaveBeenCalledWith("entity_type", "inbox_item")
    expect(query.eq).toHaveBeenCalledWith("entity_id", "item-1")
    expect(query.in).toHaveBeenCalledWith("status", ["active", "paused"])
  })

  it("surfaces a Supabase error", async () => {
    updateQuery({ message: "denied" })

    await expect(remindersApi.cancelForEntity("inbox_item", "item-1")).rejects.toEqual({
      message: "denied",
    })
  })
})
