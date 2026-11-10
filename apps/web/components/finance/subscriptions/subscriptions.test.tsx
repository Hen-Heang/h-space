// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const api = vi.hoisted(() => ({
  getMerchantNames: vi.fn(),
  mergeMerchants: vi.fn(),
  unmergeMerchants: vi.fn(),
}))
vi.mock("@/lib/api/finance", () => api)
vi.mock("@/lib/auth-store", () => ({ getUserId: () => "test-user" }))

import { MerchantNamesSection } from "./merchant-names-section"
import { SubscriptionRow } from "./subscription-row"
import { SUBSCRIPTION_STATUS_META } from "./subscription-status"
import { SubscriptionsSummary } from "./subscriptions-summary"
import type { DetectedSubscription } from "@/types/finance"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  window.localStorage.clear()
})

function subscription(overrides: Partial<DetectedSubscription> = {}): DetectedSubscription {
  return {
    key: "streaming",
    name: "Streaming Service",
    categoryName: "Entertainment",
    categoryIcon: null,
    categoryColor: null,
    latestAmountKrw: 17_000,
    averageAmountKrw: 16_500,
    occurrenceCount: 4,
    lastPaymentDate: "2026-11-03",
    frequency: "monthly",
    estimatedYearlyCostKrw: 198_000,
    status: "keep",
    ...overrides,
  }
}

describe("SubscriptionRow", () => {
  it("shows the amount, schedule and estimate, with the status as a labelled menu", () => {
    render(
      <ul>
        <SubscriptionRow subscription={subscription()} saving={false} onStatusChange={() => {}} />
      </ul>,
    )
    const row = screen.getByRole("listitem")
    expect(row.textContent).toContain("17,000")
    expect(row.textContent).toContain("Monthly · Last charge Nov 3, 2026 · Entertainment")
    expect(row.textContent).toContain("Est. ₩198,000/yr")
    const trigger = screen.getByRole("button", {
      name: "Change status for Streaming Service, currently Keep",
    })
    expect(trigger.className).toContain("text-foreground")
    expect(trigger.className).not.toContain("text-success")
  })

  it("keeps the status vocabulary", () => {
    expect(Object.values(SUBSCRIPTION_STATUS_META).map((meta) => meta.label)).toEqual([
      "Keep",
      "Review",
      "Plan to cancel",
      "Cancelled",
    ])
  })
})

describe("SubscriptionsSummary", () => {
  it("keeps the four old tile figures and leaves cancelled out of cost", () => {
    render(
      <SubscriptionsSummary
        subscriptions={[
          subscription({ estimatedYearlyCostKrw: 120_000 }),
          subscription({ key: "b", status: "plan_to_cancel", estimatedYearlyCostKrw: 240_000 }),
          subscription({ key: "c", status: "cancelled", estimatedYearlyCostKrw: 999_000 }),
        ]}
      />,
    )
    const section = screen.getByRole("region", { name: "Summary" })
    expect(section.textContent).toContain("30,000/mo")
    expect(section.textContent).toContain("Estimated ₩360,000 a year")
    expect(section.textContent).toContain("2 active")
    expect(section.textContent).toContain("1 marked for cancellation")
  })
})

describe("MerchantNamesSection", () => {
  function renderSection() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={client}>
        <MerchantNamesSection onChanged={() => {}} />
      </QueryClientProvider>,
    )
  }

  it("keeps suggestions behind a Review N similar names disclosure", async () => {
    api.getMerchantNames.mockResolvedValue({
      merges: [{ name: "Cloud Storage", variants: [{ key: "x", sample: "CLOUD STOR" }] }],
      suggestions: [
        {
          id: "s1",
          suggestedName: "Music App",
          members: [
            { key: "m1", sample: "MUSIC APP", count: 3, totalKrw: 30_000 },
            { key: "m2", sample: "Music App Premium", count: 2, totalKrw: 22_000 },
          ],
          occurrenceCount: 5,
          totalKrw: 52_000,
        },
      ],
    })
    renderSection()

    const toggle = await screen.findByRole("button", { name: /Review 2 similar names/ })
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByRole("button", { name: /Merge/ })).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByRole("button", { name: /Merge/ })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Not the same" })).toBeTruthy()
    expect(screen.getByLabelText("Show as")).toHaveProperty("value", "Music App")

    const merged = screen.getByRole("button", { name: /1 merged name/ })
    fireEvent.click(merged)
    expect(screen.getByRole("button", { name: "Undo merge for Cloud Storage" })).toBeTruthy()
  })

  it("explains when there is nothing to review", async () => {
    api.getMerchantNames.mockResolvedValue({ merges: [], suggestions: [] })
    renderSection()
    expect(await screen.findByText(/No similar merchant names to review/)).toBeTruthy()
  })
})
