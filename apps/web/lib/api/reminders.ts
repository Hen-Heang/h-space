import { supabase } from "@/lib/supabase"
import { requireUserId } from "@/lib/auth-store"
import { isSpringInboxEnabled } from "@/lib/feature-flags"
import {
  DEFAULT_REMINDER_TIMEZONE,
  type Reminder,
  type ReminderChannel,
  type ReminderEntityType,
  type ReminderInput,
  type ReminderStatus,
  type RecurrenceRule,
} from "@/lib/reminders"

// Universal Reminders over kori_reminders. Mirrors the notesApi/inboxApi
// shape: plain async functions, row<->camelCase mapping here,
// requireUserId() on writes. next_run_at is computed here (app layer, not a
// DB trigger — matches the rest of the codebase's convention) by calling the
// same kori_next_reminder_run RPC the UI uses for its live preview, so
// creation-time and preview-time next-run values can never disagree.

export const INBOX_REMINDERS_UNAVAILABLE =
  "Reminders for Inbox items aren't available yet while the Inbox moves to the new backend."

type ReminderRow = {
  id: string
  title: string
  body: string | null
  entity_type: ReminderEntityType
  entity_id: string | null
  scheduled_for: string | null
  recurrence: RecurrenceRule | null
  timezone: string
  channels: ReminderChannel[]
  status: ReminderStatus
  next_run_at: string | null
  last_sent_at: string | null
  last_error: string | null
  snoozed_until: string | null
  dedupe_key: string | null
  deep_link: string | null
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  "id, title, body, entity_type, entity_id, scheduled_for, recurrence, timezone, channels, status, next_run_at, last_sent_at, last_error, snoozed_until, dedupe_key, deep_link, created_at, updated_at"

function toReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    scheduledFor: row.scheduled_for,
    recurrence: row.recurrence,
    timezone: row.timezone,
    channels: row.channels ?? [],
    status: row.status,
    nextRunAt: row.next_run_at,
    lastSentAt: row.last_sent_at,
    lastError: row.last_error,
    snoozedUntil: row.snoozed_until,
    deepLink: row.deep_link,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Live "next reminder: ..." preview — calls the same SQL function the server-side dispatcher uses. */
export async function previewNextRun(
  recurrence: RecurrenceRule,
  timezone: string,
  after: Date = new Date(),
): Promise<Date | null> {
  const { data, error } = await supabase.rpc("kori_next_reminder_run", {
    p_recurrence: recurrence,
    p_timezone: timezone,
    p_after: after.toISOString(),
  })
  if (error) throw error
  return data ? new Date(data as string) : null
}

export interface ReminderListParams {
  entityType?: ReminderEntityType
  entityId?: string
  status?: ReminderStatus | "all"
}

export const remindersApi = {
  list: async (params: ReminderListParams = {}): Promise<Reminder[]> => {
    let query = supabase
      .from("kori_reminders")
      .select(SELECT_COLUMNS)
      .order("next_run_at", { ascending: true, nullsFirst: false })
    if (params.entityType) query = query.eq("entity_type", params.entityType)
    if (params.entityId) query = query.eq("entity_id", params.entityId)
    if (params.status && params.status !== "all") query = query.eq("status", params.status)
    const { data, error } = await query
    if (error) throw error
    return (data as unknown as ReminderRow[]).map(toReminder)
  },

  create: async (input: ReminderInput): Promise<Reminder> => {
    // The dispatcher (kori_dispatch_reminders) only finds inbox items in
    // Supabase's kori_inbox_items and cancels a reminder whose item it can't
    // find. Items captured while the inbox runs on hspace-api exist only
    // there, so such a reminder would save and then never be delivered.
    if (input.entityType === "inbox_item" && isSpringInboxEnabled()) {
      throw new Error(INBOX_REMINDERS_UNAVAILABLE)
    }
    const timezone = input.timezone ?? DEFAULT_REMINDER_TIMEZONE
    const nextRunAt = input.recurrence
      ? await previewNextRun(input.recurrence, timezone)
      : input.scheduledFor
        ? new Date(input.scheduledFor)
        : null

    const { data, error } = await supabase
      .from("kori_reminders")
      .insert({
        user_id: requireUserId(),
        title: input.title.trim(),
        body: input.body?.trim() || null,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        scheduled_for: input.scheduledFor ?? null,
        recurrence: input.recurrence ?? null,
        timezone,
        channels: input.channels ?? ["web", "telegram"],
        next_run_at: nextRunAt ? nextRunAt.toISOString() : null,
        deep_link: input.deepLink ?? null,
      })
      .select(SELECT_COLUMNS)
      .single()
    if (error) throw error
    return toReminder(data as unknown as ReminderRow)
  },

  pause: async (id: string): Promise<Reminder> => {
    const { data, error } = await supabase
      .from("kori_reminders")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(SELECT_COLUMNS)
      .single()
    if (error) throw error
    return toReminder(data as unknown as ReminderRow)
  },

  resume: async (id: string): Promise<Reminder> => {
    // Recompute next_run_at from "now" so a long-paused reminder doesn't
    // immediately fire a backlog of missed occurrences on resume.
    const { data: existing, error: fetchError } = await supabase
      .from("kori_reminders")
      .select(SELECT_COLUMNS)
      .eq("id", id)
      .single()
    if (fetchError) throw fetchError
    const reminder = toReminder(existing as unknown as ReminderRow)
    const nextRunAt = reminder.recurrence
      ? await previewNextRun(reminder.recurrence, reminder.timezone)
      : reminder.scheduledFor
        ? new Date(reminder.scheduledFor)
        : null

    const { data, error } = await supabase
      .from("kori_reminders")
      .update({
        status: "active",
        next_run_at: nextRunAt ? nextRunAt.toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(SELECT_COLUMNS)
      .single()
    if (error) throw error
    return toReminder(data as unknown as ReminderRow)
  },

  cancel: async (id: string): Promise<Reminder> => {
    const { data, error } = await supabase
      .from("kori_reminders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(SELECT_COLUMNS)
      .single()
    if (error) throw error
    return toReminder(data as unknown as ReminderRow)
  },

  snooze: async (id: string, minutes: number): Promise<Reminder> => {
    const until = new Date(Date.now() + minutes * 60_000).toISOString()
    const { data, error } = await supabase
      .from("kori_reminders")
      .update({
        snoozed_until: until,
        next_run_at: until,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(SELECT_COLUMNS)
      .single()
    if (error) throw error
    return toReminder(data as unknown as ReminderRow)
  },

  remove: async (id: string) => {
    const { error } = await supabase.from("kori_reminders").delete().eq("id", id)
    if (error) throw error
  },

  /** Cancels every active or paused reminder linked to one entity (RLS keeps it to the owner's rows). */
  cancelForEntity: async (entityType: ReminderEntityType, entityId: string): Promise<void> => {
    const { error } = await supabase
      .from("kori_reminders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .in("status", ["active", "paused"])
    if (error) throw error
  },
}
