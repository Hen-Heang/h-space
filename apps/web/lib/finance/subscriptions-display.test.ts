import { describe, expect, it } from "vitest"

import {
  activeCountLabel,
  formatLastCharge,
  mergedNamesLabel,
  planToCancelLabel,
  similarNamesLabel,
  sortSubscriptions,
  subscriptionTotals,
} from "./subscriptions-display"
import type { DetectedSubscription, SubscriptionStatus } from "@/types/finance"

function subscription(
  key: string,
  status: SubscriptionStatus,
  estimatedYearlyCostKrw = 120_000,
): DetectedSubscription {
  return {
    key,
    name: key,
    categoryName: null,
    categoryIcon: null,
    categoryColor: null,
    latestAmountKrw: 10_000,
    averageAmountKrw: 10_000,
    occurrenceCount: 3,
    lastPaymentDate: "2026-11-03",
    frequency: "monthly",
    estimatedYearlyCostKrw,
    status,
  }
}

describe("subscriptionTotals", () => {
  it("is zero for none", () => {
    expect(subscriptionTotals([])).toEqual({
      activeCount: 0,
      monthlyKrw: 0,
      yearlyKrw: 0,
      planToCancelCount: 0,
    })
  })

  it("leaves cancelled ones out of cost and rounds each monthly share", () => {
    expect(
      subscriptionTotals([
        subscription("a", "keep", 120_000),
        subscription("b", "plan_to_cancel", 100_000),
        subscription("c", "cancelled", 999_000),
      ]),
    ).toEqual({
      activeCount: 2,
      monthlyKrw: 10_000 + 8_333,
      yearlyKrw: 220_000,
      planToCancelCount: 1,
    })
  })
})

describe("sortSubscriptions", () => {
  it("moves cancelled to the end without reordering the rest or mutating input", () => {
    const input = [
      subscription("a", "cancelled"),
      subscription("b", "keep"),
      subscription("c", "review"),
    ]
    expect(sortSubscriptions(input).map((s) => s.key)).toEqual(["b", "c", "a"])
    expect(input.map((s) => s.key)).toEqual(["a", "b", "c"])
  })
})

describe("labels", () => {
  it("formats the last charge, passing through a bad date", () => {
    expect(formatLastCharge("2026-11-03")).toBe("Nov 3, 2026")
    expect(formatLastCharge("soon")).toBe("soon")
  })

  it("counts the spellings across suggestions", () => {
    const member = { key: "k", sample: "s", count: 1, totalKrw: 1 }
    expect(
      similarNamesLabel([{ members: [member, member] }, { members: [member, member, member] }]),
    ).toBe("Review 5 similar names")
    expect(similarNamesLabel([{ members: [member] }])).toBe("Review 1 similar name")
  })

  it("pluralises the rest", () => {
    expect(mergedNamesLabel(1)).toBe("1 merged name")
    expect(mergedNamesLabel(2)).toBe("2 merged names")
    expect(activeCountLabel(4)).toBe("4 active")
    expect(planToCancelLabel(1)).toBe("1 marked for cancellation")
  })
})
