// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({ pathname: "/finance" }))
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }))

import { FINANCE_LINKS, FinanceNav, isFinanceLinkActive } from "./finance-nav"

afterEach(() => {
  cleanup()
  nav.pathname = "/finance"
})

// jsdom applies no CSS, so these check structure and semantics; which tabs
// are visible at which width is covered by tests/e2e/finance-overview.e2e.ts.

describe("FINANCE_LINKS", () => {
  it("keeps every existing Finance route reachable", () => {
    expect(FINANCE_LINKS.map((link) => link.href)).toEqual([
      "/finance",
      "/finance/transactions",
      "/finance/budgets",
      "/finance/savings",
      "/finance/subscriptions",
      "/finance/review",
      "/finance/analytics",
      "/finance/settings",
    ])
  })
})

describe("isFinanceLinkActive", () => {
  it("matches Overview exactly and the other sections by prefix", () => {
    expect(isFinanceLinkActive("/finance", "/finance")).toBe(true)
    expect(isFinanceLinkActive("/finance/budgets", "/finance")).toBe(false)
    expect(isFinanceLinkActive("/finance/budgets", "/finance/budgets")).toBe(true)
    expect(isFinanceLinkActive("/finance/budgets/2026-11", "/finance/budgets")).toBe(true)
    expect(isFinanceLinkActive("/finance/budgetsx", "/finance/budgets")).toBe(false)
  })
})

describe("FinanceNav", () => {
  it("renders every section as a real link inside a labelled navigation", () => {
    render(<FinanceNav />)
    const region = screen.getByRole("navigation", { name: "Finance sections" })
    const hrefs = within(region)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
    expect(hrefs).toEqual(FINANCE_LINKS.map((link) => link.href))
  })

  it("marks only the current page", () => {
    nav.pathname = "/finance/transactions"
    render(<FinanceNav />)
    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page")
    expect(current.map((link) => link.textContent)).toEqual(["Transactions"])
  })

  it("names More after an overflow page while it is open", () => {
    nav.pathname = "/finance/review"
    render(<FinanceNav />)
    const trigger = screen.getByRole("button")
    expect(trigger).toHaveProperty("textContent", expect.stringContaining("Review"))
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu")
  })

  it("labels the trigger More on an always-visible page", () => {
    render(<FinanceNav />)
    expect(screen.getByRole("button").textContent).toContain("More")
  })
})
