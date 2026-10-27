import { expect, test, type Page } from "@playwright/test"

const USER_ID = "11111111-1111-4111-8111-111111111111"
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJleHAiOjIwMDAwMDAwMDB9.signature"

const questions = Array.from({ length: 50 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  created_by_user_id: null,
  question_ko: `\uD55C\uAD6D\uACFC \uCE84\uBCF4\uB514\uC544\uC758 \uC5EC\uB984 \uB0A0\uC528 \uCC28\uC774 ${index + 1}\uBC88\uC740 \uBB34\uC5C7\uC785\uB2C8\uAE4C?`,
  question_en: `What is weather difference question ${index + 1}?`,
  sample_answer_ko:
    "\uD55C\uAD6D\uC758 \uC5EC\uB984\uC740 \uB35C\uACE0 \uC2B5\uD569\uB2C8\uB2E4. \uCE84\uBCF4\uB514\uC544\uBCF4\uB2E4 \uBE44\uAC00 \uB9CE\uC2B5\uB2C8\uB2E4.",
  sample_answer_en: "Korean summers are hot and humid. There is more rain than in Cambodia.",
  category: index % 3 === 0 ? "comparison" : index % 3 === 1 ? "health" : "daily_life",
  difficulty: index < 17 ? "beginner" : index < 38 ? "normal" : "challenging",
  priority: index < 10 ? "must_practice" : index < 35 ? "recommended" : "optional",
  keywords: ["weather", "summer"],
  display_order: index + 1,
}))

type ProgressRow = {
  question_id: string
  times_practiced: number
  avg_score: number
  last_score: number
  last_practiced_at: string
  status: string
}

async function installMocks(page: Page) {
  const progress = new Map<string, ProgressRow>()
  await page.addInitScript(
    ({ userId, token }) => {
      // lib/auth-store.ts session shape. The cached Supabase token keeps the
      // test off h-space-api's bridge; REST calls are mocked below.
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

      class PermissionDeniedSpeechRecognition {
        continuous = false
        interimResults = false
        lang = ""
        onstart: (() => void) | null = null
        onresult: (() => void) | null = null
        onend: (() => void) | null = null
        onerror: ((event: { error: string }) => void) | null = null

        start() {
          window.setTimeout(() => this.onerror?.({ error: "not-allowed" }), 0)
        }

        stop() {}
        abort() {}
      }

      Object.defineProperty(window, "SpeechRecognition", {
        configurable: true,
        value: PermissionDeniedSpeechRecognition,
      })
    },
    { userId: USER_ID, token: JWT },
  )

  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split("/").at(-1)
    if (table === "kori_interview_questions") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(questions),
      })
      return
    }
    if (table === "kori_interview_question_progress") {
      if (request.method() === "GET") {
        const questionFilter = url.searchParams.get("question_id")
        if (questionFilter?.startsWith("eq.")) {
          const row = progress.get(questionFilter.slice(3))
          await route.fulfill({
            status: row ? 200 : 406,
            contentType: "application/json",
            body: JSON.stringify(row ?? null),
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([...progress.values()]),
          })
        }
        return
      }
      const body = request.postDataJSON() as ProgressRow
      progress.set(body.question_id, body)
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(body),
      })
      return
    }
    if (table === "kori_interview_attempts") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
      return
    }
    if (table === "kori_interview_answers") {
      const body = request.postDataJSON() as Record<string, unknown>
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...body,
        }),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })

  await page.route("**/api/ai/interview/speaking-check", async (route) => {
    const requestBody = route.request().postDataJSON() as { answer: string }
    const retry = requestBody.answer.includes("\uADF8\uB7EC\uB098")
    const score = retry ? 4 : 2.5
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scores: {
          speaking: score,
          grammar: score,
          vocabulary: score,
          pronunciation: score,
          confidence: retry ? 4 : 3,
          naturalness: score,
        },
        feedback: "Use two short, complete sentences.",
        correctedAnswer:
          "\uD55C\uAD6D\uC758 \uC5EC\uB984\uC740 \uB35C\uACE0 \uC2B5\uD569\uB2C8\uB2E4.",
        betterAlternative:
          "\uD55C\uAD6D\uC758 \uC5EC\uB984\uC740 \uB35C\uACE0 \uC2B5\uD574\uC11C \uC870\uAE08 \uD798\uB4ED\uB2C8\uB2E4.",
        tip: "Pause once between sentences and speak slowly.",
      }),
    })
  })

  await page.route("**/api/ai/tts", async (route) => {
    const silentWav = Buffer.from(
      "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
      "base64",
    )
    await route.fulfill({ status: 200, contentType: "audio/wav", body: silentWav })
  })
}

test("dashboard, listening, correction, retry, question bank, and mobile layout", async ({
  page,
}) => {
  await installMocks(page)
  await page.goto("http://127.0.0.1:3000/interview/speaking")
  await expect(
    page.getByRole("heading", { name: "Practice the five questions that matter today" }),
  ).toBeVisible()
  await expect(page.getByText("17 available")).toBeVisible()
  await expect(page.getByText("21 available")).toBeVisible()
  await expect(page.getByText("12 available")).toBeVisible()
  await expect(page.getByText("50 available")).toBeVisible()
  await page.screenshot({ path: "test-results/interview-dashboard-428.png", fullPage: true })

  await page.getByRole("button", { name: "Practice Today's 5" }).click()
  await expect(page.getByText("Listen before reading")).toBeVisible()
  await expect(page.getByRole("button", { name: "Reveal Korean" })).toBeVisible()
  await page.screenshot({ path: "test-results/interview-listening-428.png", fullPage: true })
  await page.getByRole("button", { name: "Play question normally" }).click()
  await page.getByRole("button", { name: "Play question slowly" }).click()
  await page.getByRole("button", { name: "Reveal Korean" }).click()
  await page.getByRole("button", { name: "Start recording" }).click()
  await expect(
    page.getByText(
      "Microphone permission is blocked. Allow microphone access in the browser and try again.",
    ),
  ).toBeVisible()

  const transcript = page.getByLabel("Confirmed transcript")
  await expect(transcript).toBeEditable()
  await transcript.fill("\uD55C\uAD6D \uC5EC\uB984\uC740 \uB35C\uACE0 \uC2B5\uD569\uB2C8\uB2E4.")
  await page.getByRole("button", { name: "Submit confirmed transcript" }).click()
  await expect(page.getByText("Correction available")).toBeVisible()
  await expect(page.getByRole("button", { name: "Retry Answer" })).toBeVisible()
  await expect(page.getByText(/not direct audio pronunciation analysis/)).toBeVisible()
  await page.screenshot({ path: "test-results/interview-correction-428.png", fullPage: true })

  await page.getByRole("button", { name: "Retry Answer" }).click()
  await expect(page.getByText("Retrying")).toBeVisible()
  await transcript.fill(
    "\uD55C\uAD6D \uC5EC\uB984\uC740 \uB35C\uACE0 \uC2B5\uD569\uB2C8\uB2E4. \uADF8\uB7EC\uB098 \uC9C0\uAE08\uC740 \uC801\uC751\uD588\uC2B5\uB2C8\uB2E4.",
  )
  await page.getByRole("button", { name: "Submit confirmed transcript" }).click()
  await expect(page.getByText(/Improvement \+1.4/)).toBeVisible()

  await page.getByRole("button", { name: "Next Question" }).click()
  for (let questionNumber = 2; questionNumber <= 5; questionNumber += 1) {
    await expect(transcript).toBeEditable()
    await transcript.fill(
      `\uD55C\uAD6D \uC5EC\uB984 ${questionNumber}\uBC88 \uB2F5\uBCC0\uC785\uB2C8\uB2E4.`,
    )
    await page.getByRole("button", { name: "Submit confirmed transcript" }).click()
    await expect(page.getByText("Correction available")).toBeVisible()
    if (questionNumber < 5) {
      await page.getByRole("button", { name: "Next Question" }).click()
    } else {
      await page.getByRole("button", { name: "Complete session" }).click()
    }
  }
  await expect(page.getByRole("heading", { name: "Today's practice is complete" })).toBeVisible()
  await page.getByRole("button", { name: "Back to exam dashboard" }).click()
  await expect(page.getByText("5 / 50 practised")).toBeVisible()
  await page.reload()
  await expect(page.getByText("5 / 50 practised")).toBeVisible()

  await page.getByRole("button", { name: "Browse Question Bank" }).click()
  await expect(page.getByRole("heading", { name: "Question Bank" })).toBeVisible()
  await page.getByPlaceholder("Search Korean text, English, or keyword").fill("question 50")
  await expect(page.getByText("Showing 1 of 50")).toBeVisible()

  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole("button", { name: "Back to dashboard" }).click()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: "test-results/interview-dashboard-375.png", fullPage: true })

  await page.evaluate(() => window.localStorage.setItem("theme", "dark"))
  await page.reload()
  await expect(
    page.getByRole("heading", { name: "Practice the five questions that matter today" }),
  ).toBeVisible()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0)

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0)
  }

  await page.setViewportSize({ width: 428, height: 926 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "20px"
  })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0)
})
