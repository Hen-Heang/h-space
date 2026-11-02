import { expect, test, type Page } from "@playwright/test"

import { dateKeyInTimeZone } from "@/lib/date-key"
import {
  daysRemainingInSeoul,
  INTERVIEW_TIME_ZONE,
  recommendedDifficulty,
  todayQueueStorageKey,
} from "@/lib/interview-practice"
import { EXAM_DATE } from "@/lib/study-plan"

// Exam Prep home (/interview): the four cards, Start above the fold on a
// small phone, and "Start today's 5" landing straight in the drill. All
// Supabase REST and AI calls are mocked; nothing reaches a real backend.

const USER_ID = "11111111-1111-4111-8111-111111111111"
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJleHAiOjIwMDAwMDAwMDB9.signature"

const questions = Array.from({ length: 12 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  created_by_user_id: null,
  question_ko: `한국에 온 후 새로 생긴 습관 ${index + 1}번은 무엇입니까?`,
  question_en: `What is new habit number ${index + 1}?`,
  sample_answer_ko: null,
  sample_answer_en: null,
  category: "daily_life",
  difficulty: index < 4 ? "beginner" : index < 8 ? "normal" : "challenging",
  priority: index < 5 ? "must_practice" : "recommended",
  keywords: [],
  display_order: index + 1,
}))
const ids = questions.map((question) => question.id)

async function installMocks(
  page: Page,
  { pinnedIds = [], practicedToday = [] }: { pinnedIds?: string[]; practicedToday?: string[] } = {},
) {
  const now = new Date()
  const queueKey = todayQueueStorageKey(
    dateKeyInTimeZone(now, INTERVIEW_TIME_ZONE),
    recommendedDifficulty(daysRemainingInSeoul(EXAM_DATE, now)),
  )
  await page.addInitScript(
    ({ userId, token, key, pinned }) => {
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
      if (pinned.length > 0) window.localStorage.setItem(key, JSON.stringify(pinned))
    },
    { userId: USER_ID, token: JWT, key: queueKey, pinned: pinnedIds },
  )

  const progressRows = practicedToday.map((id) => ({
    question_id: id,
    times_practiced: 1,
    avg_score: 3,
    last_score: 3,
    last_practiced_at: now.toISOString(),
    status: "practicing",
  }))

  await page.route("**/rest/v1/**", async (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1)
    const body =
      table === "kori_interview_questions"
        ? questions
        : table === "kori_interview_question_progress"
          ? progressRows
          : []
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })
  // Never generate audio or AI content during UI tests.
  await page.route("**/api/ai/**", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  )
}

test("the four home cards fit a 375px phone with Start above the fold", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await installMocks(page)
  await page.goto("/interview")

  const start = page.getByRole("link", { name: /Start today's 5/ })
  await expect(start).toBeVisible()
  await expect(start).toBeInViewport()
  await expect(page.getByRole("heading", { name: "Mock interview" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "My exam script" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible()
  await expect(page.getByText("0 of 12 questions practiced")).toBeVisible()

  // No sideways scrolling on a small phone.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: "test-results/interview-home-375.png", fullPage: true })
  await page.screenshot({ path: "test-results/interview-home-375-viewport.png" })
})

test("Continue resumes today's 5 at the first question not yet done", async ({ page }) => {
  const pinned = ids.slice(0, 5)
  await installMocks(page, { pinnedIds: pinned, practicedToday: [pinned[0]] })
  await page.goto("/interview")

  await expect(page.getByText("1 of 5 done")).toBeVisible()
  await page.getByRole("link", { name: /Continue today's 5/ }).click()

  // Generous timeout: a dev server compiles the Speaking route on first visit.
  await expect(page).toHaveURL(/\/interview\/speaking$/, { timeout: 30_000 })
  await expect(page.getByText("2 / 5")).toBeVisible()
})

test("the plain Speaking URL opens today's 5 directly", async ({ page }) => {
  await installMocks(page)
  await page.goto("/interview/speaking")
  await expect(page.getByText("Answer practice")).toBeVisible()
  await expect(page.getByText("1 / 5")).toBeVisible()
})

test("mode picker switches the mock interview with the keyboard", async ({ page }) => {
  await installMocks(page)
  await page.goto("/interview")
  const practice = page.getByRole("radio", { name: "Practice" })
  await practice.focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("radio", { name: "Exam Simulation" })).toHaveAttribute(
    "aria-checked",
    "true",
  )
  await expect(page.getByRole("button", { name: "Start exam simulation" })).toBeVisible()
})

test("desktop layout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installMocks(page)
  await page.goto("/interview")
  await expect(page.getByRole("link", { name: /Start today's 5/ })).toBeInViewport()
  await expect(page.getByRole("button", { name: "Start practice interview" })).toBeInViewport()
  await page.screenshot({ path: "test-results/interview-home-1440.png", fullPage: true })
})
