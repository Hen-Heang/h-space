import { expect, test } from "@playwright/test"

// H-Vault public-surface checks. These run signed out: account management
// needs a login, and the data boundary is RLS (see
// supabase/tests/vault_accounts_rls.sql), so the browser-level checks here
// are that the route is login-gated and that public pages carry no account
// data.

test.describe("H-Vault (signed out)", () => {
  test("deep link to /vault redirects to login", async ({ page }) => {
    await page.goto("/vault")
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
  })

  test("landing page shows a generic H-Vault card without account data", async ({ page }) => {
    await page.goto("/")
    const card = page.locator("article", { has: page.getByRole("heading", { name: "H-Vault" }) })
    await card.scrollIntoViewIfNeeded()
    await expect(card).toBeVisible()
    await expect(card.getByRole("link", { name: /Open app/ })).toHaveAttribute("href", "/vault")

    const text = (await page.locator("body").innerText()).toLowerCase()
    expect(text).not.toMatch(/@example\.(com|org)/)
    expect(text).not.toContain("needs review")
    expect(await page.locator('input[type="password"]').count()).toBe(0)
  })
})
