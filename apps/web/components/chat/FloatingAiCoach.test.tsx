/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// The panel bundle only loads after the first open; these tests never open it.
vi.mock("next/dynamic", () => ({ default: () => () => null }))

import { FloatingAiCoach } from "./FloatingAiCoach"

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y })
}

async function scrollTo(y: number) {
  setScrollY(y)
  await act(async () => {
    window.dispatchEvent(new Event("scroll"))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  })
}

const launcher = () => screen.queryByRole("button", { name: "Open AI Assistant" })

beforeEach(() => setScrollY(0))
afterEach(() => cleanup())

describe("FloatingAiCoach launcher", () => {
  it("shows on mobile and not on desktop", () => {
    const { rerender } = render(<FloatingAiCoach mobile bottomNavVisible keyboardOpen={false} />)
    expect(launcher()).not.toBeNull()
    rerender(<FloatingAiCoach mobile={false} bottomNavVisible={false} keyboardOpen={false} />)
    expect(launcher()).toBeNull()
  })

  it("steps aside on pages with their own floating action", () => {
    render(<FloatingAiCoach mobile bottomNavVisible keyboardOpen={false} hideLauncher />)
    expect(launcher()).toBeNull()
  })

  it("slides away while scrolling down and returns on scrolling up", async () => {
    render(<FloatingAiCoach mobile bottomNavVisible keyboardOpen={false} />)
    await scrollTo(300)
    await scrollTo(600)
    expect(launcher()?.getAttribute("data-scrolled-away")).toBe("true")
    expect(launcher()?.className).toContain("pointer-events-none")

    await scrollTo(500)
    expect(launcher()?.hasAttribute("data-scrolled-away")).toBe(false)
  })

  it("comes back when it receives keyboard focus", async () => {
    render(<FloatingAiCoach mobile bottomNavVisible keyboardOpen={false} />)
    await scrollTo(300)
    await scrollTo(600)
    const button = launcher()
    expect(button?.getAttribute("data-scrolled-away")).toBe("true")
    fireEvent.focus(button!)
    expect(launcher()?.hasAttribute("data-scrolled-away")).toBe(false)
  })
})
