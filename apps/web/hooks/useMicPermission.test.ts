/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useMicPermission } from "./useMicPermission"

class FakePermissionStatus extends EventTarget {
  constructor(public state: PermissionState) {
    super()
  }
  set(state: PermissionState) {
    this.state = state
    this.dispatchEvent(new Event("change"))
  }
}

function mockPermissions(query: (descriptor: { name: string }) => Promise<unknown>) {
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: { query: vi.fn(query) },
  })
}

describe("useMicPermission", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "permissions", { configurable: true, value: undefined })
  })

  it("reads the current microphone permission", async () => {
    mockPermissions(async () => new FakePermissionStatus("prompt"))
    const { result } = renderHook(() => useMicPermission())
    await waitFor(() => expect(result.current).toBe("prompt"))
    expect(navigator.permissions.query).toHaveBeenCalledWith({ name: "microphone" })
  })

  it("follows changes made in site settings", async () => {
    const status = new FakePermissionStatus("denied")
    mockPermissions(async () => status)
    const { result } = renderHook(() => useMicPermission())
    await waitFor(() => expect(result.current).toBe("denied"))
    act(() => status.set("granted"))
    expect(result.current).toBe("granted")
  })

  it("stays unknown when the browser rejects the permission name", async () => {
    mockPermissions(async () => {
      throw new TypeError("'microphone' is not a valid PermissionName")
    })
    const { result } = renderHook(() => useMicPermission())
    await act(async () => {})
    expect(result.current).toBe("unknown")
  })

  it("stays unknown without a Permissions API", () => {
    const { result } = renderHook(() => useMicPermission())
    expect(result.current).toBe("unknown")
  })

  it("stops listening after unmount", async () => {
    const status = new FakePermissionStatus("prompt")
    mockPermissions(async () => status)
    const { result, unmount } = renderHook(() => useMicPermission())
    await waitFor(() => expect(result.current).toBe("prompt"))
    unmount()
    expect(() => status.set("granted")).not.toThrow()
  })
})
