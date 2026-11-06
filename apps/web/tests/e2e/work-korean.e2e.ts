import { expect, test, type Page, type Route } from "@playwright/test"

import { dateKeyInTimeZone } from "@/lib/date-key"
import { SEED_PACKS } from "@/lib/korean-phrasebook/seed"

// "Korean for my work" — UI checks at phone (390, 430) and desktop
// (1280, 1440) widths. Every Supabase REST call and every AI route is
// fulfilled here in the browser; nothing reaches a real backend, and all
// data is synthetic (the curated starter packs + made-up rows).
//
// Run with a dev server whose Supabase settings are synthetic, e.g.
//   NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.test \
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=synthetic pnpm dev -- --port 3100
//   pnpm exec playwright test tests/e2e/work-korean.e2e.ts

const USER_ID = "11111111-1111-4111-8111-111111111111"
// Unsigned, synthetic token assembled at runtime (never a real credential).
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url")
const TOKEN = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: USER_ID, exp: 2_000_000_000 })}.synthetic`

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
const NOW = new Date().toISOString()
const TODAY = dateKeyInTimeZone(new Date(), "Asia/Seoul")

// Every starter pack already "seeded", so the page never plans a seed write.
const collections = SEED_PACKS.map((pack, i) => ({
  id: uuid(900 + i),
  user_id: USER_ID,
  source_key: pack.sourceKey,
  title_ko: pack.titleKo,
  title_en: pack.titleEn,
  description: pack.description,
  category: pack.category,
  seed_version: pack.seedVersion,
  pinned: false,
  created_at: NOW,
  updated_at: NOW,
}))
let n = 0
const cards = SEED_PACKS.flatMap((pack, i) =>
  pack.cards.map((card, position) => ({
    id: uuid(++n),
    user_id: USER_ID,
    collection_id: collections[i].id,
    source_key: card.sourceKey,
    category: card.category,
    situation: card.situation,
    difficulty: card.difficulty,
    question: card.question,
    question_variants: card.questionVariants,
    answers: card.answers,
    usage_note: card.usageNote ?? null,
    vocabulary: card.vocabulary,
    tags: card.tags,
    position,
    active: true,
    is_user_edited: false,
    work_context: card.workContext ?? null,
    provenance: card.provenance ?? null,
    source_label: null,
    created_at: NOW,
    updated_at: NOW,
  })),
)
const pickedCard = cards.find((c) => c.source_key === "work-confirm-criterion")!

const mission = {
  id: uuid(1000),
  user_id: USER_ID,
  mission_date: TODAY,
  title: "Understand and answer a work message + 2 more",
  reason: "Your focus is Korean for work.",
  estimated_minutes: 13,
  focus_skill_codes: [],
  created_at: NOW,
}
const missionItems = [
  {
    id: uuid(1001),
    item_type: "work_message",
    title: "Understand and answer a work message",
    reason: "Your focus is Korean for work.",
    target_count: 1,
    reference_ids: [pickedCard.id],
    skill_codes: ["listening.workplace"],
    estimated_minutes: 5,
    status: "pending",
    progress_count: 0,
    completed_at: null,
  },
  {
    id: uuid(1002),
    item_type: "vocab_review",
    title: "Review 1856 vocabulary cards",
    reason: "Words came due.",
    target_count: 10,
    reference_ids: Array.from({ length: 10 }, (_, i) => uuid(2000 + i)),
    skill_codes: [],
    estimated_minutes: 5,
    status: "pending",
    progress_count: 0,
    completed_at: null,
  },
  {
    id: uuid(1003),
    item_type: "daily_phrase",
    title: "Learn today's phrase",
    reason: "One phrase a day.",
    target_count: 1,
    reference_ids: [],
    skill_codes: [],
    estimated_minutes: 3,
    status: "pending",
    progress_count: 0,
    completed_at: null,
  },
]
const dueVocab = Array.from({ length: 10 }, (_, i) => ({
  id: uuid(2000 + i),
  term: `단어${i}`,
  meaning: `word ${i}`,
  category: "Work",
  mastery: 0,
  next_review: "2026-01-01T00:00:00.000Z",
  ease_factor: 2.5,
  interval_days: 0,
  repetitions: 0,
  lapses: 0,
  tags: [],
}))

const ANALYSIS = {
  originalText: "이 부분은 기존이랑 동일하게 처리해 주세요. 확인 부탁드려요.",
  mainPoint: "Handle one part the same way it works today.",
  requiredAction: "Handle “this part” like the existing behaviour.",
  conditions: ["Keep it the same as the existing behaviour"],
  deadline: "",
  expectedResult: "",
  unknowns: ["Which part “이 부분” refers to"],
  clarifyingQuestion: "이 부분이 어느 화면을 말씀하시는 건가요?",
  recommendedReply: {
    korean: "네, 확인했습니다. 이 부분이 어느 화면인지 여쭤봐도 될까요?",
    romanization: "ne, hwaginhaetseumnida. i bubuni eoneu hwamyeoninji yeojjwobwado doelkkayo?",
    english: "Got it. May I ask which screen this part is?",
    register: "formal",
  },
  usefulLanguage: [
    { korean: "기존", english: "existing", note: "What's there now." },
    { korean: "동일하게", english: "the same way", note: "" },
    { korean: "~해 주세요", english: "please do ~", note: "A polite request." },
  ],
  messageRomanization: "i bubuneun gijonirang dongilhage cheorihae juseyo.",
  literalMeaning: "This part, the same as existing, please process.",
  naturalMeaning: "Please handle this part the same way as before.",
  businessContext: "Probably a small change where existing behaviour must stay.",
  politenessLevel: "존댓말 (polite) — fine for coworkers",
  tone: "Neutral, routine",
  breakdown: [{ fragment: "동일하게", meaning: "the same way", note: "Formal-sounding word." }],
  suggestedReplies: [{ korean: "네, 알겠습니다.", english: "OK.", formality: "존댓말 (polite)" }],
  modelUsed: "synthetic-model",
}

type Captured = { table: string; method: string; body: unknown }

async function installMocks(page: Page, opts: { analyzer?: "ok" | "error" } = {}) {
  const writes: Captured[] = []
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
    { userId: USER_ID, token: TOKEN },
  )

  await page.route("**/rest/v1/**", async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split("/").at(-1) ?? ""
    const method = request.method()
    const wantsObject = (request.headers()["accept"] ?? "").includes("vnd.pgrst.object")
    if (method !== "GET" && method !== "HEAD") {
      writes.push({ table, method, body: request.postDataJSON?.() ?? null })
      const posted = request.postDataJSON?.() ?? {}
      const row = {
        id: uuid(5000 + writes.length),
        created_at: NOW,
        ...(Array.isArray(posted) ? posted[0] : posted),
      }
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(wantsObject ? row : [row]),
      })
    }
    const rows: Record<string, unknown[]> = {
      kori_profiles: [{ timezone: "Asia/Seoul", korean_level: "BEGINNER" }],
      kori_korean_coach_preferences: [
        {
          level: "beginner",
          main_goal: "workplace",
          explanation_language: "English",
          romanization_mode: "on-request",
          default_speech_speed: 0.75,
          daily_practice_goal_minutes: 10,
          correction_strictness: "balanced",
        },
      ],
      kori_phrase_collections: collections,
      kori_phrase_cards: url.searchParams.get("id")?.startsWith("eq.")
        ? cards.filter((c) => c.id === url.searchParams.get("id")!.slice(3))
        : cards,
      kori_daily_missions: [mission],
      kori_daily_mission_items: missionItems,
      kori_vocab_cards: dueVocab,
    }
    const body = rows[table] ?? []
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        // Real PostgREST exposes this so supabase-js can read counts cross-origin.
        "access-control-allow-origin": "*",
        "access-control-expose-headers": "content-range",
        "content-range":
          table === "kori_vocab_cards"
            ? "0-9/1856"
            : `0-${Math.max(0, body.length - 1)}/${body.length}`,
      },
      body: JSON.stringify(wantsObject ? (body[0] ?? null) : body),
    })
  })

  // Generic AI guard first; specific routes registered later take precedence.
  await page.route("**/api/ai/**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "offline" }),
    }),
  )
  await page.route("**/api/ai/analyzer", (route) => {
    const events =
      opts.analyzer === "error"
        ? [
            ["start", {}],
            ["partial", { mainPoint: "Handle one" }],
            [
              "error",
              { message: "The analysis didn't finish. Check your connection and try again." },
            ],
          ]
        : [
            ["start", {}],
            ["partial", { mainPoint: "Handle one part" }],
            ["done", ANALYSIS],
          ]
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: events
        .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        .join(""),
    })
  })
  await page.route("**/api/ai/phrasebook/evaluate", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        communicationSuccess: true,
        correctedSentence: "성공한 건과 대기 중인 건만 포함하면 될까요?",
        naturalAlternative: "성공 건과 대기 건만 포함하면 될까요?",
        explanation: "Clear question that confirms the criterion.",
        vocabulary: [],
        retryWords: [],
        mistakeSeverity: "none",
        meaningPreserved: true,
        pattern: "~만 포함하면 될까요? — should I include only ~?",
      }),
    }),
  )
  await page.route("**/api/ai/corrections/check", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        originalText: "확인하겠습니다",
        correctedText: "확인하겠습니다.",
        hasErrors: false,
        rating: 5,
        explanation: "Natural and keeps your future meaning.",
        grammarPoints: [],
        changes: [],
        meaningPreserved: true,
        meaningNote: null,
        pattern: "~하겠습니다 — I will ~",
      }),
    }),
  )
  return writes
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

for (const width of [390, 430, 1280]) {
  test(`Learning Hub at ${width}px: work step first, focus entry, backlog kept`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 800 ? 900 : 900 })
    await installMocks(page)
    await page.goto("/learn")

    const cta = page.getByRole("link", { name: /Practice the work message/ })
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute(
      "href",
      `/phrasebook/practice?mode=work&phraseId=${pickedCard.id}`,
    )
    await expect(page.getByRole("heading", { name: "Korean for my work" })).toBeVisible()
    await expect(page.getByRole("link", { name: /Understand a work message/ })).toBeVisible()
    await expect(page.getByText(/1,856 words are due in total/)).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: `test-results/work-korean/learn-${width}.png`, fullPage: true })
  })
}

test("Phrasebook at 390px: compact filters in a sheet, readable labels, Clear all", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installMocks(page)
  await page.goto("/phrasebook")

  await expect(page.getByRole("searchbox", { name: "Search Phrasebook" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Practice packs" })).toBeInViewport()
  // No raw machine keys on screen.
  await expect(page.getByText("requirement-clarification", { exact: true })).toHaveCount(0)
  await page.screenshot({ path: "test-results/work-korean/phrasebook-390.png", fullPage: true })

  await page.getByRole("button", { name: "Filters" }).click()
  const sheet = page.getByRole("dialog", { name: "Filters" })
  await expect(sheet).toBeVisible()
  await sheet.getByRole("searchbox", { name: "Find a situation" }).fill("clarify")
  await sheet.getByRole("button", { name: "Clarify requirements" }).click()
  await page.screenshot({ path: "test-results/work-korean/phrasebook-390-sheet.png" })
  await sheet.getByRole("button", { name: "Show cards" }).click()

  await expect(page.getByRole("button", { name: "Filters, 1 selected" })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Remove filter: Clarify requirements" }),
  ).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.getByRole("button", { name: "Clear all" }).press("Enter")
  await expect(page.getByRole("button", { name: "Filters" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Practice packs" })).toBeVisible()
})

test("Phrasebook at 1440px: filters open in a popover", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installMocks(page)
  await page.goto("/phrasebook")
  await page.getByRole("button", { name: "Filters" }).click()
  await expect(page.getByRole("searchbox", { name: "Find a situation" })).toBeVisible()
  await page.getByRole("button", { name: "Hard" }).click()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("button", { name: "Remove filter: Hard" })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: "test-results/work-korean/phrasebook-1440.png", fullPage: true })
})

for (const width of [390, 1280]) {
  test(`Analyzer at ${width}px: preview warning, main point first, details collapsed, review before save`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    const writes = await installMocks(page)
    await page.goto("/chat?mode=analyze")

    const box = page.getByRole("textbox", { name: "Korean message" })
    await box.fill(
      "이 부분은 기존이랑 동일하게 처리해 주세요. dev@example.test 로 확인 부탁드려요.",
    )
    await expect(page.getByText("This may include private details")).toBeVisible()
    await page.getByRole("button", { name: "Replace with placeholders" }).click()
    await expect(box).toHaveValue(/\[이메일\]/)

    const sent = page.waitForRequest("**/api/ai/analyzer")
    await page.getByRole("button", { name: "Analyze message" }).click()
    const body = JSON.parse((await sent).postData() ?? "{}") as { text: string }
    // The editable preview is exactly the payload.
    expect(body.text).toBe(await box.inputValue())
    expect(body.text).not.toContain("@example.test")

    await expect(page.getByText("Handle one part the same way it works today.")).toBeVisible()
    await expect(page.getByText("Not stated").first()).toBeVisible()
    await expect(page.getByText("Unclear — ask before you start")).toBeVisible()
    // Suggested reply hidden until asked; details collapsed.
    await expect(page.getByText(ANALYSIS.recommendedReply.korean)).toHaveCount(0)
    await expect(page.getByText("Likely interpretation (not stated)")).toHaveCount(0)
    // Raw text isn't saved by default.
    expect(writes.filter((w) => w.table === "kori_analyzer_history")).toHaveLength(0)

    await expectNoHorizontalOverflow(page)
    await page.screenshot({
      path: `test-results/work-korean/analyzer-${width}.png`,
      fullPage: true,
    })

    // /chat scrolls inside its own container, so also capture the results in view.
    await page.getByRole("heading", { name: "What it means" }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: `test-results/work-korean/analyzer-results-${width}.png` })
    await page.getByRole("heading", { name: "Practice this" }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: `test-results/work-korean/analyzer-practice-${width}.png` })

    await page.getByRole("button", { name: "Show the suggested reply" }).click()
    await expect(page.getByText(ANALYSIS.recommendedReply.korean)).toBeVisible()
    await page.getByRole("button", { name: "Save to Phrasebook" }).click()
    const dialog = page.getByRole("dialog", { name: "Save to Phrasebook" })
    await expect(dialog.getByText("Exact message", { exact: true })).toBeVisible()
    await dialog.getByLabel("Korean").first().fill("이 부분은 기존과 같게 처리해 주세요.")
    await expect(dialog.getByText("Your paraphrase", { exact: true })).toBeVisible()
    await page.screenshot({ path: `test-results/work-korean/analyzer-save-${width}.png` })
    // Nothing is written until "Save card".
    expect(writes.filter((w) => w.table === "kori_phrase_cards")).toHaveLength(0)
  })
}

test("Analyzer stream error shows a retry, not a half-finished lesson", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 })
  await installMocks(page, { analyzer: "error" })
  await page.goto("/chat?mode=analyze")
  await page.getByRole("textbox", { name: "Korean message" }).fill("확인 부탁드립니다.")
  await page.getByRole("button", { name: "Analyze message" }).click()
  await expect(page.getByText(/didn't finish/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Save to Phrasebook" })).toHaveCount(0)
})

test("Work-message practice at 430px: situation first, typed reply saved as evidence", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 })
  const writes = await installMocks(page)
  await page.goto(`/phrasebook/practice?mode=work&phraseId=${pickedCard.id}`)

  await expect(page.getByRole("heading", { name: "A coworker says…" })).toBeVisible()
  await expect(page.getByText(/Why this is useful/)).toBeVisible()
  // Transcript hidden until requested; nothing auto-plays.
  await expect(page.getByText(pickedCard.question.korean)).toHaveCount(0)
  await page.getByRole("button", { name: "Show the text" }).click()
  await expect(page.getByText(pickedCard.question.korean)).toBeVisible()
  await expect(page.getByText(pickedCard.answers[0].korean)).toHaveCount(0)

  await page.getByRole("button", { name: "Check my understanding" }).click()
  await expect(page.getByText("Change the counting criterion.")).toBeVisible()

  await page
    .getByLabel("What you mean (English, optional)")
    .fill("Should I include only successful and pending items?")
  await page.getByLabel("Your reply in Korean").fill("성공한 건과 대기 중인 건만 포함하면 될까요")
  await page.getByRole("button", { name: "Check my reply" }).click()

  await expect(page.getByText("It says what you meant")).toBeVisible()
  await expect(page.getByText(/not pronunciation/)).toBeVisible()
  await expect(page.getByText("Model reply")).toBeVisible()
  const attempt = writes.find((w) => w.table === "kori_phrase_attempts")
  expect(attempt?.body).toMatchObject({
    phrase_id: pickedCard.id,
    practice_mode: "speak",
    input_method: "text",
    task_completed: true,
  })
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: "test-results/work-korean/practice-430.png", fullPage: true })
})

test("Analyzer in dark mode at 430px stays readable", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.setViewportSize({ width: 430, height: 932 })
  await installMocks(page)
  await page.goto("/chat?mode=analyze")
  await page.getByRole("textbox", { name: "Korean message" }).fill("확인 부탁드립니다.")
  await page.getByRole("button", { name: "Analyze message" }).click()
  await expect(page.getByText("Handle one part the same way it works today.")).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: "test-results/work-korean/analyzer-430-dark.png", fullPage: true })
})
