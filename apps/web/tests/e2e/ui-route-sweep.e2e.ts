import { expect, test, type Page } from "@playwright/test"
import { financeFixture } from "./finance-fixtures"

test.use({ screenshot: "off", trace: "off" })

// UI route sweep — opt-in (`UI_SWEEP=1`). Loads every signed-in route family
// with a synthetic session and synthetic Supabase rows, then:
//   1. fails on horizontal overflow: the page scrolls sideways, or an element
//      runs past the screen edge without a sideways scroller or a clipping
//      box inside the screen to hold it, and
//   2. reports text rendered below the 13px floor (docs/design-system.md),
//   3. saves a screenshot per route × viewport into
//      test-results/ui-sweep/<UI_SWEEP_LABEL ?? "current">/.
// Nothing leaves the machine: every request to a non-local host is aborted
// and Supabase REST / AI / integration calls are fulfilled locally. Data is
// fabricated for layout only — no real account, token, or user content.
//
//   UI_SWEEP=1 UI_SWEEP_LABEL=before PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 \
//     npx playwright test ui-route-sweep --workers=1

const enabled = process.env.UI_SWEEP === "1"
const label = process.env.UI_SWEEP_LABEL ?? "current"
const onlyWidths = process.env.UI_SWEEP_WIDTHS?.split(",").map(Number)
// Route names without the leading slash ("home,goals/tasks") so Git Bash on
// Windows doesn't rewrite them into filesystem paths.
const onlyRoutes = process.env.UI_SWEEP_ROUTES?.split(",").map((r) => r.replace(/^\/+/, ""))
const dark = process.env.UI_SWEEP_DARK === "1"

const USER_ID = "11111111-1111-4111-8111-111111111111"
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJleHAiOjIwMDAwMDAwMDB9.signature"

const today = new Date()
const iso = (offsetDays: number, hour = 9) => {
  const d = new Date(today)
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const GOAL_ID = "22222222-2222-4222-8222-222222222222"
const GOAL_ID_2 = "22222222-2222-4222-8222-222222222223"

function task(id: string, title: string, offset: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    title,
    description: "",
    completed: false,
    status: "todo",
    user_id: USER_ID,
    goal_id: GOAL_ID,
    start_date: iso(offset),
    end_date: iso(offset, 10),
    daily_start_time: null,
    is_anytime: true,
    duration_minutes: 30,
    effort_minutes: 30,
    impact_level: "medium",
    key_result_id: null,
    phase_id: null,
    tags: [],
    created_at: iso(-3),
    updated_at: iso(-1),
    ...extra,
  }
}

const tasks = [
  task("33333333-3333-4333-8333-333333333331", "Draft the weekly plan and review open loops", 0),
  task(
    "33333333-3333-4333-8333-333333333332",
    "Read one chapter — a deliberately long task title to check wrapping on narrow phones",
    0,
    { impact_level: "high" },
  ),
  task("33333333-3333-4333-8333-333333333333", "Practice 20 minutes", 1, { goal_id: GOAL_ID_2 }),
  task("33333333-3333-4333-8333-333333333334", "Finished task", -1, {
    completed: true,
    status: "done",
  }),
  task("33333333-3333-4333-8333-333333333335", "Personal errand", 2, { goal_id: null }),
]

function goal(id: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    title,
    description: "A synthetic goal used only for layout checks.",
    target_date: iso(60).slice(0, 10),
    no_duration: false,
    status: "active",
    created_at: iso(-30),
    updated_at: iso(-1),
    user_id: USER_ID,
    metadata: { goal_type: "general", priority: "high", category: "Learning", icon: "🎯" },
    outcome_progress: 40,
    health_status: "on_track",
    outcome_statement: "Ship something small every week",
    goal_stars: [],
    goal_key_results: [],
    tasks: tasks.filter((t) => t.goal_id === id),
    ...extra,
  }
}

const goals = [
  goal(GOAL_ID, "Build a calm daily planning routine"),
  goal(GOAL_ID_2, "Reach conversational Korean — 한국어로 자연스럽게 대화하기", {
    outcome_progress: 15,
    health_status: "at_risk",
  }),
]

const fixtures: Record<string, unknown[]> = {
  goals,
  tasks,
  goal_members: [],
  goal_stars: [],
}

async function installMocks(page: Page, signedIn = true) {
  await page.addInitScript(
    ({ userId, token, dark, signedIn }) => {
      if (signedIn) {
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
      }
      window.localStorage.setItem("theme", dark ? "dark" : "light")
    },
    { userId: USER_ID, token: JWT, dark, signedIn },
  )

  // Registered first, so it's the fallback: abort anything off this machine.
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname
    if (host === "127.0.0.1" || host === "localhost") return route.continue()
    return route.abort()
  })
  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split("/").at(-1) ?? ""
    const single = (request.headers()["accept"] ?? "").includes("vnd.pgrst.object")
    if (request.method() !== "GET" && request.method() !== "HEAD") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
      return
    }
    let rows = fixtures[table] ?? []
    const id = url.searchParams.get("id")
    if (id?.startsWith("eq.")) rows = rows.filter((r) => (r as { id: string }).id === id.slice(3))
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(single ? (rows[0] ?? null) : rows),
    })
  })
  await page.route("**/api/ai/**", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  )
  await page.route("**/api/integrations/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  )
  // Finance (ported from Luyra): synthetic responses in Luyra's { data } envelope.
  await page.route("**/api/finance/**", (route) => {
    const data = financeFixture(new URL(route.request().url()))
    return data === undefined
      ? route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "NOT_FOUND", message: "Not mocked" } }),
        })
      : route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data }),
        })
  })
}

// Real signed-in feature routes (redirect stubs like /focus/*, /mistakes and
// /daily-phrase are left out on purpose; chromeless OAuth screens too).
const ROUTES = [
  "/",
  "/login",
  "/register",
  "/privacy",
  "/terms",
  "/forgot-password",
  "/reset-password",
  "/unlock-account",
  "/verify-email",
  "/reading/new",
  "/phrasebook/new",
  "/phrasebook/practice",
  "/practice/today",
  "/study-packs/social-awareness",
  "/roadmap",
  "/korean-coach/scenarios",
  "/korean-coach/mistakes",
  "/korean-coach/preferences",
  "/korean-coach/listening",
  "/korean-coach/history",
  "/growth/recovery/urge",
  "/growth/recovery/triggers",
  "/growth/recovery/settings",
  "/growth/recovery/review",
  "/growth/recovery/plans",
  "/growth/recovery/plan",
  "/growth/recovery/pause",
  "/growth/recovery/log",
  "/growth/recovery/check-in",
  "/growth/recovery/checkins",
  "/growth/recovery/debrief",
  "/growth/recovery/insights",
  "/interview/listening",
  "/interview/speaking",
  "/interview/repeat",
  "/interview/script",
  "/home",
  "/apps",
  "/vault",
  "/goals",
  "/goals/tasks",
  "/goals/overview",
  "/goals/calendar",
  "/goals/create",
  "/goals/create/custom",
  `/goals/${GOAL_ID}`,
  `/goals/${GOAL_ID}/tasks`,
  `/goals/${GOAL_ID}/plan`,
  `/goals/${GOAL_ID}/schedule`,
  `/goals/${GOAL_ID}/progress`,
  "/inbox",
  "/learn",
  "/learn/today",
  "/learn/foundations",
  "/practice",
  "/vocab",
  "/phrasebook",
  "/reading",
  "/listening",
  "/scenarios",
  "/history",
  "/korean-coach",
  "/interview",
  "/chat",
  "/notes",
  "/notes/new",
  "/ask-hengo",
  "/ask-hengo/memories",
  "/timeline",
  "/growth",
  "/growth/habits",
  "/growth/journal",
  "/growth/recovery",
  "/progress",
  "/statistics",
  "/achievements",
  "/roadmap",
  "/interview/script",
  "/growth/recovery/log",
  "/review/morning",
  "/review/evening",
  "/review/weekly",
  "/settings",
  "/settings/security",
  "/settings/reminders",
  "/account",
  "/finance",
  "/finance/transactions",
  "/finance/budgets",
  "/finance/savings",
  "/finance/analytics",
]

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440]

function slug(route: string) {
  return route.replace(/^\//, "").replace(/[/[\]]/g, "_") || "root"
}

test.describe("UI route sweep", () => {
  test.describe.configure({ mode: "parallel" })
  test.skip(!enabled, "Set UI_SWEEP=1 to run the UI route sweep.")
  const routes = onlyRoutes ? ROUTES.filter((r) => onlyRoutes.includes(r.slice(1))) : ROUTES
  const widths = onlyWidths ?? WIDTHS

  for (const route of routes) {
    test(route, async ({ page }) => {
      test.setTimeout(240_000)
      await installMocks(page, route !== "/")
      const failures: string[] = []
      const smallText = new Set<string>()

      // Navigate once, then resize in place — the shell's navigation mode and
      // every layout react to resize, and a reload per width made a full
      // sweep take an hour on `next dev`.
      for (const [index, width] of widths.entries()) {
        await page.setViewportSize({ width, height: width === 430 ? 932 : width < 768 ? 860 : 900 })
        if (index === 0) {
          await page.goto(route)
          // Redirect stubs (/ask-hengo → /chat) must settle first, or the
          // baseline measures a half-rendered "Rendering…" frame.
          await page.waitForLoadState("domcontentloaded")
          // The shell's own <main>, by id: a page that renders a second
          // <main> (practice/today does — a known P1) must not stop the
          // measurement with a strict-mode locator error.
          await expect(
            page.locator(
              [
                "/",
                "/login",
                "/register",
                "/privacy",
                "/terms",
                "/forgot-password",
                "/reset-password",
                "/unlock-account",
                "/verify-email",
              ].includes(route)
                ? "body"
                : "main#main-content",
            ),
          ).toBeVisible({ timeout: 90_000 })
          await page.waitForTimeout(1200)
        } else {
          await page.waitForTimeout(500)
        }
        await page
          .locator('[data-slot="skeleton"]:visible')
          .first()
          .waitFor({ state: "hidden", timeout: 5000 })
          .catch(() => {})

        // Reveal sections animated on entry before measuring their final layout.
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
            scrollTo(0, y)
            await new Promise((resolve) => setTimeout(resolve, 80))
          }
          scrollTo(0, 0)
        })
        await page.waitForTimeout(600)

        const report = await page.evaluate(() => {
          const vw = window.innerWidth
          // Is an element that runs past the screen edge held by an ancestor?
          // A sideways scroller holds it on purpose. A clipping box (hidden or
          // clip) holds it only when the box ends inside the screen on that
          // side: then the content is truncated by design (an ellipsis title).
          // A clip *at* the screen edge — <main>'s overflow-x-clip, the
          // calendar's h-dvh overflow-hidden shell — just cuts content off, so
          // it must not excuse the overflow.
          const heldSideways = (el: Element, r: DOMRect): boolean => {
            for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
              const ox = getComputedStyle(n).overflowX
              if (ox === "auto" || ox === "scroll") return true
              if (ox === "hidden" || ox === "clip") {
                const box = n.getBoundingClientRect()
                const rightHeld = r.right <= vw + 1 || box.right < vw - 1
                const leftHeld = r.left >= -1 || box.left > 1
                if (rightHeld && leftHeld) return true
              }
            }
            return false
          }
          const describe = (el: Element) => {
            const cls = (el.getAttribute("class") ?? "").split(/\s+/).slice(0, 6).join(" ")
            const text = (el.textContent ?? "").trim().slice(0, 40)
            return `<${el.tagName.toLowerCase()} class="${cls}"> "${text}"`
          }
          const overflow: string[] = []
          const tiny: string[] = []
          const typography: string[] = []
          const smallInputs: string[] = []
          const root = document.documentElement
          const pageScroll = root.scrollWidth - root.clientWidth
          if (pageScroll > 1) overflow.push(`page scrolls sideways by ${pageScroll}px`)
          for (const el of Array.from(document.querySelectorAll("body *"))) {
            if (el.closest('[aria-hidden="true"]')) continue
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) continue
            const s = getComputedStyle(el)
            if (s.visibility === "hidden" || s.position === "fixed") continue
            const decorative =
              !el.textContent?.trim() &&
              el.children.length === 0 &&
              s.position === "absolute" &&
              !el.matches("input, textarea, button, a, img, video, canvas")
            if (!decorative && (r.right > vw + 1 || r.left < -1) && !heldSideways(el, r)) {
              overflow.push(`${Math.round(r.left)}→${Math.round(r.right)} ${describe(el)}`)
            }
            const ownText = Array.from(el.childNodes).some(
              (c) => c.nodeType === 3 && (c.textContent ?? "").trim().length > 1,
            )
            // 13px is the `text-xs` floor; anything smaller is a hard-coded size.
            if (ownText && /^(H[1-6]|BUTTON)$/.test(el.tagName)) {
              typography.push(`${s.fontSize}/${s.fontWeight}/${s.lineHeight} ${describe(el)}`)
            }
            if (
              el.matches("input:not([type=checkbox]):not([type=radio]), textarea, select") &&
              parseFloat(s.fontSize) < 16
            ) {
              smallInputs.push(`${s.fontSize} ${describe(el)}`)
            }
            if (ownText && parseFloat(s.fontSize) < 13) {
              tiny.push(`${s.fontSize} ${describe(el)}`)
            }
          }
          return {
            overflow: overflow.slice(0, 7),
            tiny,
            typography,
            smallInputs,
            loadingPlaceholders: Array.from(
              document.querySelectorAll('[data-slot="skeleton"]'),
            ).filter((el) => el.getBoundingClientRect().height > 0).length,
            viewport: { width: innerWidth, height: innerHeight },
            url: location.pathname,
          }
        })

        await test.info().attach(`layout-${width}`, {
          body: JSON.stringify(report, null, 2),
          contentType: "application/json",
        })

        if (report.overflow.length) {
          failures.push(`${width}px:\n    ${report.overflow.join("\n    ")}`)
        }
        for (const t of report.tiny) smallText.add(t)

        await page.screenshot({
          path: `test-results/ui-sweep/${label}${dark ? "-dark" : ""}/${slug(route)}-${width}.png`,
          fullPage: true,
          scale: "css",
          animations: "disabled",
        })
      }

      if (smallText.size) {
        test.info().annotations.push({
          type: "small-text",
          description: Array.from(smallText).slice(0, 10).join("\n"),
        })
        console.log(`[small-text] ${route}\n  ${Array.from(smallText).slice(0, 10).join("\n  ")}`)
      }
      // Soft, so one failing route never hides the rest of the sweep.
      expect.soft(failures, `horizontal overflow on ${route}`).toEqual([])
    })
  }
})
