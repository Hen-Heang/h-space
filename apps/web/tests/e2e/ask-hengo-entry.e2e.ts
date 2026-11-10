import { expect, test, type Page } from "@playwright/test"

import { financeFixture } from "./finance-fixtures"

// "Ask Hengo" — the assistant's single entry point in the top bar, and its two
// modes in /chat. Synthetic session and synthetic data only; every request
// that would leave this machine is aborted. Needs a running dev server:
//
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test ask-hengo-entry --workers=1

test.use({ screenshot: "off", trace: "off" })
// The dev server compiles /chat on first visit, which can take most of a minute.
test.describe.configure({ timeout: 180_000 })

const USER_ID = "11111111-1111-4111-8111-111111111111"
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJleHAiOjIwMDAwMDAwMDB9.signature"

const conversationRow = {
  id: "55555555-5555-4555-8555-555555555555",
  user_id: USER_ID,
  scenario_id: null,
  title: "General Practice",
  conversation_type: "FREE_CHAT",
  model_used: null,
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
  kori_messages: [{ count: 0 }],
}

async function installSession(page: Page) {
  await page.addInitScript(
    ({ userId, token }) => {
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
      window.localStorage.setItem("theme", "light")
    },
    { userId: USER_ID, token: JWT },
  )
  // Fallback first: nothing leaves this machine.
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname
    if (host === "127.0.0.1" || host === "localhost") return route.continue()
    return route.abort()
  })
  await page.route("**/rest/v1/**", (route) => {
    const request = route.request()
    const table = new URL(request.url()).pathname.split("/").at(-1)
    const single = (request.headers()["accept"] ?? "").includes("vnd.pgrst.object")
    if (table === "kori_conversations") {
      const body = single ? conversationRow : [conversationRow]
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      })
    }
    if (single) {
      return route.fulfill({
        status: 406,
        contentType: "application/json",
        body: JSON.stringify({ code: "PGRST116", message: "No rows" }),
      })
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })
  await page.route("**/api/ai/**", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  )
  await page.route("**/api/finance/**", (route) => {
    const data = financeFixture(new URL(route.request().url()))
    return route.fulfill({
      status: data === undefined ? 404 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        data === undefined ? { error: { code: "NOT_FOUND", message: "Not mocked" } } : { data },
      ),
    })
  })
}

const ROUTES = ["/home", "/goals/tasks", "/learn", "/finance"]
const WIDTHS = [320, 375, 430, 1024, 1440]

const askHengo = (page: Page) => page.getByRole("banner").getByRole("link", { name: "Ask Hengo" })
const modeButton = (page: Page, name: string) =>
  page.getByRole("group", { name: "Assistant mode" }).getByRole("button", { name })

test("Ask Hengo is visible in the top bar on every workspace, at phone and desktop widths", async ({
  page,
}) => {
  test.setTimeout(300_000)
  await installSession(page)
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 768 ? 860 : 900 })
    for (const route of ROUTES) {
      await page.goto(route)
      const link = askHengo(page)
      await expect(link, `${route} @ ${width}`).toBeVisible({ timeout: 60_000 })
      await expect(link).toHaveAttribute("href", "/chat")
      await expect(link).toHaveText("Ask Hengo")
      const box = (await link.boundingBox())!
      expect(box.x + box.width, `${route} @ ${width}: inside viewport`).toBeLessThanOrEqual(width)
      // One assistant entry point: no floating launcher.
      await expect(page.getByRole("button", { name: "Open AI Assistant" })).toHaveCount(0)
      const overflow = await page.evaluate(() => {
        const header = document.querySelector("header")!
        return {
          doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          header: header.scrollWidth - header.clientWidth,
        }
      })
      expect(overflow, `${route} @ ${width}: no horizontal overflow`).toEqual({ doc: 0, header: 0 })
    }
  }
})

test("Home has no duplicate Ask Hengo button", async ({ page }) => {
  await installSession(page)
  await page.goto("/home")
  await expect(askHengo(page)).toBeVisible({ timeout: 60_000 })
  await expect(page.locator("main").getByRole("link", { name: /ask hengo/i })).toHaveCount(0)
  await expect(page.locator("main").getByRole("button", { name: "Quick capture" })).toBeVisible()
})

for (const width of [320, 375, 1280]) {
  test(`opens General chat, then switches to Search my workspace (${width}px)`, async ({
    page,
  }) => {
    await installSession(page)
    await page.setViewportSize({ width, height: 860 })
    await page.goto("/home")
    await askHengo(page).click()
    await expect(page).toHaveURL(/\/chat$/, { timeout: 60_000 })
    await expect(modeButton(page, "General chat")).toHaveAttribute("aria-pressed", "true")
    await expect(modeButton(page, "Search my workspace")).toHaveAttribute("aria-pressed", "false")
    await page.screenshot({ path: `test-results/ask-hengo/general-${width}.png` })
    const switchBox = (await page.getByRole("group", { name: "Assistant mode" }).boundingBox())!
    expect(switchBox.x + switchBox.width).toBeLessThanOrEqual(width)

    await modeButton(page, "Search my workspace").click()
    await expect(page).toHaveURL(/\/chat\?mode=memory$/)
    await expect(modeButton(page, "Search my workspace")).toHaveAttribute("aria-pressed", "true")
    await expect(modeButton(page, "General chat")).toHaveAttribute("aria-pressed", "false")
    // The shell header owns the title on desktop; the panel names the mode on phones.
    await expect(
      page.locator("main").getByRole("heading", { name: "Search my workspace" }),
    ).toBeAttached()
    // "saved notes, " is only listed while Notes is on (NEXT_PUBLIC_FEATURE_NOTES=true).
    await expect(page.getByText(/inbox captures, and journal entries/)).toBeVisible()
    await page.screenshot({ path: `test-results/ask-hengo/workspace-${width}.png` })

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })
}

test("direct links still open their mode, and the Korean tools stay reachable", async ({
  page,
}) => {
  await installSession(page)
  await page.setViewportSize({ width: 375, height: 860 })

  await page.goto("/chat?mode=memory")
  await expect(modeButton(page, "Search my workspace")).toHaveAttribute("aria-pressed", "true", {
    timeout: 60_000,
  })

  await page.goto("/ask-hengo", { waitUntil: "commit" })
  await expect(page).toHaveURL(/\/chat\?mode=memory$/, { timeout: 60_000 })

  await page.goto("/chat?mode=analyze")
  const tools = page.getByRole("button", { name: "Korean tool: Analyze" })
  await expect(tools).toBeVisible({ timeout: 60_000 })
  await expect(modeButton(page, "General chat")).toHaveAttribute("aria-pressed", "false")
  await expect(modeButton(page, "Search my workspace")).toHaveAttribute("aria-pressed", "false")

  await tools.click()
  await page.getByRole("menuitemradio", { name: "Review" }).click()
  await expect(page).toHaveURL(/\/chat\?mode=corrections$/)

  await page.goto("/mistakes")
  await expect(page).toHaveURL(/\/chat\?mode=corrections$/, { timeout: 60_000 })
})

test("Ask Hengo and the mode switch work from the keyboard with visible focus", async ({
  page,
}) => {
  await installSession(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/home")
  const link = askHengo(page)
  await expect(link).toBeVisible({ timeout: 60_000 })

  // Tab to the button from the top of the page.
  let reached = false
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press("Tab")
    reached = await link.evaluate((el) => el === document.activeElement)
  }
  expect(reached).toBe(true)
  const ring = await link.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(ring).not.toBe("none")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/chat$/, { timeout: 60_000 })

  const workspace = modeButton(page, "Search my workspace")
  await workspace.focus()
  expect(await workspace.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/chat\?mode=memory$/)
  await expect(workspace).toHaveAttribute("aria-pressed", "true")
})
