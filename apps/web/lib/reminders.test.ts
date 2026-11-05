import { afterEach, describe, expect, it, vi } from "vitest"

import {
  computeNextRunAt,
  DEFAULT_REMINDER_TIMEZONE,
  describeRecurrence,
  getDeviceTimeZone,
  isReminderInputValid,
  validateReminderInput,
  type RecurrenceRule,
} from "./reminders"

describe("computeNextRunAt", () => {
  it("returns later today for a daily reminder when the time hasn't passed yet", () => {
    const rule: RecurrenceRule = { frequency: "daily", time: "21:00" }
    const after = new Date("2026-07-15T05:00:00.000Z") // 14:00 KST
    const next = computeNextRunAt(rule, "Asia/Seoul", after)
    // 21:00 KST on 2026-07-15 = 12:00 UTC — compare the actual instant (getTime),
    // not toISOString()'s string form, since TZDate renders it with a zoned
    // offset (+09:00) rather than normalizing to "Z".
    expect(next.getTime()).toBe(Date.parse("2026-07-15T12:00:00.000Z"))
  })

  it("rolls to tomorrow for a daily reminder when today's time has already passed", () => {
    const rule: RecurrenceRule = { frequency: "daily", time: "09:00" }
    const after = new Date("2026-07-15T12:00:00.000Z") // 21:00 KST, past 09:00
    const next = computeNextRunAt(rule, "Asia/Seoul", after)
    expect(next.getTime()).toBe(Date.parse("2026-07-16T00:00:00.000Z")) // 09:00 KST on the 16th
  })

  it("finds the next matching weekday for a weekly reminder", () => {
    // 2026-07-15 is a Wednesday. anchorWeekday 1 = Monday.
    const rule: RecurrenceRule = { frequency: "weekly", time: "09:00", anchorWeekday: 1 }
    const after = new Date("2026-07-15T00:00:00.000Z")
    const next = computeNextRunAt(rule, "Asia/Seoul", after)
    const nextInSeoul = new Date(next.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
    expect(nextInSeoul.getDay()).toBe(1)
    expect(nextInSeoul.getDate()).toBe(20) // the following Monday
  })

  it("finds the next matching day among several selected weekdays", () => {
    // 2026-07-15 is Wednesday (3). Selected: Mon(1), Wed(3), Fri(5).
    const rule: RecurrenceRule = { frequency: "weekdays", time: "23:59", weekdays: [1, 3, 5] }
    const after = new Date("2026-07-15T00:00:00.000Z") // before 23:59 KST on Wed the 15th
    const next = computeNextRunAt(rule, "Asia/Seoul", after)
    const nextInSeoul = new Date(next.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
    expect(nextInSeoul.getDate()).toBe(15) // still hits Wednesday the 15th itself
    expect(nextInSeoul.getDay()).toBe(3)
  })

  it("skips to the next selected weekday once today's occurrence has passed", () => {
    const rule: RecurrenceRule = { frequency: "weekdays", time: "00:01", weekdays: [1, 3, 5] }
    const after = new Date("2026-07-15T20:00:00.000Z") // well past 00:01 KST on Wed
    const next = computeNextRunAt(rule, "Asia/Seoul", after)
    const nextInSeoul = new Date(next.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
    expect(nextInSeoul.getDay()).toBe(5) // Friday
  })

  it("rolls correctly across a month boundary", () => {
    const rule: RecurrenceRule = { frequency: "daily", time: "09:00" }
    const after = new Date("2026-02-01T01:00:00.000Z") // 10:00 KST on Feb 1 — already past 09:00
    const next = computeNextRunAt(rule, "Asia/Seoul", after)
    const nextInSeoul = new Date(next.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
    expect(nextInSeoul.getMonth()).toBe(1) // February (0-indexed)
    expect(nextInSeoul.getDate()).toBe(2)
  })

  it("keeps the wall-clock time correct across a US DST spring-forward boundary", () => {
    // America/New_York springs forward on 2026-03-08 at 2:00 AM -> 3:00 AM.
    const rule: RecurrenceRule = { frequency: "daily", time: "09:00" }
    const before = new Date("2026-03-07T20:00:00.000Z") // ~15:00 EST on Mar 7, before 09:00 the next day
    const next = computeNextRunAt(rule, "America/New_York", before)
    const hourInZone = Number(
      next.toLocaleString("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        hour12: false,
      }),
    )
    expect(hourInZone % 24).toBe(9)
  })

  it("keeps the wall-clock time correct across a US DST fall-back boundary", () => {
    // America/New_York falls back on 2026-11-01.
    const rule: RecurrenceRule = { frequency: "daily", time: "09:00" }
    const before = new Date("2026-10-31T20:00:00.000Z")
    const next = computeNextRunAt(rule, "America/New_York", before)
    const hourInZone = Number(
      next.toLocaleString("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        hour12: false,
      }),
    )
    expect(hourInZone % 24).toBe(9)
  })

  it("is deterministic — same inputs always produce the same output", () => {
    const rule: RecurrenceRule = { frequency: "weekly", time: "18:30", anchorWeekday: 4 }
    const after = new Date("2026-07-15T00:00:00.000Z")
    const a = computeNextRunAt(rule, "Asia/Seoul", after)
    const b = computeNextRunAt(rule, "Asia/Seoul", after)
    expect(a.getTime()).toBe(b.getTime())
  })
})

describe("describeRecurrence", () => {
  it("describes a daily recurrence", () => {
    expect(describeRecurrence({ frequency: "daily", time: "09:00" })).toBe("Every day at 9:00 AM")
  })

  it("describes a weekly recurrence with the anchor weekday", () => {
    expect(describeRecurrence({ frequency: "weekly", time: "21:00", anchorWeekday: 1 })).toBe(
      "Every Mon at 9:00 PM",
    )
  })

  it("describes a selected-weekdays recurrence", () => {
    expect(describeRecurrence({ frequency: "weekdays", time: "07:05", weekdays: [3, 1] })).toBe(
      "Mon, Wed at 7:05 AM",
    )
  })

  it("formats midnight and noon correctly", () => {
    expect(describeRecurrence({ frequency: "daily", time: "00:00" })).toBe("Every day at 12:00 AM")
    expect(describeRecurrence({ frequency: "daily", time: "12:00" })).toBe("Every day at 12:00 PM")
  })
})

describe("validateReminderInput", () => {
  it("requires a title", () => {
    expect(
      validateReminderInput({
        title: "  ",
        scheduledFor: "2026-07-20T00:00:00.000Z",
        channels: ["web"],
      }).title,
    ).toBeTruthy()
  })

  it("requires either a one-time schedule or a recurrence", () => {
    expect(validateReminderInput({ title: "Reminder", channels: ["web"] }).schedule).toBeTruthy()
  })

  it("accepts a valid one-time reminder", () => {
    expect(
      isReminderInputValid({
        title: "Reminder",
        scheduledFor: "2026-07-20T00:00:00.000Z",
        channels: ["web"],
      }),
    ).toBe(true)
  })

  it("requires an anchor weekday for weekly recurrence", () => {
    const errors = validateReminderInput({
      title: "Reminder",
      recurrence: { frequency: "weekly", time: "09:00" },
      channels: ["web"],
    })
    expect(errors.schedule).toBeTruthy()
  })

  it("requires at least one weekday for weekdays recurrence", () => {
    const errors = validateReminderInput({
      title: "Reminder",
      recurrence: { frequency: "weekdays", time: "09:00", weekdays: [] },
      channels: ["web"],
    })
    expect(errors.schedule).toBeTruthy()
  })

  it("requires at least one channel", () => {
    expect(
      validateReminderInput({
        title: "Reminder",
        scheduledFor: "2026-07-20T00:00:00.000Z",
        channels: [],
      }).channels,
    ).toBeTruthy()
  })

  it("accepts a valid recurring reminder", () => {
    expect(
      isReminderInputValid({
        title: "Reminder",
        recurrence: { frequency: "daily", time: "09:00" },
        channels: ["web", "telegram"],
      }),
    ).toBe(true)
  })
})

describe("getDeviceTimeZone", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockResolvedZone(timeZone: string | undefined) {
    const real = Intl.DateTimeFormat.prototype.resolvedOptions
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(function (
      this: Intl.DateTimeFormat,
    ) {
      return { ...real.call(this), timeZone } as Intl.ResolvedDateTimeFormatOptions
    })
  }

  it("returns the zone the device reports", () => {
    mockResolvedZone("Europe/Paris")
    expect(getDeviceTimeZone()).toBe("Europe/Paris")
  })

  it("falls back to the default when the device reports no zone", () => {
    mockResolvedZone(undefined)
    expect(getDeviceTimeZone()).toBe(DEFAULT_REMINDER_TIMEZONE)
  })

  it("falls back to the default when the reported zone isn't a real one", () => {
    mockResolvedZone("Not/AZone")
    expect(getDeviceTimeZone()).toBe(DEFAULT_REMINDER_TIMEZONE)
  })
})
