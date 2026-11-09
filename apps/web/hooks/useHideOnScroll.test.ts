import { describe, expect, it } from "vitest"

import { nextHiddenOnScroll } from "./useHideOnScroll"

describe("nextHiddenOnScroll", () => {
  it("hides while scrolling down past the threshold", () => {
    expect(nextHiddenOnScroll(false, 200, 240)).toBe(true)
  })

  it("shows again when scrolling up past the threshold", () => {
    expect(nextHiddenOnScroll(true, 400, 380)).toBe(false)
  })

  it("keeps its state for small movements", () => {
    expect(nextHiddenOnScroll(true, 400, 404)).toBe(true)
    expect(nextHiddenOnScroll(false, 400, 396)).toBe(false)
  })

  it("is always shown near the top of the page", () => {
    expect(nextHiddenOnScroll(true, 30, 60)).toBe(false)
    expect(nextHiddenOnScroll(true, 100, 0)).toBe(false)
  })

  it("respects custom thresholds", () => {
    expect(nextHiddenOnScroll(false, 200, 215, { threshold: 20 })).toBe(false)
    expect(nextHiddenOnScroll(false, 100, 150, { topOffset: 200 })).toBe(false)
  })
})
