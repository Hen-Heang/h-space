import { expect, test, type Page } from "@playwright/test"

// Listen & Repeat inside My exam script, the /interview/repeat route, and the
// script editor's actions menu. Supabase REST and TTS are mocked; the speech
// recognizer reports "not-allowed" so the typed path is exercised.

const USER_ID = "11111111-1111-4111-8111-111111111111"
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJleHAiOjIwMDAwMDAwMDB9.signature"
// The learner's own (saved) first section, the self-introduction, which must
// win over the drafted script.
const SAVED_OPENING = "안녕하세요. 저는 헨리입니다."

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

  const scriptRow = {
    topic_id: "weather",
    sections: { "self-intro": SAVED_OPENING },
    updated_at: new Date().toISOString(),
  }
  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request()
    const table = new URL(request.url()).pathname.split("/").at(-1)
    if (table === "kori_interview_scripts" && request.method() === "GET") {
      // .maybeSingle() may ask for a single object or an array.
      const single = (request.headers()["accept"] ?? "").includes("vnd.pgrst.object")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(single ? scriptRow : [scriptRow]),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })
  await page.route("**/api/ai/tts", async (route) => {
    const silentWav = Buffer.from(
      "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
      "base64",
    )
    await route.fulfill({ status: 200, contentType: "audio/wav", body: silentWav })
  })
  await page.route("**/api/ai/**", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  )
}

test("Listen & Repeat in My exam script practices the saved script, typed when the mic is blocked", async ({
  page,
}) => {
  await installMocks(page)
  await page.goto("/interview/script?tab=repeat")

  // Deep link opens the tab; wait until the account copy has loaded.
  await expect(page.getByRole("button", { name: /Listen & Repeat/, pressed: true })).toBeVisible()
  await expect(page.getByText("Saved to your account")).toBeVisible({ timeout: 30_000 })

  await page.getByRole("button", { name: "Start Listen & Repeat" }).click()
  await expect(page.getByText("안녕하세요.", { exact: true })).toBeVisible()

  // The recognizer is blocked (or the learner chooses typing): the typed path works.
  const typed = page.getByLabel("Type the sentence you heard")
  if (!(await typed.isVisible())) {
    await page.getByRole("button", { name: /Type it instead/ }).click()
  }
  await typed.fill("안녕하세요.")
  await page.getByRole("button", { name: "Check" }).click()
  await expect(page.getByText("Matched the sentence")).toBeVisible()
  await expect(page.getByText(/this checks recall, not speaking/)).toBeVisible()

  await page.getByRole("button", { name: /Next sentence/ }).click()
  await expect(page.getByText("저는 헨리입니다.", { exact: true })).toBeVisible()
  // English is on demand: never "Hide English" (i.e. already shown) on arrival.
  await expect(page.getByRole("button", { name: "Hide English" })).toHaveCount(0)
  await page.getByRole("button", { name: "Finish" }).click()
  await expect(page.getByText("Listen & Repeat complete")).toBeVisible()
  await expect(page.getByText(/1 of 1 sentences matched|All 1 sentences matched/)).toBeVisible()
})

test("/interview/repeat still works and points to its new home", async ({ page }) => {
  await installMocks(page)
  await page.goto("/interview/repeat")
  await expect(page.getByRole("button", { name: "Start Listen & Repeat" })).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByRole("link", { name: /Part of My exam script/ })).toHaveAttribute(
    "href",
    "/interview/script?tab=repeat",
  )
  await page.getByRole("radio", { name: /Key phrases/ }).click()
  await expect(page.getByRole("radio", { name: /Key phrases/ })).toHaveAttribute(
    "aria-checked",
    "true",
  )
})

test("script editor actions live in one menu", async ({ page }) => {
  await installMocks(page)
  await page.goto("/interview/script")
  await expect(page.getByText("Saved to your account")).toBeVisible({ timeout: 30_000 })
  await page.getByRole("button", { name: "Script actions" }).click()
  await expect(page.getByRole("menuitem", { name: /Copy script/ })).toBeVisible()
  await expect(page.getByRole("menuitem", { name: /Download as text/ })).toBeVisible()
  await page.getByRole("menuitem", { name: /Clear script/ }).click()
  await expect(page.getByRole("alertdialog", { name: /Clear the whole script/ })).toBeVisible()
  await page.getByRole("button", { name: "Keep my script" }).click()
})
