import { defineConfig } from "@playwright/test"

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  outputDir: "test-results/playwright",
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:3100",
    viewport: { width: 428, height: 926 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    colorScheme: "light",
    launchOptions: executablePath ? { executablePath } : undefined,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "iphone-12-pro-max-chromium",
      use: { browserName: "chromium" },
    },
  ],
  // The specs fake every Supabase call with page.route("**/rest/v1/**"). That
  // only works if the app's CSP (lib/csp.ts, built from
  // NEXT_PUBLIC_SUPABASE_URL) lets the browser send the request at all: with
  // no Supabase URL the client falls back to an origin the CSP blocks, the
  // request never reaches the route handler, and pages sit on their loading
  // skeletons. So the server started here always gets a synthetic Supabase
  // origin that the mocks answer — and an e2e run can't reach the real,
  // Orbit-shared database. Export real values only for the signed-in journey
  // (HENGO_E2E_STORAGE_STATE). With PLAYWRIGHT_BASE_URL, start the server
  // yourself with the same two variables.
  webServer: externalBaseUrl
    ? undefined
    : {
        // `pnpm dev -- --port` would hand Next a literal "--"; call next directly.
        command: "pnpm exec next dev --port 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_SUPABASE_URL:
            process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://e2e-supabase.invalid",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "e2e-publishable-key",
        },
      },
})
