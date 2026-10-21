import { expect, test, type Page } from "@playwright/test"

const viewports = [
  { name: "small-mobile", width: 360, height: 800 },
  { name: "iphone-12-pro-max", width: 428, height: 926 },
  { name: "iphone-12-pro-max-landscape", width: 926, height: 428 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
] as const

async function expectNoDocumentOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(geometry.scrollWidth, "document-level horizontal overflow").toBeLessThanOrEqual(
    geometry.clientWidth + 1,
  )
}

test.describe("public responsive shell", () => {
  for (const viewport of viewports) {
    test(`landing and login fit ${viewport.name}`, async ({ page }) => {
      const browserErrors: string[] = []
      page.on("pageerror", (error) => browserErrors.push(error.message))

      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto("/")
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await page
        .getByRole("heading", { name: "Hengo Learning stays focused on workplace Korean." })
        .scrollIntoViewIfNeeded()
      await expect(
        page.getByRole("heading", { name: "Hengo Learning stays focused on workplace Korean." }),
      ).toBeVisible()
      await expectNoDocumentOverflow(page)

      await page.goto("/login")
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
      await expectNoDocumentOverflow(page)
      expect(browserErrors).toEqual([])
    })
  }

  test("mobile controls are practical touch targets and theme menu stays in the viewport", async ({
    page,
  }) => {
    await page.goto("/login")

    const themeButton = page.getByRole("button", { name: "Toggle theme" })
    const passwordButton = page.getByRole("button", { name: "Show password" })
    for (const control of [themeButton, passwordButton]) {
      const box = await control.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }

    await themeButton.click()
    const menu = page.getByRole("menu")
    await expect(menu).toBeVisible()
    const box = await menu.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(428)
    expect(box!.y + box!.height).toBeLessThanOrEqual(926)
  })

  test("registration step two remains usable on the primary mobile viewport", async ({ page }) => {
    await page.goto("/register")
    await page.getByPlaceholder("Your name").fill("Responsive Tester")
    await page.getByPlaceholder("name@example.com").fill("responsive@example.com")
    await page.getByPlaceholder("At least 8 characters").fill("safe-test-password")
    await page.getByRole("button", { name: "Continue" }).click()

    await expect(page.getByRole("heading", { name: "Tell us about you" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible()
    await expectNoDocumentOverflow(page)
  })

  test("all landing sections reveal during real scrolling", async ({ page }) => {
    await page.goto("/")
    for (const name of [
      "Hengo Learning stays focused on workplace Korean.",
      "One loop, from real work to fluency.",
      "Made for engineers, not tourists.",
      "Ready to speak Korean at work?",
    ]) {
      const heading = page.getByRole("heading", { name })
      await heading.scrollIntoViewIfNeeded()
      await expect(heading).toBeVisible()
    }
  })
})
