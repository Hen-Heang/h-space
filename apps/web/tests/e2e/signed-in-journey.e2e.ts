import { readFileSync, writeFileSync } from "node:fs"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { expect, test, type Page } from "@playwright/test"

import { freshTotp } from "./totp"

// Signed-in journey against REAL Supabase Auth with a THROWAWAY test account:
// password sign-in, two-step verification with a backup authenticator, the
// pages that read the account's data, and H-Vault over /api/vault.
//
// Skipped unless E2E_EMAIL, E2E_PASSWORD, E2E_SUPABASE_URL and
// E2E_SUPABASE_PUBLISHABLE_KEY are set. Never point it at a real person's
// account: it enrolls and removes authenticators and writes test rows
// (tagged / labelled "E2E") that it deletes again at the end. The vault part
// expects the dev server to run with NEXT_PUBLIC_FEATURE_VAULT_LIVE=true and
// VAULT_DATABASE_URL pointing at a throwaway database.
//
// E2E_STATE_FILE (optional) keeps the test authenticators' setup keys between
// runs, so a failed run's factors can still be removed by the next one.

const EMAIL = process.env.E2E_EMAIL ?? ""
const PASSWORD = process.env.E2E_PASSWORD ?? ""
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? ""
const SUPABASE_KEY = process.env.E2E_SUPABASE_PUBLISHABLE_KEY ?? ""
const STATE_FILE = process.env.E2E_STATE_FILE
const SHOTS = process.env.E2E_SCREENSHOT_DIR

// Fictional vault values; asserted never to leave the browser in readable form.
const MASTER = "e2e fictional master password 2026"
const SERVICE = "E2E Example Service"
const LOGIN = "e2e.login@example.com"
const ACCOUNT_PASSWORD = "e2e-fictional-account-pass-7"

test.skip(
  !EMAIL || !PASSWORD || !SUPABASE_URL || !SUPABASE_KEY,
  "Set E2E_EMAIL, E2E_PASSWORD, E2E_SUPABASE_URL and E2E_SUPABASE_PUBLISHABLE_KEY",
)
test.describe.configure({ mode: "serial", timeout: 240_000 })

/** Setup keys of the test authenticators, by factor id, plus their names. */
type State = { secrets: Record<string, string>; names: Record<string, string> }
function readState(): State {
  try {
    const saved = STATE_FILE ? (JSON.parse(readFileSync(STATE_FILE, "utf8")) as Partial<State>) : {}
    return { secrets: saved.secrets ?? {}, names: saved.names ?? {} }
  } catch {
    return { secrets: {}, names: {} }
  }
}
const state = readState()
function secretFor(name: string): string {
  const id = Object.entries(state.names).find(([, n]) => n === name)?.[0]
  const secret = id ? state.secrets[id] : undefined
  if (!secret) throw new Error(`no setup key stored for ${name}`)
  return secret
}
function remember(id: string, name: string, secret: string) {
  state.secrets[id] = secret
  state.names[id] = name
  saveState()
}
function saveState() {
  if (STATE_FILE) writeFileSync(STATE_FILE, JSON.stringify(state), { mode: 0o600 })
}

let testUserId = ""

const seeded: { inbox: string[]; journal: string[]; habits: string[] } = {
  inbox: [],
  journal: [],
  habits: [],
}

async function nodeClient(): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await client.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (error) throw new Error(`test account sign-in failed: ${error.message}`)
  return client
}

/**
 * Removes every authenticator on the test account, using stored setup keys.
 * Verifies with one factor, removes the others, and that one last: removing
 * the factor a session was verified with drops it back to aal1, after which
 * Supabase refuses to remove the rest.
 */
async function removeAllFactors(client: SupabaseClient) {
  const { data, error } = await client.auth.mfa.listFactors()
  if (error) throw new Error(`cleanup list failed: ${error.message}`)
  const all = data?.all ?? []
  const verified = all.filter((f) => f.status === "verified")
  const keyed = verified.find((f) => state.secrets[f.id])
  if (verified.length > 0) {
    if (!keyed) throw new Error("Test account has authenticators with unknown keys")
    const verify = await client.auth.mfa.challengeAndVerify({
      factorId: keyed.id,
      code: await freshTotp(state.secrets[keyed.id]),
    })
    if (verify.error) throw new Error(`cleanup verify failed: ${verify.error.message}`)
  }
  const order = [...all.filter((f) => f.id !== keyed?.id), ...(keyed ? [keyed] : [])]
  for (const f of order) {
    const { error: removeError } = await client.auth.mfa.unenroll({ factorId: f.id })
    if (removeError) throw new Error(`cleanup unenroll failed: ${removeError.message}`)
  }
  state.secrets = {}
  state.names = {}
  saveState()
}

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

async function signInWithPassword(page: Page, password = PASSWORD) {
  await page.goto("/login")
  await page.getByPlaceholder("name@example.com").fill(EMAIL)
  await page.getByPlaceholder("Your password").fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
}

async function enroll(page: Page, name: string): Promise<string> {
  await page.locator("#mfa-device-name").fill(name)
  await page.getByRole("button", { name: "Continue" }).click()
  const secret = ((await page.locator("code").first().textContent()) ?? "").replace(/\s+/g, "")
  expect(secret).toMatch(/^[A-Z2-7]{16,}$/)
  await expect(page.getByAltText(/QR code for adding H-Space/)).toBeVisible()
  await page.locator("#mfa-confirm-code").fill(await freshTotp(secret))
  await page.getByRole("button", { name: /^Verify and (turn on|add)$/ }).click()
  await expect(page.getByRole("heading", { name: "Your authenticators" })).toBeVisible()
  return secret
}

async function factorIdByName(name: string): Promise<string> {
  const client = await nodeClient()
  const { data } = await client.auth.mfa.listFactors()
  const id = data?.all.find((f) => f.friendly_name === name)?.id
  if (!id) throw new Error(`no factor named ${name}`)
  return id
}

test.beforeAll(async () => {
  const client = await nodeClient()
  await removeAllFactors(client) // a previous failed run may have left some
  const user = (await client.auth.getUser()).data.user!
  testUserId = user.id

  const inbox = await client
    .from("kori_inbox_items")
    .insert([
      { user_id: user.id, content: "E2E inbox capture: call the dentist", item_type: "task" },
      { user_id: user.id, content: "E2E inbox idea: weekend hike plan", item_type: "idea" },
    ])
    .select("id")
  if (inbox.error) throw new Error(`seed inbox: ${inbox.error.message}`)
  seeded.inbox = inbox.data.map((r) => r.id as string)

  const journal = await client
    .from("kori_journal_entries")
    .insert({
      user_id: user.id,
      title: "E2E journal entry",
      content: "A fictional reflection written by the end-to-end test.",
      tags: ["e2e"],
    })
    .select("id")
  if (journal.error) throw new Error(`seed journal: ${journal.error.message}`)
  seeded.journal = journal.data.map((r) => r.id as string)

  const habits = await client
    .from("kori_habits")
    .insert({ user_id: user.id, label: "E2E read 10 pages", category: "reading" })
    .select("id")
  if (habits.error) throw new Error(`seed habits: ${habits.error.message}`)
  seeded.habits = habits.data.map((r) => r.id as string)
  await client.auth.signOut()
})

test.afterAll(async () => {
  const client = await nodeClient()
  // Test rows first, so a factor problem can't leave them behind.
  if (seeded.inbox.length) await client.from("kori_inbox_items").delete().in("id", seeded.inbox)
  if (seeded.journal.length)
    await client.from("kori_journal_entries").delete().in("id", seeded.journal)
  if (seeded.habits.length) await client.from("kori_habits").delete().in("id", seeded.habits)
  await removeAllFactors(client)
  await client.auth.signOut()
})

// A brand-new account sees the first-run welcome dialog; the first signed-in
// test dismisses it like a user would, the rest start as a returning browser.
test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.startsWith("password sign-in")) return
  await page.addInitScript(
    (key: string) => window.localStorage.setItem(key, "done"),
    `hengo:onboarding:${testUserId}`,
  )
})

test("signed-out pages", async ({ page }) => {
  await page.goto("/register")
  await expect(page.getByRole("heading", { name: "H-Space is invite-only" })).toBeVisible()
  await shot(page, "01-register")

  await page.goto("/verify-email")
  await expect(page).toHaveURL(/\/login$/)
  await page.goto("/unlock-account")
  await expect(page).toHaveURL(/\/login$/)

  await page.goto("/reset-password")
  await expect(page.getByRole("heading", { name: "Link expired" })).toBeVisible()

  // /home is the default destination, so it needs no ?next=; other pages keep theirs.
  await page.goto("/home")
  await expect(page).toHaveURL(/\/login$/)
  await page.goto("/inbox")
  await expect(page).toHaveURL(/\/login\?next=%2Finbox/)
  await shot(page, "02-login")
})

test("password sign-in, data pages, and the vault's MFA requirement", async ({ page }) => {
  await signInWithPassword(page, "definitely-the-wrong-password")
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toContainText(
    /invalid login credentials/i,
  )

  await signInWithPassword(page)
  await expect(page).toHaveURL(/\/home/)
  await expect(page.getByRole("heading", { name: "Welcome to H-Space" })).toBeVisible()
  await page.getByRole("button", { name: "Skip for now" }).click()
  await expect(page.getByRole("heading", { name: "Welcome to H-Space" })).toHaveCount(0)
  await shot(page, "03-home")

  await page.goto("/inbox")
  await expect(page.getByText("E2E inbox capture: call the dentist")).toBeVisible()
  await expect(page.getByText("E2E inbox idea: weekend hike plan")).toBeVisible()
  await shot(page, "04-inbox")

  await page.goto("/growth/journal")
  await expect(page.getByText("E2E journal entry").first()).toBeVisible()
  await page.goto("/growth/habits")
  await expect(page.getByText("E2E read 10 pages").first()).toBeVisible()

  // No authenticator yet → H-Vault refuses and points to security settings.
  await page.goto("/vault")
  await expect(
    page.getByRole("heading", { name: "Turn on two-step verification first" }),
  ).toBeVisible()
  await shot(page, "05-vault-mfa-required")
})

test("two-step verification with a backup authenticator", async ({ page }) => {
  await signInWithPassword(page)
  await expect(page).toHaveURL(/\/home/)

  await page.goto("/settings/security")
  await expect(page.getByRole("heading", { name: "Name this authenticator" })).toBeVisible()
  const phone = await enroll(page, "E2E Phone") // enroll first: the lookup needs the factor
  remember(await factorIdByName("E2E Phone"), "E2E Phone", phone)
  await expect(page.getByRole("heading", { name: "Add a backup" })).toBeVisible()
  await shot(page, "06-security-one-device")

  await page.getByRole("button", { name: "Add a backup authenticator" }).click()
  await expect(page.getByRole("heading", { name: "Add a backup authenticator" })).toBeVisible()
  const tablet = await enroll(page, "E2E Tablet") // enroll first: the lookup needs the factor
  remember(await factorIdByName("E2E Tablet"), "E2E Tablet", tablet)
  await expect(page.getByText("E2E Phone")).toBeVisible()
  await expect(page.getByText("E2E Tablet")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Add a backup" })).toHaveCount(0)
  await shot(page, "07-security-two-devices")
})

test("sign-in asks for a code, lets you pick the device, and gates the app", async ({ page }) => {
  await signInWithPassword(page)
  await expect(page.getByRole("heading", { name: "Two-step verification" })).toBeVisible()
  await expect(page.getByRole("radio", { name: "E2E Phone" })).toBeVisible()
  await shot(page, "08-login-mfa-picker")

  // Half signed in: the app stays closed, and /login resumes at the code step.
  await page.goto("/home")
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole("heading", { name: "Two-step verification" })).toBeVisible()

  await page.getByText("E2E Tablet").click()
  await page.getByPlaceholder("123456").fill("000000")
  await page.getByRole("button", { name: "Verify" }).click()
  // Next.js keeps an empty role="alert" route announcer; match the form's own alert.
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible()

  await page.getByPlaceholder("123456").fill(await freshTotp(secretFor("E2E Tablet")))
  await page.getByRole("button", { name: "Verify" }).click()
  await expect(page).toHaveURL(/\/home/)
})

test("H-Vault end to end over /api/vault", async ({ page }) => {
  const bodies: string[] = []
  page.on("request", (request) => {
    if (request.url().includes("/api/vault")) bodies.push(request.postData() ?? "")
  })

  // Fresh sign-in with the backup device's code (an aal2 session).
  await signInWithPassword(page)
  await page.getByText("E2E Tablet").click()
  await page.getByPlaceholder("123456").fill(await freshTotp(secretFor("E2E Tablet")))
  await page.getByRole("button", { name: "Verify" }).click()
  await expect(page).toHaveURL(/\/home/)

  await page.goto("/vault")
  await expect(page.getByRole("heading", { name: "Set up your vault" }).first()).toBeVisible()
  await shot(page, "09a-vault-setup-card")
  await page.getByRole("button", { name: "Set up vault" }).click()
  await page.getByLabel("Master password", { exact: true }).fill(MASTER)
  await page.getByLabel("Confirm master password").fill(MASTER)
  await page.getByRole("button", { name: "Create vault" }).click()
  await expect(page.getByRole("heading", { name: /Save your recovery key/ })).toBeVisible({
    timeout: 30_000,
  })
  await page.getByRole("checkbox", { name: /saved my recovery key/ }).check()
  await page.getByRole("button", { name: "Open my vault" }).click()
  await shot(page, "09-vault-empty")

  await page.getByRole("button", { name: "Add account" }).first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Service name").fill(SERVICE)
  await dialog.getByLabel(/^Login email or username/).fill(LOGIN)
  await dialog.getByLabel(/^Password/).fill(ACCOUNT_PASSWORD)
  await dialog.getByRole("button", { name: "Add account" }).click()
  await expect(page.getByRole("article", { name: SERVICE })).toBeVisible({ timeout: 30_000 })
  await shot(page, "10-vault-account")

  await page.getByRole("button", { name: `Add ${SERVICE} to favorites` }).click()
  await expect(page.getByRole("button", { name: `Remove ${SERVICE} from favorites` })).toBeVisible()

  // Reload: the key is gone, the list needs the master password again.
  await page.reload()
  await expect(page.getByRole("heading", { name: "Your vault is locked" })).toBeVisible()
  await expect(page.getByRole("article", { name: SERVICE })).toHaveCount(0)
  await page.getByRole("button", { name: "Unlock vault" }).click()
  await expect(page.getByRole("heading", { name: /Unlock your vault/ })).toBeVisible()
  await page.getByLabel("Master password", { exact: true }).fill("wrong master password 123")
  await page.getByRole("button", { name: "Unlock" }).click()
  await expect(page.getByText("Wrong master password.")).toBeVisible({ timeout: 30_000 })
  await page.getByLabel("Master password", { exact: true }).fill(MASTER)
  await page.getByRole("button", { name: "Unlock" }).click()
  await expect(page.getByRole("article", { name: SERVICE })).toBeVisible({ timeout: 30_000 })
  await shot(page, "11-vault-unlocked")

  await page.getByRole("button", { name: `More actions for ${SERVICE}` }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click()
  await expect(page.getByRole("article", { name: SERVICE })).toHaveCount(0)

  // Nothing readable ever went to the server.
  const sent = bodies.join("\n")
  expect(bodies.some((b) => b.includes("payloadCiphertext"))).toBe(true)
  for (const secret of [SERVICE, LOGIN, ACCOUNT_PASSWORD, MASTER]) {
    expect(sent).not.toContain(secret)
  }
})

test("remove a lost device with the backup's code", async ({ page }) => {
  const tabletSecret = secretFor("E2E Tablet")
  await signInWithPassword(page)
  await page.getByText("E2E Tablet").click()
  await page.getByPlaceholder("123456").fill(await freshTotp(tabletSecret))
  await page.getByRole("button", { name: "Verify" }).click()
  await expect(page).toHaveURL(/\/home/)

  await page.goto("/settings/security")
  await page.getByRole("button", { name: "Remove E2E Phone" }).click()
  await expect(page.getByRole("heading", { name: /Remove “E2E Phone”/ })).toBeVisible()
  // The backup is chosen by default — the usual reason to remove one is loss.
  await expect(page.getByRole("radio", { name: "E2E Tablet" })).toBeChecked()
  await page.locator("#mfa-remove-code").fill(await freshTotp(tabletSecret))
  await page.getByRole("button", { name: "Remove authenticator" }).click()
  await expect(page.getByText("E2E Tablet")).toBeVisible()
  await expect(page.getByText("E2E Phone")).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Add a backup" })).toBeVisible()
  await shot(page, "12-security-after-remove")
  const phoneId = Object.entries(state.names).find(([, n]) => n === "E2E Phone")?.[0]
  if (phoneId) {
    delete state.secrets[phoneId]
    delete state.names[phoneId]
    saveState()
  }
})
