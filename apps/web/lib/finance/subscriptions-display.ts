// Display-only helpers for the Subscriptions page
// (components/finance/subscriptions). The estimates themselves come from the
// server's subscription detection; these only total and label them.
import type { MerchantMergeSuggestion } from "@/lib/api/finance"
import type { DetectedSubscription } from "@/types/finance"

export const SUBSCRIPTION_FREQUENCY_LABEL: Record<DetectedSubscription["frequency"], string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  irregular: "Irregular",
}

export type SubscriptionTotals = {
  activeCount: number
  monthlyKrw: number
  yearlyKrw: number
  planToCancelCount: number
}

/** The figures the old summary tiles showed; cancelled ones don't count toward cost. */
export function subscriptionTotals(subscriptions: DetectedSubscription[]): SubscriptionTotals {
  const active = subscriptions.filter((s) => s.status !== "cancelled")
  return {
    activeCount: active.length,
    monthlyKrw: active.reduce((sum, s) => sum + Math.round(s.estimatedYearlyCostKrw / 12), 0),
    yearlyKrw: active.reduce((sum, s) => sum + s.estimatedYearlyCostKrw, 0),
    planToCancelCount: subscriptions.filter((s) => s.status === "plan_to_cancel").length,
  }
}

/** Cancelled subscriptions sink to the bottom; the order is otherwise kept. */
export function sortSubscriptions(subscriptions: DetectedSubscription[]): DetectedSubscription[] {
  return [...subscriptions].sort(
    (a, b) => (a.status === "cancelled" ? 1 : 0) - (b.status === "cancelled" ? 1 : 0),
  )
}

/** "Nov 3, 2026"; the raw value if it isn't a date. */
export function formatLastCharge(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function activeCountLabel(count: number): string {
  return `${count} active`
}

export function planToCancelLabel(count: number): string {
  return `${count} marked for cancellation`
}

/** "Review 5 similar names" — counts the spellings across every open suggestion. */
export function similarNamesLabel(suggestions: Pick<MerchantMergeSuggestion, "members">[]): string {
  const names = suggestions.reduce((sum, suggestion) => sum + suggestion.members.length, 0)
  return `Review ${names} similar ${names === 1 ? "name" : "names"}`
}

export function mergedNamesLabel(count: number): string {
  return `${count} merged ${count === 1 ? "name" : "names"}`
}
