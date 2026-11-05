import { describe, expect, it } from "vitest"

import { needsHomeScreenForPush } from "./push-environment"

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"
const IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15"
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"

describe("needsHomeScreenForPush", () => {
  it("asks an iPhone in a Safari tab to add the app to the Home Screen", () => {
    expect(
      needsHomeScreenForPush({ userAgent: IPHONE, maxTouchPoints: 5, standalone: false }),
    ).toBe(true)
  })

  it("doesn't ask once the iPhone is running the Home Screen app", () => {
    expect(needsHomeScreenForPush({ userAgent: IPHONE, maxTouchPoints: 5, standalone: true })).toBe(
      false,
    )
  })

  it("treats an iPad reporting a Mac user agent as an iPad", () => {
    expect(
      needsHomeScreenForPush({
        userAgent: IPAD_DESKTOP_MODE,
        maxTouchPoints: 5,
        standalone: false,
      }),
    ).toBe(true)
  })

  it("leaves a real Mac alone", () => {
    expect(
      needsHomeScreenForPush({
        userAgent: IPAD_DESKTOP_MODE,
        maxTouchPoints: 0,
        standalone: false,
      }),
    ).toBe(false)
  })

  it("leaves Android alone", () => {
    expect(
      needsHomeScreenForPush({ userAgent: ANDROID_CHROME, maxTouchPoints: 5, standalone: false }),
    ).toBe(false)
  })
})
