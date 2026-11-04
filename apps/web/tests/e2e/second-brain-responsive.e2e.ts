import { expect, test, type Locator, type Page } from "@playwright/test"

const authState = process.env.HENGO_E2E_STORAGE_STATE

test.use({
  storageState: authState || { cookies: [], origins: [] },
})

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, "document-level horizontal overflow").toBeLessThanOrEqual(1)
}

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThanOrEqual(44)
  expect(box!.height).toBeGreaterThanOrEqual(44)
}

test.describe("authenticated second-brain journey at 428 × 926", () => {
  test.skip(!authState, "Set HENGO_E2E_STORAGE_STATE to a safe test-account storage state.")

  test("capture, organize, remind, journal, retrieve, and review", async ({ page }) => {
    const browserErrors: string[] = []
    page.on("pageerror", (error) => browserErrors.push(error.message))
    const unique = `Responsive audit ${Date.now()}`

    await page.goto("/inbox")
    await expectNoDocumentOverflow(page)
    const captureButton = page.getByRole("button", { name: "Quick capture" })
    await expect(captureButton).toBeVisible()
    await expectTouchTarget(captureButton)
    await captureButton.click()

    const captureDialog = page.getByRole("dialog", { name: "Quick capture" })
    await expect(captureDialog).toBeVisible()
    await expect(page.getByLabel("Content")).toBeVisible()
    await page.getByLabel("Title").fill(unique)
    await page.getByLabel("Content").fill(`${unique} mobile second-brain journey`)
    await captureDialog.getByRole("button", { name: "Capture" }).click()

    const inboxItem = page.locator("div").filter({ hasText: unique }).last()
    await expect(inboxItem).toBeVisible()
    await inboxItem.getByRole("button", { name: "Convert" }).click()
    await page.getByRole("menuitem", { name: "Convert to note" }).click()

    await page.goto("/notes")
    await page.getByText(unique, { exact: true }).first().click()
    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Note description").fill("Edited during the responsive audit")
    await page.getByRole("button", { name: "Save" }).click()

    const addReminder = page.getByRole("button", { name: "Add reminder" })
    await expectTouchTarget(addReminder)
    await addReminder.click()
    const reminderDialog = page.getByRole("dialog", { name: "New reminder" })
    await expect(reminderDialog).toBeVisible()
    const dialogBox = await reminderDialog.boundingBox()
    expect(dialogBox).not.toBeNull()
    expect(dialogBox!.height).toBeLessThanOrEqual(894)
    await reminderDialog.getByRole("button", { name: "One-time" }).click()
    await reminderDialog.getByLabel("Date and time").fill("2099-01-01T09:00")
    await reminderDialog.getByRole("button", { name: "Set reminder" }).click()

    await page.goto("/growth/journal")
    await page.getByPlaceholder("Title (optional)").fill(unique)
    await page.getByPlaceholder(/Anything else/).fill(`${unique} journal entry`)
    await page.getByRole("button", { name: "Save entry" }).click()

    await page.goto("/ask-hengo")
    await expect(page.getByRole("heading", { name: "Ask Hengo" })).toBeVisible()
    await expect(page.getByPlaceholder(/Ask about your notes/)).toBeVisible()
    await expectNoDocumentOverflow(page)

    await page.goto("/review/morning")
    await expect(page.getByRole("link", { name: "Morning" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await expectNoDocumentOverflow(page)
    expect(browserErrors).toEqual([])
  })
})
