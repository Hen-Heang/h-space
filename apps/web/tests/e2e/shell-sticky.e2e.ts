import { expect, test, type Locator, type Page } from "@playwright/test"

// The app shell's <main> used overflow-x-hidden, which made it a scroll
// container that never scrolls — so no position: sticky inside it worked.
// These checks measure real geometry: the shell's --shell-header-h /
// --shell-bottom-nav-h match the rendered chrome, and the sticky elements that
// now engage stay clear of the header and bottom nav.

const USER_ID = "11111111-1111-4111-8111-111111111111"
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJleHAiOjIwMDAwMDAwMDB9.signature"

const longNote = Array.from(
  { length: 40 },
  (_, i) => `## Section ${i + 1}\n\nA paragraph of note text for section ${i + 1}.`,
).join("\n\n")
const noteRow = {
  id: "44444444-4444-4444-8444-444444444444",
  user_id: USER_ID,
  slug: "sticky-test",
  title: "Sticky test note",
  description: "A long note",
  icon: null,
  category: null,
  note_type: "note",
  tags: [],
  pinned: false,
  source_url: null,
  goal_id: null,
  task_id: null,
  inbox_item_id: null,
  project_id: null,
  content: longNote,
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
}

async function installMocks(page: Page) {
  await page.addInitScript(
    ({ userId, token }) => {
      window.localStorage.setItem(
        "hspace-auth",
        JSON.stringify({
          accessToken: token,
          refreshToken: "refresh",
          expiresAt: 2_000_000_000_000,
          user: { id: userId, email: "browser-test@example.com", name: null, imageUrl: null },
          supabaseToken: token,
          supabaseTokenExpiresAt: 2_000_000_000_000,
        }),
      )
      window.localStorage.setItem(`hengo:onboarding:${userId}`, "done")
    },
    { userId: USER_ID, token: JWT },
  )
  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split("/").at(-1)
    const single = (request.headers()["accept"] ?? "").includes("vnd.pgrst.object")
    if (table === "kori_notes" && url.searchParams.get("slug") === "eq.sticky-test") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(single ? noteRow : [noteRow]),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })
  await page.route("**/api/ai/**", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  )
}

/** The shell header's bottom edge, the bottom nav's top edge, and the CSS variables. */
async function shellGeometry(page: Page) {
  return page.evaluate(() => {
    const column = document.querySelector("main")!.parentElement!
    const probe = document.createElement("div")
    probe.style.cssText =
      "position:absolute;visibility:hidden;top:var(--shell-header-h);height:var(--shell-bottom-nav-h)"
    column.appendChild(probe)
    const style = getComputedStyle(probe)
    const headerVar = parseFloat(style.top)
    const navVar = parseFloat(style.height)
    probe.remove()
    // The shell header is the <header> right before <main>.
    const header = column.querySelector(
      ":scope > header, :scope > * > header",
    ) as HTMLElement | null
    const nav = document.querySelector("nav.fixed") as HTMLElement | null
    return {
      headerVar,
      navVar,
      headerBottom: header ? header.getBoundingClientRect().bottom : 0,
      headerHeight: header ? header.getBoundingClientRect().height : 0,
      navTop: nav ? nav.getBoundingClientRect().top : window.innerHeight,
      navHeight: nav ? nav.getBoundingClientRect().height : 0,
      innerHeight: window.innerHeight,
    }
  })
}

async function scrollBy(page: Page, y: number) {
  await page.evaluate((y) => window.scrollTo(0, y), y)
  await page.waitForTimeout(150)
}

/** Root font size: offsets are in rem, and some pages scale the root. */
async function rem(page: Page) {
  return page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
}

async function top(locator: Locator) {
  return (await locator.boundingBox())!.y
}

test.describe("shell offsets match the rendered chrome", () => {
  for (const viewport of [
    { name: "phone", width: 375, height: 667 },
    { name: "tablet", width: 900, height: 700 },
    { name: "desktop", width: 1440, height: 900 },
  ]) {
    test(viewport.name, async ({ page }) => {
      await page.setViewportSize(viewport)
      await installMocks(page)
      await page.goto("/history")
      await expect(page.locator("main")).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(500)
      const g = await shellGeometry(page)
      expect(Math.abs(g.headerVar - g.headerHeight)).toBeLessThanOrEqual(1)
      expect(Math.abs(g.navVar - g.navHeight)).toBeLessThanOrEqual(1)
      if (viewport.name === "phone") expect(g.navHeight).toBeGreaterThan(0)
      else expect(g.navVar).toBe(0)

      // clip, not hidden: <main> is no longer a scroll container.
      const overflow = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector("main")!)
        return { x: s.overflowX, y: s.overflowY }
      })
      expect(overflow).toEqual({ x: "clip", y: "visible" })
    })
  }
})

test("calendar keeps its clipped, non-scrolling main", async ({ page }) => {
  await installMocks(page)
  await page.goto("/goals/calendar")
  await expect(page.locator("main")).toBeVisible({ timeout: 60_000 })
  const overflow = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector("main")!)
    return { x: s.overflowX, y: s.overflowY }
  })
  // overflow-x-clip with overflow-y-hidden: older Chrome computed x as "hidden",
  // Chrome 157 keeps "clip". Either way sideways overflow is clipped and the
  // main never scrolls, which is what this guards.
  expect(["hidden", "clip"]).toContain(overflow.x)
  expect(overflow.y).toBe("hidden")
})

for (const viewport of [
  { name: "phone", width: 375, height: 667 },
  { name: "desktop", width: 1440, height: 800 },
]) {
  test(`script editor title bar sticks below the shell header (${viewport.name})`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await installMocks(page)
    await page.goto("/interview/script")
    const status = page.getByText(/Saves automatically|Saved on this device|Saved to your account/)
    await expect(status).toBeVisible({ timeout: 60_000 })
    const titleBar = status.locator("xpath=ancestor::div[contains(@class,'sticky')][1]")
    await scrollBy(page, 900)
    const g = await shellGeometry(page)
    expect(Math.abs((await top(titleBar)) - g.headerBottom)).toBeLessThanOrEqual(1)

    if (viewport.name === "desktop") {
      const outline = page.locator("aside .sticky").first()
      const barBottom = (await titleBar.boundingBox())!
      expect(await top(outline)).toBeGreaterThanOrEqual(barBottom.y + barBottom.height)
    } else {
      const jumpMenu = page.getByLabel("Jump to section")
      await jumpMenu.selectOption({ index: 3 })
      const targetSection = page.locator("[data-doc-section]").nth(2)
      await expect
        .poll(async () => {
          const target = await targetSection.boundingBox()
          const stickyBar = await titleBar.boundingBox()
          return target && stickyBar ? target.y - (stickyBar.y + stickyBar.height) : -Infinity
        })
        .toBeGreaterThanOrEqual(-1)
    }
  })
}

test("note view's action bar sticks below the shell header (desktop)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await installMocks(page)
  await page.goto("/notes/sticky-test")
  await expect(page.getByRole("heading", { name: "Section 40" })).toBeAttached({
    timeout: 60_000,
  })
  await scrollBy(page, 1500)
  const g = await shellGeometry(page)
  const bar = page.locator("div.md\\:sticky").first()
  expect(Math.abs((await top(bar)) - g.headerBottom)).toBeLessThanOrEqual(1)
})

test("phrasebook save bar sits above the bottom nav on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await installMocks(page)
  await page.goto("/phrasebook/new")
  const save = page.getByRole("button", { name: /Create card|Save changes/ })
  await expect(save).toBeVisible({ timeout: 60_000 })
  await scrollBy(page, 0)
  const g = await shellGeometry(page)
  const bar = save.locator("xpath=ancestor::div[contains(@class,'sticky')][1]")
  const box = (await bar.boundingBox())!
  // Pinned: visible in the viewport, and its bottom clears the nav.
  expect(box.y + box.height).toBeLessThanOrEqual(g.navTop)
  expect(box.y).toBeLessThan(g.innerHeight)
})

test("/goals/create side panel sticks below the header on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 })
  await installMocks(page)
  await page.goto("/goals/create")
  const panel = page.locator(".lg\\:sticky").first()
  await expect(panel).toBeVisible({ timeout: 60_000 })
  const scrollable = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  )
  expect(scrollable).toBeGreaterThan(200)
  await scrollBy(page, Math.min(scrollable, 600))
  const g = await shellGeometry(page)
  // lg:top = header + 1.5rem; the panel stays there instead of scrolling away.
  expect(
    Math.abs((await top(panel)) - (g.headerBottom + 1.5 * (await rem(page)))),
  ).toBeLessThanOrEqual(1)
})

// With mocked (empty) history the right-hand panel is the tallest item in its
// row, so it has no room to stick; check the offset resolves instead.
test("/history side panel is sticky with the header offset on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 })
  await installMocks(page)
  await page.goto("/history")
  const wrapper = page.locator(".lg\\:sticky").first()
  await expect(wrapper).toBeVisible({ timeout: 60_000 })
  const g = await shellGeometry(page)
  const style = await wrapper.evaluate((el) => {
    const s = getComputedStyle(el)
    return { position: s.position, top: parseFloat(s.top) }
  })
  expect(style.position).toBe("sticky")
  expect(Math.abs(style.top - (g.headerVar + 2 * (await rem(page))))).toBeLessThanOrEqual(1)
})

// Chat is full-bleed and scrolls inside its own area; the page itself must
// still fit the screen exactly (verified identical before and after this fix).
test("chat still fills the screen without page scroll on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await installMocks(page)
  await page.goto("/chat")
  await expect(page.locator("main")).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(1000)
  const size = await page.evaluate(() => ({
    overflowY: document.documentElement.scrollHeight - window.innerHeight,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  expect(size).toEqual({ overflowY: 0, overflowX: 0 })
})
