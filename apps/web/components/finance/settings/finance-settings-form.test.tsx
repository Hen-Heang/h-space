// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FinancePreferences } from "@/types/finance"

const stored: FinancePreferences = {
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

const api = vi.hoisted(() => ({
  updatePreferences: vi.fn(),
  downloadFinanceExport: vi.fn(),
}))
vi.mock("@/lib/api/finance", () => api)
vi.mock("@/lib/query/finance-queries", () => ({
  financeKeys: { preferences: () => ["finance", "test", "preferences"] },
  invalidateAfter: vi.fn(() => Promise.resolve()),
  preferencesQuery: () => ({
    queryKey: ["finance", "test", "preferences"],
    queryFn: async () => stored,
  }),
}))
// The lookup lists and reports have their own data; they're not under test here.
vi.mock("@/components/finance/settings/categories-section", () => ({
  CategoriesSection: () => null,
}))
vi.mock("@/components/finance/settings/payment-methods-section", () => ({
  PaymentMethodsSection: () => null,
}))
vi.mock("@/components/finance/settings/finance-reports-section", () => ({
  FinanceReportsSection: () => null,
}))

import { FinanceSettingsForm } from "./finance-settings-form"

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <FinanceSettingsForm />
    </QueryClientProvider>,
  )
}

function group(id: string): HTMLElement {
  return screen.getByRole("form", { name: new RegExp(id) })
}

beforeEach(() => {
  api.updatePreferences.mockImplementation(async (input: Partial<FinancePreferences>) => ({
    ...stored,
    ...input,
  }))
  // jsdom has no ResizeObserver; the Radix switch measures its thumb with it.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("FinanceSettingsForm", () => {
  it("keeps every section and deep-link id", async () => {
    renderForm()
    await screen.findByLabelText("Monthly spending limit (KRW)")
    for (const id of [
      "settings-goals",
      "settings-money-rule",
      "settings-budget-controls",
      "settings-reviews",
      "settings-email-reports",
      "settings-categories",
      "settings-payment-methods",
      "settings-reports",
      "settings-export",
    ]) {
      expect(document.getElementById(id), id).not.toBeNull()
    }
  })

  it("saves a group with only that group's fields and keeps other edits", async () => {
    renderForm()
    const watch = await screen.findByLabelText("Watch threshold (%)")
    fireEvent.change(watch, { target: { value: "60" } })
    fireEvent.change(screen.getByLabelText("Target savings rate (%)"), {
      target: { value: "25" },
    })

    const budgets = group("Budget controls")
    expect(within(budgets).getByText("Unsaved changes")).toBeTruthy()
    fireEvent.click(within(budgets).getByRole("button", { name: "Save budget controls" }))

    await waitFor(() => expect(api.updatePreferences).toHaveBeenCalledTimes(1))
    expect(api.updatePreferences).toHaveBeenCalledWith({
      budgetWatchThresholdPct: 60,
      budgetNearLimitThresholdPct: 90,
    })
    await within(budgets).findByText("Saved.")
    // The goals edit is still there, still unsaved.
    expect((screen.getByLabelText("Target savings rate (%)") as HTMLInputElement).value).toBe("25")
    expect(within(group("Goals and money rule")).getByText("Unsaved changes")).toBeTruthy()
  })

  it("shows a group's validation error in that group and doesn't save", async () => {
    renderForm()
    const near = await screen.findByLabelText("Near-limit threshold (%)")
    fireEvent.change(near, { target: { value: "60" } })
    const budgets = group("Budget controls")
    fireEvent.submit(budgets)
    expect(
      within(budgets).getByText("The watch threshold must be lower than the near-limit threshold."),
    ).toBeTruthy()
    expect(api.updatePreferences).not.toHaveBeenCalled()
  })

  it("uses switches for the review and report emails, saved with their group", async () => {
    renderForm()
    const review = await screen.findByRole("switch", { name: "Monthly review" })
    expect(review.getAttribute("aria-checked")).toBe("true")
    fireEvent.click(review)
    fireEvent.click(screen.getByRole("switch", { name: "Weekly summary email" }))
    fireEvent.click(screen.getByRole("button", { name: "Save reviews and reports" }))
    await waitFor(() =>
      expect(api.updatePreferences).toHaveBeenCalledWith({
        monthlyReviewEnabled: false,
        financeReportEmail: null,
        weeklyReportEmailEnabled: true,
        monthlyReportEmailEnabled: false,
      }),
    )
  })

  it("reports a failed save in the group that failed", async () => {
    api.updatePreferences.mockRejectedValueOnce(new Error("network"))
    renderForm()
    const preset = await screen.findByRole("button", { name: /Growth/ })
    fireEvent.click(preset)
    expect(preset.getAttribute("aria-pressed")).toBe("true")
    const goals = group("Goals and money rule")
    fireEvent.click(within(goals).getByRole("button", { name: "Save goals" }))
    expect(await within(goals).findByText("Couldn't save your settings. Try again.")).toBeTruthy()
    expect(api.updatePreferences).toHaveBeenCalledWith({
      monthlySpendingLimitKrw: null,
      targetSavingsRate: 25,
      essentialTargetPct: 50,
    })
  })
})
