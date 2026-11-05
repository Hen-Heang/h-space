/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { RecoveryPageSkeleton } from "./RecoveryPageSkeleton"

afterEach(cleanup)

const skeletons = (root: HTMLElement) => root.querySelectorAll('[data-slot="skeleton"]')

describe("RecoveryPageSkeleton", () => {
  it("announces a busy loading region", () => {
    render(<RecoveryPageSkeleton />)
    const region = screen.getByRole("status", { name: "Loading" })
    expect(region.getAttribute("aria-busy")).toBe("true")
  })

  it("matches the page width it stands in for", () => {
    render(<RecoveryPageSkeleton width="5xl" />)
    expect(screen.getByRole("status").className).toContain("max-w-5xl")
  })

  it("draws the header block plus the requested number of cards", () => {
    render(<RecoveryPageSkeleton cards={3} />)
    // back link + kicker + title + intro = 4 header bars
    expect(skeletons(screen.getByRole("status"))).toHaveLength(4 + 3)
  })

  it("drops the header for full-screen form pages", () => {
    render(<RecoveryPageSkeleton header={false} cards={1} />)
    expect(skeletons(screen.getByRole("status"))).toHaveLength(1)
  })
})
