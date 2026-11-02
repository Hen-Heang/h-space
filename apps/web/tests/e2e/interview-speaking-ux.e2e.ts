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

const KO_ANSWER = "한국 여름은 덜고 습합니다."
const KO_RETRY = "한국 여름은 덜고 습합니다. 그러나 지금은 적응했습니다."

async function noHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0)
}

test("answer practice: listen, blocked mic, check, retry, all five, bank, and layout", async ({
  page,
}) => {
  await installMocks(page)
  await page.goto("/interview/speaking")

  // Opens straight into Today's 5 — no dashboard in between.
  await expect(page.getByText("Answer practice")).toBeVisible()
  await expect(page.getByText("1 / 5")).toBeVisible()
  await expect(page.getByText("Listen before reading")).toBeVisible()
  await page.getByRole("button", { name: "Play question normally" }).click()
  await page.getByRole("button", { name: "Play question slowly" }).click()
  await page.getByRole("button", { name: "Reveal Korean" }).click()

  // The mocked recognizer reports "not-allowed": the box explains and switches to typing.
  await page.getByRole("button", { name: "Start recording" }).click()
  await expect(
    page.getByRole("alert").filter({ hasText: "Microphone access is blocked" }),
  ).toBeVisible()
  const answer = page.getByLabel("Your answer")
  await expect(answer).toBeEditable()
  await answer.fill(KO_ANSWER)

  await page.getByRole("button", { name: "Check my answer" }).click()
  await expect(page.getByText("Correction available")).toBeVisible()
  await expect(page.getByText(/not direct audio pronunciation analysis/)).toBeVisible()
  await page.screenshot({ path: "test-results/interview-correction-428.png", fullPage: true })

  await page.getByRole("button", { name: "Retry Answer" }).click()
  await answer.fill(KO_RETRY)
  await page.getByRole("button", { name: "Check my answer" }).click()
  await expect(page.getByText(/Improvement \+1.4/)).toBeVisible()

  await page.getByRole("button", { name: "Next Question" }).click()
  for (let questionNumber = 2; questionNumber <= 5; questionNumber += 1) {
    await expect(page.getByText(`${questionNumber} / 5`)).toBeVisible()
    await answer.fill(`한국 여름 ${questionNumber}번 답변입니다.`)
    await page.getByRole("button", { name: "Check my answer" }).click()
    await expect(page.getByText("Correction available")).toBeVisible()
    await page
      .getByRole("button", { name: questionNumber < 5 ? "Next Question" : "Complete session" })
      .click()
  }

  await expect(page.getByRole("heading", { name: "Practice set complete" })).toBeVisible()
  await expect(page.getByText(/checked 5, and retried 1/)).toBeVisible()
  await page.getByRole("link", { name: "Back to Exam Prep" }).click()
  await expect(page.getByText("5 of 50 questions practiced")).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText("All 5 done today")).toBeVisible()
  await page.reload()
  await expect(page.getByText("5 of 50 questions practiced")).toBeVisible()

  // Advanced selection lives in the "Change questions" sheet.
  await page.goto("/interview/speaking")
  await page.getByRole("button", { name: "Change questions" }).click()
  await expect(page.getByRole("dialog", { name: "Change questions" })).toBeVisible()
  await expect(page.getByRole("radio", { name: /Weak questions/ })).toBeEnabled()
  await page.getByRole("button", { name: /choose questions from the bank/ }).click()
  await expect(page.getByRole("heading", { name: "Question Bank" })).toBeVisible()
  await page.getByPlaceholder("Search Korean text, English, or keyword").fill("question 50")
  await expect(page.getByText("Showing 1 of 50")).toBeVisible()
  await page.getByRole("button", { name: "Back to practice" }).click()

  await page.setViewportSize({ width: 375, height: 812 })
  await noHorizontalOverflow(page)
  await page.screenshot({ path: "test-results/interview-practice-375.png", fullPage: true })

  await page.evaluate(() => window.localStorage.setItem("theme", "dark"))
  await page.reload()
  await expect(page.getByText("Answer practice")).toBeVisible()
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await noHorizontalOverflow(page)
  }
  await page.setViewportSize({ width: 428, height: 926 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "20px"
  })
  await noHorizontalOverflow(page)
})

test("listening practice: audio only until review, compare for free, then AI feedback", async ({
  page,
}) => {
  await installMocks(page)
  await page.goto("/interview/listening")

  await expect(page.getByText("Listening practice")).toBeVisible()
  await expect(page.getByText(/Audio only — answer what you heard/)).toBeVisible()
  // No early reveal and no English before answering.
  await expect(page.getByRole("button", { name: "Reveal Korean" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Show English" })).toHaveCount(0)

  // Comprehension only: reveal without answering is allowed.
  await page.getByRole("button", { name: "Reveal & compare" }).click()
  await expect(page.getByText("What was asked")).toBeVisible()
  await expect(page.getByText("Model answer from your bank")).toBeVisible()
  await expect(page.getByText(/You revealed without answering/)).toBeVisible()

  await page.getByRole("button", { name: "Try again" }).click()
  await page.getByRole("button", { name: "Start recording" }).click()
  const answer = page.getByLabel("Your answer")
  await answer.fill(KO_ANSWER)
  await page.getByRole("button", { name: "Reveal & compare" }).click()
  await expect(page.getByText("Your answer", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Get AI feedback" }).click()
  await expect(page.getByText("Correction available")).toBeVisible()

  // Exam level: one listen, normal speed only, no English anywhere.
  await page.getByRole("button", { name: "Change questions" }).click()
  await page.getByRole("radio", { name: /Exam Mode/ }).click()
  await page.getByRole("button", { name: "Start this set" }).click()
  await page.getByRole("button", { name: "Start new set" }).click()
  await expect(page.getByText(/Listening practice · .+ · Exam Mode/)).toBeVisible()
  await expect(page.getByText(/listens? left|No listens left/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Play question slowly" })).toHaveCount(0)
})
