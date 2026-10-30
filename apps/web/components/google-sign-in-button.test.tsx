/** @vitest-environment jsdom */

import { cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { SignInResult } from "@/lib/api"
import { handleGoogleCredential } from "@/lib/google-auth"

import { GoogleSignInButton } from "./google-sign-in-button"

// The button reads the client id when its module loads.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-client-id"
})

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

vi.mock("@/lib/google-auth", () => ({
  loadGoogleScript: vi.fn(() => Promise.resolve()),
  makeNonce: vi.fn(() => Promise.resolve({ nonce: "n", hashedNonce: "h" })),
  handleGoogleCredential: vi.fn(),
}))

// Stands in for Google Identity Services: keeps the callback the button
// registers so a test can answer it with a credential.
let googleCallback: ((response: { credential: string }) => Promise<void>) | undefined

beforeEach(() => {
  googleCallback = undefined
  window.google = {
    accounts: {
      id: {
        initialize: (config) => {
          googleCallback = config.callback as typeof googleCallback
        },
        renderButton: () => {},
      },
    },
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  delete window.google
})

async function signInWithGoogle(result: SignInResult) {
  vi.mocked(handleGoogleCredential).mockResolvedValue(result)
  await waitFor(() => expect(googleCallback).toBeDefined())
  await googleCallback!({ credential: "google-id-token" })
}

describe("GoogleSignInButton", () => {
  it("goes to redirectTo once signed in", async () => {
    const onMfaRequired = vi.fn()
    render(<GoogleSignInButton onMfaRequired={onMfaRequired} redirectTo="/home" />)

    await signInWithGoogle({ status: "signed_in", userId: "u1", email: "a@example.com" })

    expect(handleGoogleCredential).toHaveBeenCalledWith("google-id-token")
    expect(push).toHaveBeenCalledWith("/home")
    expect(onMfaRequired).not.toHaveBeenCalled()
  })

  it("hands the challenge to onMfaRequired instead of signing in", async () => {
    const onMfaRequired = vi.fn()
    const onError = vi.fn()
    render(<GoogleSignInButton onMfaRequired={onMfaRequired} onError={onError} />)

    await signInWithGoogle({ status: "mfa_required", mfaToken: "mfa-challenge" })

    expect(onMfaRequired).toHaveBeenCalledWith("mfa-challenge")
    expect(push).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it("reports an error rather than signing in when nothing can ask for the code", async () => {
    const onError = vi.fn()
    render(<GoogleSignInButton onError={onError} />)

    await signInWithGoogle({ status: "mfa_required", mfaToken: "mfa-challenge" })

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("Two-step verification"))
    expect(push).not.toHaveBeenCalled()
  })
})
