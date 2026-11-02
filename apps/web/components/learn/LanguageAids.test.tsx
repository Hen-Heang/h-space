/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const preference = vi.hoisted(() => ({ value: "on-request" as "always" | "on-request" | "never" }))
vi.mock("@/hooks/useRomanizationPreference", () => ({
  useRomanizationPreference: () => preference.value,
}))

import { LanguageAidsBar, useLanguageAids } from "./LanguageAids"

function Reader() {
  const { aids, romanizationAllowed, showRomanization, showEnglish, toggle } = useLanguageAids(
    "test",
    { romanization: true, english: false },
  )
  return (
    <div>
      <LanguageAidsBar aids={aids} romanizationAllowed={romanizationAllowed} onToggle={toggle} />
      {showRomanization && <p>annyeonghaseyo</p>}
      {showEnglish && <p>Hello</p>}
    </div>
  )
}

beforeEach(() => {
  window.localStorage.clear()
  preference.value = "on-request"
})
afterEach(cleanup)

describe("LanguageAids", () => {
  it("starts from the surface's defaults", () => {
    render(<Reader />)
    expect(screen.getByText("annyeonghaseyo")).toBeTruthy()
    expect(screen.queryByText("Hello")).toBeNull()
    expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe(
      "false",
    )
  })

  it("toggles and remembers the choice for the next visit", () => {
    const { unmount } = render(<Reader />)
    fireEvent.click(screen.getByRole("button", { name: "English" }))
    expect(screen.getByText("Hello")).toBeTruthy()
    unmount()

    render(<Reader />)
    expect(screen.getByText("Hello")).toBeTruthy()
  })

  it("hides romanization entirely when the account preference is never", () => {
    preference.value = "never"
    render(<Reader />)
    expect(screen.queryByRole("button", { name: "Romanization" })).toBeNull()
    expect(screen.queryByText("annyeonghaseyo")).toBeNull()
  })
})
