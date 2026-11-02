/** @vitest-environment jsdom */

import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useLeaveGuard } from "./useLeaveGuard"

function fireBeforeUnload() {
  const event = new Event("beforeunload", { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

describe("useLeaveGuard", () => {
  it("asks before unload only while active", () => {
    const { rerender, unmount } = renderHook(({ active }) => useLeaveGuard(active), {
      initialProps: { active: false },
    })
    expect(fireBeforeUnload()).toBe(false)

    rerender({ active: true })
    expect(fireBeforeUnload()).toBe(true)

    rerender({ active: false })
    expect(fireBeforeUnload()).toBe(false)

    rerender({ active: true })
    unmount()
    expect(fireBeforeUnload()).toBe(false)
  })
})
