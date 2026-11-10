import { expect, test, type Page } from "@playwright/test"

import type { FinanceOverviewSummary, Transaction } from "../../types/finance"
import { financeFixture } from "./finance-fixtures"

// Finance redesign checks (Overview + navigation + the floating Add button).
// Synthetic session, synthetic /api/finance/* data — fictional names and
// amounts only, never real records. Needs a running dev server:
//
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test finance-overview --workers=1
//
// Screenshots land in test-results/finance-redesign/ (gitignored).

test.use({ screenshot: "off", trace: "off" })

const USER_ID = "11111111-1111-4111-8111-111111111111"
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJleHAiOjIwMDAwMDAwMDB9.signature"

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440]

/**
 * The stress case: amounts in the hundreds of billions of won, a deeply
 * negative month, a transaction with no category, a USD entry, and
 * descriptions far longer than a row.
 */
function extremeOverview(month: string): FinanceOverviewSummary {
  const base = financeFixture(
    new URL(`http://127.0.0.1/api/finance/overview?month=${month}`),
  ) as FinanceOverviewSummary
  const huge = 987_654_321_000
  const longText =
    "Annual equipment renewal for the synthetic workshop including shipping, installation and a very long note"
  const recent: Transaction[] = [
    {
      ...base.recentTransactions[0]!,
      id: "00000000-0000-4000-8000-0000000000a1",
      type: "expense",
      description: longText,
      amountKrw: huge,
      categoryId: null,
      categoryName: null,
      categoryColor: null,
    },
    {
      ...base.recentTransactions[1]!,
      id: "00000000-0000-4000-8000-0000000000a2",
      type: "expense",
      description: "Synthetic USD subscription",
      currency: "USD",
      originalAmount: 12.99,
      exchangeRate: 1385,
      amountKrw: 17991,
    },
    ...base.recentTransactions.slice(2),
  ]
  return {
    ...base,
    totals: {
      ...base.totals,
      totalIncomeKrw: 1_200_000,
      totalExpenseKrw: huge,
      netCashFlowKrw: 1_200_000 - huge,
      savingsRatePct: -82_303_593.4,
    },
    savingsHealth: { targetRatePct: 20, deltaPct: -82_303_613.4, status: "below" },
    budgetHealth: base.budgetHealth && {
      ...base.budgetHealth,
      totalSpentKrw: huge,
      remainingKrw: base.budgetHealth.totalBudgetKrw - huge,
      usagePct: 9_999,
      status: "exceeded",
    },
    categories: [
      { ...base.categories[0]!, categoryName: longText, amountKrw: huge },
      ...base.categories.slice(1),
    ],
    financialHealth: { ...base.financialHealth, unclassifiedKrw: 75_000 },
    recentTransactions: recent,
  }
}

async function installSession(
  page: Page,
  { dark = false, extreme = false }: { dark?: boolean; extreme?: boolean } = {},
) {
  await page.addInitScript(
    ({ userId, token, dark }) => {
      window.localStorage.setItem(
        "hspace-auth",
        JSON.stringify({
          accessToken: token,
          refreshToken: "refresh",
          expiresAt: 2_000_000_000_000,
          user: { id: userId, email: "browser-test@example.com", name: "Test", imageUrl: null },
          supabaseToken: token,
          supabaseTokenExpiresAt: 2_000_000_000_000,
        }),
      )
      window.localStorage.setItem(`hengo:onboarding:${userId}`, "done")
      window.localStorage.setItem("theme", dark ? "dark" : "light")
    },
    { userId: USER_ID, token: JWT, dark },
  )
  // Fallback first: nothing leaves this machine.
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname
    if (host === "127.0.0.1" || host === "localhost") return route.continue()
    return route.abort()
  })
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  )
  await page.route("**/api/ai/**", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  )
  await page.route("**/api/finance/**", (route) => {
    const url = new URL(route.request().url())
    const isOverview = url.pathname.replace(/\/$/, "") === "/api/finance/overview"
    const data =
      extreme && isOverview
        ? extremeOverview(url.searchParams.get("month") ?? "2026-11")
        : financeFixture(url)
    return route.fulfill({
      status: data === undefined ? 404 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        data === undefined ? { error: { code: "NOT_FOUND", message: "Not mocked" } } : { data },
      ),
    })
  })
}

function viewport(width: number) {
  return { width, height: width < 768 ? 860 : 900 }
}

/** Elements inside <main> whose box pokes past the viewport's right edge. */
async function overflowingElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth + 1
    const offenders: string[] = []
    if (document.documentElement.scrollWidth > limit) {
      offenders.push(`document scrollWidth ${document.documentElement.scrollWidth} > ${limit}`)
    }
    for (const el of Array.from(document.querySelectorAll("#main-content *, main *"))) {
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      if (box.right > limit) {
        offenders.push(
          `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} → ${Math.round(box.right)}`,
        )
      }
    }
    return offenders.slice(0, 8)
  })
}

test.describe("Finance overview", () => {
  for (const extreme of [false, true]) {
    test(`reflows without horizontal overflow (${extreme ? "extreme" : "typical"} data)`, async ({
      page,
    }) => {
      test.setTimeout(180_000)
      await installSession(page, { extreme })
      await page.setViewportSize(viewport(WIDTHS[0]!))
      await page.goto("/finance")
      const net = page.getByTestId("finance-net-cash-flow")
      await expect(net).toBeVisible({ timeout: 60_000 })
      if (extreme) await expect(net).toContainText("-")

      for (const width of WIDTHS) {
        await page.setViewportSize(viewport(width))
        await page.waitForTimeout(150)
        expect.soft(await overflowingElements(page), `overflow at ${width}px`).toEqual([])
        await page.screenshot({
          path: `test-results/finance-redesign/overview-${extreme ? "extreme" : "typical"}-${width}.png`,
          fullPage: true,
          scale: "css",
          animations: "disabled",
        })
      }
    })
  }

  test("dark mode renders the same hierarchy", async ({ page }) => {
    await installSession(page, { dark: true })
    for (const width of [375, 1440]) {
      await page.setViewportSize(viewport(width))
      await page.goto("/finance")
      await expect(page.getByTestId("finance-net-cash-flow")).toBeVisible({ timeout: 60_000 })
      await page.screenshot({
        path: `test-results/finance-redesign/overview-dark-${width}.png`,
        fullPage: true,
        scale: "css",
        animations: "disabled",
      })
    }
  })
})

test.describe("Finance navigation", () => {
  const nav = (page: Page) => page.getByRole("navigation", { name: "Finance sections" })

  test("phones show three tabs plus More, and More reaches the rest", async ({ page }) => {
    await installSession(page)
    await page.setViewportSize(viewport(375))
    await page.goto("/finance")
    for (const label of ["Overview", "Transactions", "Budgets"]) {
      await expect(nav(page).getByRole("link", { name: label, exact: true })).toBeVisible()
    }
    await expect(nav(page).getByRole("link", { name: "Savings", exact: true })).toBeHidden()
    await expect(nav(page).getByRole("link", { name: "Overview", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    )

    // Keyboard: focus the trigger, open with Enter, arrow through, Escape closes.
    const more = nav(page).getByRole("button", { name: /More/ })
    await more.focus()
    await page.keyboard.press("Enter")
    const menu = page.getByRole("menu")
    await expect(menu).toBeVisible()
    const items = menu.getByRole("menuitem")
    await expect(items.filter({ visible: true })).toHaveText([
      "Savings",
      "Subscriptions",
      "Review",
      "Analytics",
      "Settings",
    ])
    await page.keyboard.press("Escape")
    await expect(menu).toBeHidden()
    await expect(more).toBeFocused()

    // Choosing an entry navigates, and More then names the open page.
    await more.click()
    await menu.getByRole("menuitem", { name: "Review" }).click()
    await expect(page).toHaveURL(/\/finance\/review$/)
    await expect(nav(page).getByRole("button", { name: /Review/ })).toBeVisible()
  })

  test("320px moves Budgets into More so the row still fits", async ({ page }) => {
    await installSession(page)
    await page.setViewportSize(viewport(320))
    await page.goto("/finance/budgets")
    await expect(nav(page).getByRole("link", { name: "Budgets", exact: true })).toBeHidden()
    await expect(nav(page).getByRole("button", { name: /Budgets/ })).toBeVisible()
    expect(await overflowingElements(page)).toEqual([])
  })

  test("a long page name in More never pushes the row off-screen", async ({ page }) => {
    test.setTimeout(120_000)
    await installSession(page)
    for (const route of ["/finance/subscriptions", "/finance/analytics", "/finance/settings"]) {
      await page.setViewportSize(viewport(320))
      await page.goto(route)
      const name = new RegExp(route.split("/").at(-1)!, "i")
      await expect(nav(page).getByRole("button", { name })).toBeVisible({ timeout: 60_000 })
      for (const width of [320, 375, 430, 768]) {
        await page.setViewportSize(viewport(width))
        await page.waitForTimeout(100)
        expect.soft(await overflowingElements(page), `${route} at ${width}px`).toEqual([])
      }
    }
  })

  test("wide screens show all eight tabs and no More", async ({ page }) => {
    await installSession(page)
    await page.setViewportSize(viewport(1440))
    await page.goto("/finance/analytics")
    const links = nav(page).getByRole("link")
    await expect(links.filter({ visible: true })).toHaveCount(8)
    await expect(nav(page).getByRole("button", { name: /More/ })).toBeHidden()
    await expect(nav(page).getByRole("link", { name: "Analytics" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })
})

test.describe("Finance add button", () => {
  test("sits just above the bottom nav on phones, with no AI launcher beside it", async ({
    page,
  }) => {
    await installSession(page)
    await page.setViewportSize(viewport(375))
    await page.goto("/finance")
    const add = page.getByRole("button", { name: "Add transaction" })
    await expect(add).toBeVisible({ timeout: 60_000 })
    // Ask Hengo is in the top bar; there is no floating launcher any more.
    await expect(page.getByRole("button", { name: "Open AI Assistant" })).toHaveCount(0)
    await expect(page.getByRole("banner").getByRole("link", { name: "Ask Hengo" })).toBeVisible()
    const a = (await add.boundingBox())!
    const nav = (await page.getByRole("navigation", { name: "Primary" }).boundingBox())!
    // Clears the bottom nav, and isn't left floating far above it.
    expect(a.y + a.height).toBeLessThanOrEqual(nav.y)
    expect(nav.y - (a.y + a.height)).toBeLessThan(32)

    // It opens the transaction sheet, and Escape returns focus to it.
    await add.click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toBeHidden()
  })

  test("shows its label from tablet width up", async ({ page }) => {
    await installSession(page)
    await page.setViewportSize(viewport(1024))
    await page.goto("/finance")
    const add = page.getByRole("button", { name: "Add transaction" })
    await expect(add).toBeVisible({ timeout: 60_000 })
    await expect(add.getByText("Add transaction")).toBeVisible()
  })
})
