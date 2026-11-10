import { expect, test, type Page } from "@playwright/test"

import { financeFixture } from "./finance-fixtures"

// Finance redesign Phase F: the screens rebuilt in Phases D and E
// (Transactions, Budgets, Savings, Subscriptions, Review, Analytics,
// Settings). Synthetic session, synthetic /api/finance/* data — fictional
// names and amounts only, never real records. Needs a running dev server:
//
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx playwright test finance-screens --workers=1
//
// Screenshots land in test-results/finance-redesign/ (gitignored).

test.use({ screenshot: "off", trace: "off" })

const USER_ID = "11111111-1111-4111-8111-111111111111"
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJleHAiOjIwMDAwMDAwMDB9.signature"

const ROUTES = [
  "transactions",
  "budgets",
  "savings",
  "subscriptions",
  "review",
  "analytics",
  "settings",
] as const

const WIDTHS = [320, 375, 768, 1024, 1440]

async function installSession(page: Page, { dark = false }: { dark?: boolean } = {}) {
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

function viewport(width: number) {
  return { width, height: width < 768 ? 860 : 900 }
}

async function openRoute(page: Page, route: string) {
  await page.goto(`/finance/${route}`)
  await page.waitForLoadState("networkidle")
  // Every Finance screen renders at least one section heading once loaded.
  await expect(page.locator("main h2").first()).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(300)
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

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/finance-redesign/${name}.png`,
    fullPage: true,
    scale: "css",
    animations: "disabled",
  })
}

test.describe("Finance screens (Phases D and E)", () => {
  for (const route of ROUTES) {
    test(`${route}: no horizontal overflow, light and dark`, async ({ page }) => {
      test.setTimeout(180_000)
      await installSession(page)
      await page.setViewportSize(viewport(WIDTHS[0]!))
      await openRoute(page, route)
      for (const width of WIDTHS) {
        await page.setViewportSize(viewport(width))
        await page.waitForTimeout(150)
        expect.soft(await overflowingElements(page), `${route} overflow at ${width}px`).toEqual([])
        await shot(page, `${route}-light-${width}`)
      }
    })

    test(`${route}: dark mode`, async ({ page }) => {
      test.setTimeout(120_000)
      await installSession(page, { dark: true })
      for (const width of [375, 1440]) {
        await page.setViewportSize(viewport(width))
        await openRoute(page, route)
        expect.soft(await overflowingElements(page), `${route} dark at ${width}px`).toEqual([])
        await shot(page, `${route}-dark-${width}`)
      }
    })
  }

  test("transactions: one Add, and Filters opens and closes by keyboard", async ({ page }) => {
    await installSession(page)
    await page.setViewportSize(viewport(375))
    await openRoute(page, "transactions")
    // Only the floating quick-add remains; the toolbar duplicate is gone.
    await expect(
      page.locator("main").getByRole("button", { name: /^add transaction$/i }),
    ).toHaveCount(1)

    const filters = page.getByRole("button", { name: /filters/i }).first()
    await expect(filters).toHaveAttribute("aria-expanded", "false")
    await filters.focus()
    await page.keyboard.press("Enter")
    await expect(filters).toHaveAttribute("aria-expanded", "true")
    await expect(page.locator("#transaction-advanced-filters")).toBeVisible()
    await page.keyboard.press("Enter")
    await expect(filters).toHaveAttribute("aria-expanded", "false")
  })

  test.describe("iPhone 15 Pro Max (430×932 @3x): adding a transaction", () => {
    test.use({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 })

    /** Problems inside the open sheet that would bite on an iPhone. */
    async function sheetProblems(page: Page) {
      return page.getByRole("dialog").evaluate((dialog) => {
        const vw = document.documentElement.clientWidth
        const vh = window.innerHeight
        const out = {
          overflow: [] as string[],
          smallTargets: [] as string[],
          zoomInputs: [] as string[],
        }
        const name = (el: Element) =>
          (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 40)
        const box = dialog.getBoundingClientRect()
        if (box.left < -1 || box.right > vw + 1 || box.top < -1 || box.bottom > vh + 1) {
          out.overflow.push(
            `sheet ${Math.round(box.left)},${Math.round(box.top)} → ${Math.round(box.right)},${Math.round(box.bottom)}`,
          )
        }
        for (const el of Array.from(dialog.querySelectorAll("*"))) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          if (r.right > vw + 1) out.overflow.push(`${name(el)} → ${Math.round(r.right)}`)
        }
        for (const el of Array.from(
          dialog.querySelectorAll("button, a[href], input, select, textarea, [role=switch]"),
        )) {
          // An input wrapped in a <label> is tapped through the label's box.
          const target = el.matches("input, select, textarea") ? (el.closest("label") ?? el) : el
          const r = target.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          if (el instanceof HTMLInputElement && (el.type === "hidden" || el.type === "checkbox"))
            continue
          if (r.height < 43.5 || r.width < 43.5) {
            out.smallTargets.push(`${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`)
          }
        }
        for (const el of Array.from(dialog.querySelectorAll("input, select, textarea"))) {
          if (el instanceof HTMLInputElement && (el.type === "hidden" || el.type === "checkbox"))
            continue
          const size = parseFloat(getComputedStyle(el).fontSize)
          if (size < 16) out.zoomInputs.push(`${el.id || name(el)} ${size}px`)
        }
        return out
      })
    }

    async function shotViewport(page: Page, name: string) {
      await page.screenshot({
        path: `test-results/finance-redesign/iphone15pm-${name}.png`,
        scale: "css",
        animations: "disabled",
      })
    }

    for (const dark of [false, true]) {
      test(`the add sheet fits and is touch-safe (${dark ? "dark" : "light"})`, async ({
        page,
      }) => {
        test.setTimeout(120_000)
        await installSession(page, { dark })
        await openRoute(page, "transactions")
        const theme = dark ? "dark" : "light"

        await page.getByRole("button", { name: /^add transaction$/i }).tap()
        const sheet = page.getByRole("dialog")
        await expect(sheet.getByRole("heading", { name: "New transaction" })).toBeVisible()
        await page.waitForTimeout(400)
        await shotViewport(page, `${theme}-1-open`)

        // The submit button is reachable without scrolling the sheet.
        const submit = sheet.locator('button[type="submit"]')
        await expect(submit).toBeInViewport()

        await sheet.locator("#transaction-amount").fill("12500")
        await sheet.locator("#transaction-description").fill("Synthetic lunch")
        await shotViewport(page, `${theme}-2-filled`)

        await sheet.getByRole("button", { name: "USD", exact: true }).tap()
        await expect(sheet.locator("#transaction-exchange-rate")).toBeVisible()
        await shotViewport(page, `${theme}-3-usd`)

        await sheet.getByRole("button", { name: /more details/i }).tap()
        await expect(sheet.locator("#transaction-date")).toBeVisible()
        await sheet.locator("#transaction-note").scrollIntoViewIfNeeded()
        await page.waitForTimeout(200)
        await shotViewport(page, `${theme}-4-more-details`)
        await expect(submit).toBeInViewport()

        const problems = await sheetProblems(page)
        expect.soft(problems.overflow, "sheet overflow").toEqual([])
        expect.soft(problems.zoomInputs, "inputs under 16px zoom on iOS focus").toEqual([])
        expect.soft(problems.smallTargets, "touch targets under 44px").toEqual([])

        // The primary button's label must stay readable in both themes.
        const ratio = await submit.evaluate((el) => {
          const rgb = (value: string) => {
            const canvas = document.createElement("canvas").getContext("2d")!
            canvas.fillStyle = value
            canvas.fillRect(0, 0, 1, 1)
            return Array.from(canvas.getImageData(0, 0, 1, 1).data.slice(0, 3))
          }
          const lum = ([r, g, b]: number[]) => {
            const [R, G, B] = [r!, g!, b!].map((c) => {
              const s = c / 255
              return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
            })
            return 0.2126 * R! + 0.7152 * G! + 0.0722 * B!
          }
          const style = getComputedStyle(el)
          const [a, b] = [lum(rgb(style.color)), lum(rgb(style.backgroundColor))]
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        })
        expect.soft(ratio, "Add transaction label contrast").toBeGreaterThanOrEqual(4.5)
      })
    }
  })

  test("analytics: the trend chart moves between days by keyboard", async ({ page }) => {
    await installSession(page)
    await page.setViewportSize(viewport(1024))
    await openRoute(page, "analytics")
    const slider = page.getByRole("slider", { name: /daily income and expenses/i })
    const readout = page.getByTestId("trend-readout")
    await slider.focus()
    await page.keyboard.press("Home")
    const first = await readout.textContent()
    await page.keyboard.press("ArrowRight")
    await expect(readout).not.toHaveText(first ?? "")
    await page.keyboard.press("Home")
    await expect(readout).toHaveText(first ?? "")
  })
})
