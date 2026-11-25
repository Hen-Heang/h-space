/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mfa = vi.hoisted(() => ({ devices: vi.fn(), reverify: vi.fn() }))
vi.mock("@/lib/api", () => ({
  MFA_CODE_INVALID: "mfa_verification_failed",
  mfaApi: mfa,
}))

import { VaultStepUpDialog } from "./VaultStepUpDialog"

// Fictional authenticators; no real codes.
const PHONE = { factorId: "f1", name: "iPhone", createdAt: "2026-11-21T00:00:00Z" }
const TABLET = { factorId: "f2", name: "iPad", createdAt: "2026-11-22T00:00:00Z" }

beforeEach(() => {
  mfa.devices.mockResolvedValue([PHONE, TABLET])
})

afterEach(() => {
  cleanup()
  mfa.devices.mockReset()
  mfa.reverify.mockReset()
})

function typeCode(code: string) {
  fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: code } })
}

describe("VaultStepUpDialog", () => {
  it("verifies the code on the first device by default and reports success", async () => {
    mfa.reverify.mockResolvedValue(undefined)
    const onDone = vi.fn()
    render(<VaultStepUpDialog open onDone={onDone} />)
    await screen.findByRole("radio", { name: "iPhone" })

    typeCode(" 123456 ")
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }))

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true))
    expect(mfa.reverify).toHaveBeenCalledWith("f1", " 123456 ")
  })

  it("uses the device the user picks", async () => {
    mfa.reverify.mockResolvedValue(undefined)
    const onDone = vi.fn()
    render(<VaultStepUpDialog open onDone={onDone} />)
    fireEvent.click(await screen.findByRole("radio", { name: "iPad" }))

    typeCode("654321")
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }))

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true))
    expect(mfa.reverify).toHaveBeenCalledWith("f2", "654321")
  })

  it("keeps the dialog open with a message for a wrong code", async () => {
    mfa.reverify.mockRejectedValue({ code: "mfa_verification_failed" })
    const onDone = vi.fn()
    render(<VaultStepUpDialog open onDone={onDone} />)
    await screen.findByRole("radio", { name: "iPhone" })

    typeCode("000000")
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }))

    expect((await screen.findByRole("alert")).textContent).toContain("didn't work")
    expect(onDone).not.toHaveBeenCalled()
  })

  it("reports a cancel as not verified, without checking anything", async () => {
    const onDone = vi.fn()
    render(<VaultStepUpDialog open onDone={onDone} />)
    await screen.findByRole("radio", { name: "iPhone" })

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onDone).toHaveBeenCalledWith(false)
    expect(mfa.reverify).not.toHaveBeenCalled()
  })
})
