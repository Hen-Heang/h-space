import { describe, expect, it } from "vitest"

import {
  budgetAlertsInput,
  draftFromPreferences,
  goalsInput,
  isGroupDirty,
  mergeSavedGroup,
  reviewsReportsInput,
  type SettingsDraft,
} from "./settings-form"
import type { FinancePreferences } from "@/types/finance"

const preferences: FinancePreferences = {
  monthlySpendingLimitKrw: null,
  targetSavingsRate: 20,
  essentialTargetPct: 50,
  budgetWatchThresholdPct: 70,
  budgetNearLimitThresholdPct: 90,
  monthlyReviewEnabled: true,
  financeReportEmail: null,
  weeklyReportEmailEnabled: false,
  monthlyReportEmailEnabled: false,
}

function draft(overrides: Partial<SettingsDraft> = {}): SettingsDraft {
  return { ...draftFromPreferences(preferences), ...overrides }
}

describe("draftFromPreferences", () => {
  it("turns stored values into editable strings, blank for no limit or email", () => {
    expect(draftFromPreferences(preferences)).toEqual({
      monthlyLimit: "",
      targetRate: "20",
      essentialTargetPct: "50",
      watchThreshold: "70",
      nearLimitThreshold: "90",
      monthlyReviewEnabled: true,
      financeReportEmail: "",
      weeklyReportEmailEnabled: false,
      monthlyReportEmailEnabled: false,
    })
    expect(
      draftFromPreferences({ ...preferences, monthlySpendingLimitKrw: 1_500_000 }).monthlyLimit,
    ).toBe("1500000")
  })
})

describe("goalsInput", () => {
  it("sends only the goals fields, with a blank limit as no limit", () => {
    expect(goalsInput(draft())).toEqual({
      ok: true,
      input: { monthlySpendingLimitKrw: null, targetSavingsRate: 20, essentialTargetPct: 50 },
    })
    expect(goalsInput(draft({ monthlyLimit: "2000000" }))).toMatchObject({
      ok: true,
      input: { monthlySpendingLimitKrw: 2_000_000 },
    })
  })

  it("keeps the existing messages for out-of-range and over-100 rules", () => {
    expect(goalsInput(draft({ essentialTargetPct: "120" }))).toEqual({
      ok: false,
      error: "Money rule percentages must be between 0 and 100.",
    })
    expect(goalsInput(draft({ targetRate: "abc" }))).toMatchObject({ ok: false })
    expect(goalsInput(draft({ essentialTargetPct: "60", targetRate: "45" }))).toEqual({
      ok: false,
      error: "Essentials and Future targets can't add up to more than 100%.",
    })
  })
})

describe("budgetAlertsInput", () => {
  it("sends both thresholds", () => {
    expect(budgetAlertsInput(draft())).toEqual({
      ok: true,
      input: { budgetWatchThresholdPct: 70, budgetNearLimitThresholdPct: 90 },
    })
  })

  it("rejects out-of-range and inverted thresholds with the existing messages", () => {
    expect(budgetAlertsInput(draft({ watchThreshold: "0" }))).toEqual({
      ok: false,
      error: "Budget thresholds must be between 1 and 99.",
    })
    expect(budgetAlertsInput(draft({ nearLimitThreshold: "" }))).toMatchObject({ ok: false })
    expect(budgetAlertsInput(draft({ watchThreshold: "90", nearLimitThreshold: "90" }))).toEqual({
      ok: false,
      error: "The watch threshold must be lower than the near-limit threshold.",
    })
  })
})

describe("reviewsReportsInput", () => {
  it("trims the email and sends blank as null", () => {
    expect(reviewsReportsInput(draft({ financeReportEmail: "  me@example.com " }))).toEqual({
      ok: true,
      input: {
        monthlyReviewEnabled: true,
        financeReportEmail: "me@example.com",
        weeklyReportEmailEnabled: false,
        monthlyReportEmailEnabled: false,
      },
    })
    expect(reviewsReportsInput(draft())).toMatchObject({
      ok: true,
      input: { financeReportEmail: null },
    })
  })

  it("rejects a malformed address with the existing message", () => {
    expect(reviewsReportsInput(draft({ financeReportEmail: "not-an-email" }))).toEqual({
      ok: false,
      error: "Enter a valid email address, or leave it blank to use your account email.",
    })
  })
})

describe("isGroupDirty / mergeSavedGroup", () => {
  it("tracks each group separately and ignores surrounding whitespace", () => {
    const saved = draft()
    const edited = draft({ watchThreshold: "60", financeReportEmail: " " })
    expect(isGroupDirty("budgetAlerts", edited, saved)).toBe(true)
    expect(isGroupDirty("goals", edited, saved)).toBe(false)
    expect(isGroupDirty("reviewsReports", edited, saved)).toBe(false)
    expect(isGroupDirty("reviewsReports", draft({ monthlyReviewEnabled: false }), saved)).toBe(true)
  })

  it("takes a saved group's server values and keeps other groups' edits", () => {
    const edited = draft({ watchThreshold: "60", targetRate: "25" })
    const fromServer = draft({ watchThreshold: "65" })
    const merged = mergeSavedGroup("budgetAlerts", edited, fromServer)
    expect(merged.watchThreshold).toBe("65")
    expect(merged.targetRate).toBe("25")
  })
})
