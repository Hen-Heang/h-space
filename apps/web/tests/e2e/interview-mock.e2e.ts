import { expect, test, type Page } from "@playwright/test"

// Mock interview session (sticky actions, blocked mic → typing, English on
// demand), its scorecard caveat, and the ChatGPT Voice hand-off. The chat
// stream, evaluation, TTS, and Supabase REST are all mocked.

const USER_ID = "11111111-1111-4111-8111-111111111111"
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJleHAiOjIwMDAwMDAwMDB9.signature"

const QUESTIONS = [
  { ko: "왜 이 주제를 선택했어요?", en: "Why did you choose this topic?" },
  { ko: "한국에서 어떻게 출근해요?", en: "How do you get to work in Korea?" },
  { ko: "주말에는 보통 뭐 해요?", en: "What do you usually do on weekends?" },
]

function sse(events: [string, unknown][]) {
  return events
    .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    .join("")
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
    const table = new URL(request.url()).pathname.split("/").at(-1)
    const now = new Date().toISOString()
    if (request.method() === "POST" && table === "kori_conversations") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "33333333-3333-4333-8333-333333333333",
          user_id: USER_ID,
          scenario_id: null,
          title: "Mock Interview",
          conversation_type: "FREE_CHAT",
          model_used: null,
          created_at: now,
          updated_at: now,
          kori_messages: [{ count: 0 }],
        }),
      })
      return
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ...body, created_at: now }),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })

  let turn = 0
  await page.route("**/api/ai/chat/stream", async (route) => {
    const question = QUESTIONS[Math.min(turn, QUESTIONS.length - 1)]
    const feedback = turn === 0 ? "" : "[FEEDBACK] Good — one more detail would help.\n"
    turn += 1
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse([
        ["start", { userMessageId: `u${turn}` }],
        [
          "token",
          { token: `${feedback}[QUESTION_KO] ${question.ko}\n[QUESTION_EN] ${question.en}` },
        ],
        ["done", { assistantMessageId: `a${turn}` }],
      ]),
    })
  })
  await page.route("**/api/ai/interview/evaluate", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scores: { speaking: 4, pronunciation: 3, vocabulary: 4, confidence: 3 },
        summary: "Clear, short answers with a natural flow.",
        advice: ["Add one concrete example per answer."],
        analytics: {
          fillerNotes: "",
          avgSentenceLengthWords: 6,
          vocabRangeNotes: "",
          grammarIssues: [],
          wordsToPractice: [],
        },
      }),
    }),
  )
  await page.route("**/api/ai/tts", (route) =>
    route.fulfill({
      status: 200,
      contentType: "audio/wav",
      body: Buffer.from("UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=", "base64"),
    }),
  )
}

test("mock interview: typed answers with a blocked mic, sticky actions, honest scorecard, ChatGPT Voice", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.setViewportSize({ width: 375, height: 667 })
  await installMocks(page)
  await page.goto("/interview")

  await page.getByRole("button", { name: "Start practice interview" }).click()
  await expect(page.getByText(QUESTIONS[0].ko)).toBeVisible({ timeout: 30_000 })

  // English is on demand.
  await expect(page.getByText(QUESTIONS[0].en)).toHaveCount(0)
  await page.getByRole("button", { name: "Show English" }).click()
  await expect(page.getByText(QUESTIONS[0].en)).toBeVisible()

  // Blocked mic → the answer box explains and switches to typing. The
  // hands-free mic may already have tried (after the question audio); if not,
  // the learner taps Record.
  const blocked = page.getByRole("alert").filter({ hasText: "Microphone access is blocked" })
  const record = page.getByRole("button", { name: "Start recording" })
  await expect(blocked.or(record)).toBeVisible()
  if (await record.isVisible()) await record.click()
  await expect(blocked).toBeVisible()
  const answer = page.getByLabel("Your answer")
  await answer.fill("한국에 와서 생활이 많이 바뀌었기 때문이에요.")

  // The submit bar stays reachable on a small phone.
  const submit = page.getByRole("button", { name: "Submit answer" })
  await expect(submit).toBeInViewport()
  await submit.click()

  const questionRegion = page.getByRole("region", { name: "Examiner's question" })
  await expect(questionRegion.getByText(QUESTIONS[1].ko)).toBeVisible()
  await expect(page.getByText("Good — one more detail would help.")).toBeVisible()
  // Typing stays on for the next answer instead of flipping back to the mic.
  await expect(answer).toBeEditable()
  await expect(page.getByRole("heading", { name: "Session transcript" })).toBeVisible()

  await page.getByRole("button", { name: /Finish & get evaluation/ }).click()
  await expect(page.getByText(/never analyzes your audio/)).toBeVisible({ timeout: 30_000 })

  // ChatGPT Voice: honest about where it runs, opt-in script, exact preview.
  const card = page.getByRole("region", { name: "Free conversation with ChatGPT Voice" })
  await expect(card).toContainText("nothing you say there is saved, scored, or synced here")
  const open = card.getByRole("link", { name: /Open ChatGPT/ })
  await expect(open).toHaveAttribute("href", "https://chatgpt.com/")
  await expect(open).toHaveAttribute("target", "_blank")
  await expect(open).toHaveAttribute("rel", /noopener/)

  await card.getByRole("button", { name: "See exactly what's shared" }).click()
  const preview = card.locator("pre")
  await expect(preview).toContainText("Speak only Korean")
  await expect(preview).not.toContainText("My prepared script")
  await card.getByRole("switch").click()
  await expect(preview).toContainText("My prepared script")

  await card.getByRole("button", { name: "Copy practice prompt" }).click()
  await expect(page.getByText("Prompt copied — paste it into ChatGPT")).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain("My prepared script")
  expect(copied).toContain("Exam topic:")
})
