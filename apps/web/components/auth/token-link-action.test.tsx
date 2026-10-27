/** @vitest-environment jsdom */

import { StrictMode } from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AuthApiError } from "@/lib/api/auth-http"

import { TokenLinkAction } from "./token-link-action"

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

function renderAt(
  search: string,
  action: (token: string) => Promise<void>,
  alreadyDone: number[] = [],
) {
  window.history.replaceState(null, "", `/verify-email${search}`)
  return render(
    <StrictMode>
      <TokenLinkAction
        action={action}
        workingLabel="Working…"
        done={{ title: "All done", description: "It worked." }}
        failedTitle="Link expired"
        failedDescription="Get a new one."
        alreadyDoneCodes={alreadyDone}
        resend={{ label: "Resend", send: vi.fn(), sentMessage: "Sent." }}
      />
    </StrictMode>,
  )
}

afterEach(() => {
  cleanup()
})

describe("TokenLinkAction", () => {
  it("runs the single-use action once, even under StrictMode's double effects", async () => {
    const action = vi.fn().mockResolvedValue(undefined)

    renderAt("?token=abc", action)

    expect(await screen.findByText("All done")).toBeTruthy()
    expect(action).toHaveBeenCalledTimes(1)
    expect(action).toHaveBeenCalledWith("abc")
  })

  it("offers a resend when the link is rejected", async () => {
    const action = vi.fn().mockRejectedValue(new AuthApiError("Invalid token", 400, 1402))

    renderAt("?token=abc", action)

    expect(await screen.findByText("Link expired")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Resend" })).toBeTruthy()
  })

  it("treats an 'already done' error code as success", async () => {
    const action = vi.fn().mockRejectedValue(new AuthApiError("Already verified", 400, 1403))

    renderAt("?token=abc", action, [1403])

    expect(await screen.findByText("All done")).toBeTruthy()
  })

  it("fails without calling the API when the link has no token", async () => {
    const action = vi.fn()

    renderAt("", action)

    expect(await screen.findByText("Link expired")).toBeTruthy()
    expect(action).not.toHaveBeenCalled()
  })
})
