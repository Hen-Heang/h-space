/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Codex review on #148: with admission enforced, the layout's own effects must
// not read user data before admission is confirmed. The onboarding check reads
// kori_profiles, so it may only run inside <AdmissionGate>. Synthetic ids.

const check = vi.hoisted(() => vi.fn())
const getById = vi.hoisted(() => vi.fn())
const router = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock("next/navigation", () => ({ usePathname: () => "/home", useRouter: () => router }))
vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock("@/components/onboarding/OnboardingFlow", () => ({
  OnboardingFlow: () => <p>welcome wizard</p>,
}))
vi.mock("@/lib/api", () => ({ userApi: { getById } }))
vi.mock("@/lib/api/admission", () => ({ admissionApi: { check } }))
vi.mock("@/lib/auth-store", () => ({
  isAuthenticated: () => true,
  getUserId: () => "11111111-0000-4000-8000-000000000001",
  onAuthChange: () => () => undefined,
  clearAuth: vi.fn(async () => undefined),
}))
vi.mock("@/lib/onboarding-store", () => ({
  hasCompletedOnboarding: () => false,
  markOnboardingComplete: vi.fn(),
}))
vi.mock("@/lib/last-visited", () => ({ recordLastVisited: vi.fn() }))
vi.mock("@/lib/navigation", () => ({ sectionRoutePrefixes: {} }))
vi.mock("@/lib/auth-v2", async (original) => ({
  ...(await original<typeof import("@/lib/auth-v2")>()),
  isAdmissionEnforced: () => true,
}))

import MainLayout from "./layout"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("MainLayout with admission enforced", () => {
  it("doesn't read the profile while admission is still being checked", async () => {
    check.mockReturnValue(new Promise(() => undefined))
    render(<MainLayout>page</MainLayout>)
    expect(await screen.findByRole("status")).toBeTruthy()
    expect(getById).not.toHaveBeenCalled()
    expect(screen.queryByText("page")).toBeNull()
  })

  it("doesn't read the profile for a denied account", async () => {
    check.mockResolvedValue("denied")
    render(<MainLayout>page</MainLayout>)
    await waitFor(() => expect(router.replace).toHaveBeenCalled())
    expect(getById).not.toHaveBeenCalled()
  })

  it("reads it once admission is approved (onboarding still works)", async () => {
    check.mockResolvedValue("approved")
    getById.mockResolvedValue({ learningGoal: null })
    render(<MainLayout>page</MainLayout>)
    expect(await screen.findByText("welcome wizard")).toBeTruthy()
    expect(getById).toHaveBeenCalledTimes(1)
  })
})
