// @vitest-environment jsdom
import React from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"

const auth = vi.hoisted(() => ({
  userId: "owner-a" as string | null,
  listener: undefined as (() => void) | undefined,
}))
vi.mock("@/lib/auth-store", () => ({
  getUserId: () => auth.userId,
  onAuthChange: (listener: () => void) => {
    auth.listener = listener
    return () => {
      auth.listener = undefined
    }
  },
}))
import { FinanceSessionBoundary } from "./finance-session-boundary"

afterEach(() => {
  cleanup()
  auth.userId = "owner-a"
})

it("clears a private draft on account switch and hides finance immediately on sign-out", () => {
  render(
    <FinanceSessionBoundary>
      <input aria-label="Synthetic finance draft" defaultValue="" />
    </FinanceSessionBoundary>,
  )
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Private synthetic draft" } })
  act(() => {
    auth.userId = "owner-b"
    auth.listener?.()
  })
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("")
  act(() => {
    auth.userId = null
    auth.listener?.()
  })
  expect(screen.queryByRole("textbox")).toBeNull()
})
