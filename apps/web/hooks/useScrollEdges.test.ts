import { describe, expect, it } from "vitest"

import { edgeFadeStyle, scrollEdges } from "./useScrollEdges"

describe("scrollEdges", () => {
  it("reports nothing hidden when the content fits", () => {
    expect(scrollEdges(0, 400, 400)).toEqual({ left: false, right: false })
  })

  it("reports hidden content on the right at the start", () => {
    expect(scrollEdges(0, 600, 400)).toEqual({ left: false, right: true })
  })

  it("reports both sides in the middle, and only the left at the end", () => {
    expect(scrollEdges(100, 600, 400)).toEqual({ left: true, right: true })
    expect(scrollEdges(200, 600, 400)).toEqual({ left: true, right: false })
  })

  it("tolerates subpixel rounding at either end", () => {
    expect(scrollEdges(0.5, 600, 400)).toEqual({ left: false, right: true })
    expect(scrollEdges(199.5, 600, 400)).toEqual({ left: true, right: false })
  })
})

describe("edgeFadeStyle", () => {
  it("returns no mask when nothing is hidden", () => {
    expect(edgeFadeStyle({ left: false, right: false })).toBeUndefined()
  })

  it("fades only the side that hides content", () => {
    expect(edgeFadeStyle({ left: false, right: true })?.maskImage).toBe(
      "linear-gradient(to right, black, black calc(100% - 28px), transparent)",
    )
    expect(edgeFadeStyle({ left: true, right: false })?.maskImage).toBe(
      "linear-gradient(to right, transparent, black 28px, black)",
    )
  })

  it("sets the WebKit prefix for Safari", () => {
    const style = edgeFadeStyle({ left: true, right: true })
    expect(style?.WebkitMaskImage).toBe(style?.maskImage)
  })
})
