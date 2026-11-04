import { expect, test, type Page } from "@playwright/test"

// Responsive + theme + target-size audit across every Exam Prep route, plus
// the sticky action bar that a shell overflow bug used to break. Supabase REST
// and AI are mocked with an empty-but-valid dataset.

const USER_ID = "11111111-1111-4111-8111-111111111111"
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJleHAiOjIwMDAwMDAwMDB9.signature"

const questions = Array.from({ length: 8 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  created_by_user_id: null,
  question_ko: `한국에 온 후 새로 생긴 습관 ${index + 1}번은 무엇입니까?`,
  question_en: `What is new habit number ${index + 1}?`,
  sample_answer_ko: "걸어서 출근하는 습관이 생겼어요.",
  sample_answer_en: "I started walking to work.",
  category: "daily_life",
  difficulty: "beginner",
  priority: "must_practice",
  keywords: [],
  display_order: index + 1,
}))

async function installMocks(page: Page, theme: "light" | "dark") {
  await page.addInitScript(
    ({ userId, token, theme }) => {
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
      window.localStorage.setItem("theme", theme)
    },
    { userId: USER_ID, token: JWT, theme },
  )
  await page.route("**/rest/v1/**", async (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1)
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(table === "kori_interview_questions" ? questions : []),
    })
  })
  await page.route("**/api/ai/**", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  )
}

const ROUTES: { path: string; ready: RegExp | string }[] = [
  { path: "/interview", ready: "Today's practice" },
  { path: "/interview/speaking", ready: "Answer practice" },
  { path: "/interview/listening", ready: "Listening practice" },
  {
    path: "/interview/script",
    ready: /Saved on this device|Saves automatically|Saved to your account/,
  },
  { path: "/interview/repeat", ready: "Start Listen & Repeat" },
]
const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]

// Interactive elements inside <main> smaller than `min` px in either dimension.
async function smallTargets(page: Page, min: number) {
  return page.evaluate((min) => {
    const main = document.querySelector("main")
    if (!main) return []
    const selector =
      "button, a[href], [role=radio], [role=switch], input, select, textarea, summary"
    return Array.from(main.querySelectorAll<HTMLElement>(selector))
      .filter((el) => {
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        if (rect.width === 0 || rect.height === 0 || style.visibility === "hidden") return false
        // Inline text links inside a sentence are exempt (WCAG 2.5.8 exception).
        if (el.tagName === "A" && style.display === "inline") return false
        // Count an ::after hit-area extension (the repo's pattern for small chips).
        const after = getComputedStyle(el, "::after")
        const grows = after.content !== "none" && after.position === "absolute"
        return !grows && (rect.width < min || rect.height < min)
      })
      .map((el) => {
        const rect = el.getBoundingClientRect()
        const name = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim()
        return `${name.slice(0, 40)} (${Math.round(rect.width)}×${Math.round(rect.height)})`
      })
  }, min)
}

for (const theme of ["light", "dark"] as const) {
  test(`mobile glass respects reduced transparency (${theme})`, async ({ page, context }) => {
    await installMocks(page, theme)
    await page.setViewportSize({ width: 430, height: 932 })
    const session = await context.newCDPSession(page)
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    })
    await page.goto("/interview/script")
    await expect(page.getByLabel("Jump to section")).toBeVisible({ timeout: 60_000 })
    await expect(page.locator("html")).toHaveClass(new RegExp(theme))
    expect(
      await page.evaluate(() => matchMedia("(prefers-reduced-transparency: reduce)").matches),
    ).toBe(true)

    const navigation = page.getByRole("navigation", { name: "Primary", exact: true })
    await expect(navigation.getByRole("listitem")).toHaveCount(5)
    await expect(navigation.locator("ul > :not(li)")).toHaveCount(0)

    for (const surface of [navigation.locator("ul"), page.getByLabel("Jump to section")]) {
      const styles = await surface.evaluate((element) => {
        const style = getComputedStyle(element)
        const reference = document.createElement("div")
        reference.style.backgroundColor = "var(--background)"
        element.parentElement!.appendChild(reference)
        const opaqueBackground = getComputedStyle(reference).backgroundColor
        reference.remove()
        return {
          background: style.backgroundColor,
          opaqueBackground,
          backdropFilter: style.backdropFilter,
        }
      })
      expect(styles.background).toBe(styles.opaqueBackground)
      expect(styles.backdropFilter).toBe("none")
    }
  })

  test(`every Exam Prep route fits each width without overflow (${theme})`, async ({ page }) => {
    test.setTimeout(240_000)
    await installMocks(page, theme)
    for (const route of ROUTES) {
      await page.setViewportSize(VIEWPORTS[0])
      await page.goto(route.path)
      await expect(page.getByText(route.ready).first()).toBeVisible({ timeout: 60_000 })
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow, `${route.path} at ${viewport.width}px (${theme})`).toBeLessThanOrEqual(0)
      }
      // WCAG 2.2 AA minimum target size; anything under 44px is reported.
      await page.setViewportSize(VIEWPORTS[0])
      expect(await smallTargets(page, 24), `${route.path}: targets under 24px`).toEqual([])
      const under44 = await smallTargets(page, 44)
      if (under44.length > 0) {
        test.info().annotations.push({
          type: "under-44px",
          description: `${route.path}: ${under44.join("; ")}`,
        })
      }
    }
  })
}

test("practice actions stay pinned within reach on a small phone", async ({ page }) => {
  await installMocks(page, "light")
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto("/interview/speaking")
  await expect(page.getByText("Answer practice")).toBeVisible({ timeout: 60_000 })
  // Before answering the bar stays in the flow; once there's an answer it pins.
  await page.getByRole("button", { name: /Type instead/ }).click()
  await page.getByLabel("Your answer").fill("걸어서 출근해요.")
  await page.evaluate(() => window.scrollTo(0, 0))
  const check = page.getByRole("button", { name: "Check my answer" })
  await expect(check).toBeInViewport()
  await page.screenshot({ path: "test-results/interview-practice-bar-375.png" })
  // The bar leaves room for the floating AI Assistant button.
  const assistant = page.getByRole("button", { name: "Open AI Assistant" })
  if (await assistant.isVisible()) {
    const a = (await assistant.boundingBox())!
    for (const button of [check, page.getByRole("button", { name: "Just compare" })]) {
      const b = (await button.boundingBox())!
      const overlaps =
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
      expect(overlaps).toBe(false)
    }
  }
})

test("home is usable with the keyboard alone", async ({ page }) => {
  await installMocks(page, "light")
  await page.goto("/interview")
  await expect(page.getByText("Today's practice")).toBeVisible({ timeout: 60_000 })
  // Tab until the primary action has focus; it must be reachable and show focus.
  let reached = false
  for (let i = 0; i < 60 && !reached; i += 1) {
    await page.keyboard.press("Tab")
    reached = await page.evaluate(
      () => document.activeElement?.textContent?.includes("Start today's 5") ?? false,
    )
  }
  expect(reached).toBe(true)
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement
    const style = getComputedStyle(el)
    return style.outlineStyle !== "none" || style.boxShadow !== "none"
  })
  expect(outline).toBe(true)
})
