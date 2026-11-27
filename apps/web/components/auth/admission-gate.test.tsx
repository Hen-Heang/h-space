/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const check = vi.hoisted(() => vi.fn())
const clearAuth = vi.hoisted(() => vi.fn(async () => undefined))
const replace = vi.hoisted(() => vi.fn())
const router = vi.hoisted(() => ({ replace }))
const enforced = vi.hoisted(() => ({ value: true }))

// Stable like Next's own router.
vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("@/lib/api/admission", () => ({ admissionApi: { check } }))
vi.mock("@/lib/auth-store", () => ({
  clearAuth,
  getUserId: () => "11111111-0000-4000-8000-000000000001",
  onAuthChange: () => () => undefined,
}))
vi.mock("@/lib/auth-v2", async (original) => ({
  ...(await original<typeof import("@/lib/auth-v2")>()),
  isAdmissionEnforced: () => enforced.value,
}))

import { ACCESS_DENIED_LOGIN_HREF, AdmissionGate } from "./admission-gate"

// App-entry admission states (synthetic). Children stand in for the app shell:
// they must not mount until admission is confirmed.

beforeEach(() => {
  enforced.value = true
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const app = <p>workspace data</p>

describe("AdmissionGate", () => {
  it("off: renders the app unchanged and never checks", () => {
    enforced.value = false
    render(<AdmissionGate>{app}</AdmissionGate>)
    expect(screen.getByText("workspace data")).toBeTruthy()
    expect(check).not.toHaveBeenCalled()
  })

  it("checking: an accessible status, and the app is not mounted yet", () => {
    check.mockReturnValue(new Promise(() => undefined))
    render(<AdmissionGate>{app}</AdmissionGate>)
    expect(screen.getByRole("status").textContent).toContain("Checking access")
    expect(screen.queryByText("workspace data")).toBeNull()
  })

  it("ACC-01: approved mounts the app", async () => {
    check.mockResolvedValue("approved")
    render(<AdmissionGate>{app}</AdmissionGate>)
    expect(await screen.findByText("workspace data")).toBeTruthy()
  })

  it("ACC-02 / SES-03: denied signs out and goes to sign-in with the generic notice; nothing mounts", async () => {
    check.mockResolvedValue("denied")
    render(<AdmissionGate>{app}</AdmissionGate>)
    await waitFor(() => expect(replace).toHaveBeenCalledWith(ACCESS_DENIED_LOGIN_HREF))
    expect(clearAuth).toHaveBeenCalled()
    expect(screen.queryByText("workspace data")).toBeNull()
  })

  it("ACC-06: unavailable shows retry and sign-out, never the app; retry re-checks", async () => {
    check.mockResolvedValueOnce("unavailable").mockResolvedValueOnce("approved")
    render(<AdmissionGate>{app}</AdmissionGate>)
    const retry = await screen.findByRole("button", { name: "Try again" })
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy()
    expect(screen.queryByText("workspace data")).toBeNull()
    fireEvent.click(retry)
    expect(await screen.findByText("workspace data")).toBeTruthy()
    expect(check).toHaveBeenCalledTimes(2)
  })
})
