// Form helpers for Finance Settings (components/finance/settings).
//
// The settings page saves its preferences in three independent groups. The
// preferences endpoint already accepts any subset of fields (every field in
// updatePreferencesSchema is optional), so each group sends only its own
// fields. These are the same client-side checks the single form ran before,
// with the same messages, split by group. The server's schema is unchanged
// and still has the final say.
import type { UpdatePreferencesInput } from "@/lib/validation/finance"
import type { FinancePreferences } from "@/types/finance"

/** The editable copy of the preferences: every field as the user typed it. */
export interface SettingsDraft {
  monthlyLimit: string
  targetRate: string
  essentialTargetPct: string
  watchThreshold: string
  nearLimitThreshold: string
  monthlyReviewEnabled: boolean
  financeReportEmail: string
  weeklyReportEmailEnabled: boolean
  monthlyReportEmailEnabled: boolean
}

export type SettingsGroup = "goals" | "budgetAlerts" | "reviewsReports"

export type GroupResult = { ok: true; input: UpdatePreferencesInput } | { ok: false; error: string }

export function draftFromPreferences(preferences: FinancePreferences): SettingsDraft {
  return {
    monthlyLimit:
      preferences.monthlySpendingLimitKrw != null
        ? String(preferences.monthlySpendingLimitKrw)
        : "",
    targetRate: String(preferences.targetSavingsRate),
    essentialTargetPct: String(preferences.essentialTargetPct),
    watchThreshold: String(preferences.budgetWatchThresholdPct),
    nearLimitThreshold: String(preferences.budgetNearLimitThresholdPct),
    monthlyReviewEnabled: preferences.monthlyReviewEnabled,
    financeReportEmail: preferences.financeReportEmail ?? "",
    weeklyReportEmailEnabled: preferences.weeklyReportEmailEnabled,
    monthlyReportEmailEnabled: preferences.monthlyReportEmailEnabled,
  }
}

const GROUP_FIELDS: Record<SettingsGroup, (keyof SettingsDraft)[]> = {
  goals: ["monthlyLimit", "targetRate", "essentialTargetPct"],
  budgetAlerts: ["watchThreshold", "nearLimitThreshold"],
  reviewsReports: [
    "monthlyReviewEnabled",
    "financeReportEmail",
    "weeklyReportEmailEnabled",
    "monthlyReportEmailEnabled",
  ],
}

/** Whether a group has edits that haven't been saved yet. */
export function isGroupDirty(
  group: SettingsGroup,
  draft: SettingsDraft,
  saved: SettingsDraft,
): boolean {
  return GROUP_FIELDS[group].some((field) => {
    const a = draft[field]
    const b = saved[field]
    return typeof a === "string" && typeof b === "string" ? a.trim() !== b.trim() : a !== b
  })
}

/** Monthly limit, target savings rate and the money rule — saved together, since they're coupled. */
export function goalsInput(draft: SettingsDraft): GroupResult {
  const essentialPct = Number(draft.essentialTargetPct)
  const futurePct = Number(draft.targetRate)
  if (
    !Number.isFinite(essentialPct) ||
    essentialPct < 0 ||
    essentialPct > 100 ||
    !Number.isFinite(futurePct) ||
    futurePct < 0 ||
    futurePct > 100
  ) {
    return { ok: false, error: "Money rule percentages must be between 0 and 100." }
  }
  if (essentialPct + futurePct > 100) {
    return { ok: false, error: "Essentials and Future targets can't add up to more than 100%." }
  }
  return {
    ok: true,
    input: {
      monthlySpendingLimitKrw: draft.monthlyLimit.trim() === "" ? null : Number(draft.monthlyLimit),
      targetSavingsRate: futurePct,
      essentialTargetPct: essentialPct,
    },
  }
}

export function budgetAlertsInput(draft: SettingsDraft): GroupResult {
  const watchPct = Number(draft.watchThreshold)
  const nearLimitPct = Number(draft.nearLimitThreshold)
  if (
    !Number.isFinite(watchPct) ||
    !Number.isFinite(nearLimitPct) ||
    watchPct < 1 ||
    watchPct > 99 ||
    nearLimitPct < 1 ||
    nearLimitPct > 99
  ) {
    return { ok: false, error: "Budget thresholds must be between 1 and 99." }
  }
  if (watchPct >= nearLimitPct) {
    return {
      ok: false,
      error: "The watch threshold must be lower than the near-limit threshold.",
    }
  }
  return {
    ok: true,
    input: { budgetWatchThresholdPct: watchPct, budgetNearLimitThresholdPct: nearLimitPct },
  }
}

export function reviewsReportsInput(draft: SettingsDraft): GroupResult {
  const trimmedEmail = draft.financeReportEmail.trim()
  if (trimmedEmail !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return {
      ok: false,
      error: "Enter a valid email address, or leave it blank to use your account email.",
    }
  }
  return {
    ok: true,
    input: {
      monthlyReviewEnabled: draft.monthlyReviewEnabled,
      financeReportEmail: trimmedEmail === "" ? null : trimmedEmail,
      weeklyReportEmailEnabled: draft.weeklyReportEmailEnabled,
      monthlyReportEmailEnabled: draft.monthlyReportEmailEnabled,
    },
  }
}

export const GROUP_INPUT: Record<SettingsGroup, (draft: SettingsDraft) => GroupResult> = {
  goals: goalsInput,
  budgetAlerts: budgetAlertsInput,
  reviewsReports: reviewsReportsInput,
}

/**
 * After a group saves, its fields take the server's values; the other
 * groups keep whatever the user is still editing.
 */
export function mergeSavedGroup(
  group: SettingsGroup,
  draft: SettingsDraft,
  saved: SettingsDraft,
): SettingsDraft {
  const next = { ...draft }
  for (const field of GROUP_FIELDS[group]) {
    ;(next as Record<keyof SettingsDraft, unknown>)[field] = saved[field]
  }
  return next
}
