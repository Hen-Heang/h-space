/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const devices = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api", () => ({ mfaApi: { devices } }))

import { MfaDevicePicker, useMfaDevices } from "./mfa-device-picker"

const PHONE = { factorId: "f1", name: "iPhone", createdAt: "2026-11-21T00:00:00Z" }
const TABLET = { factorId: "f2", name: "iPad", createdAt: "2026-11-22T00:00:00Z" }

afterEach(() => {
  cleanup()
  devices.mockReset()
})

describe("MfaDevicePicker", () => {
  it("renders nothing with a single device", () => {
    const { container } = render(
      <MfaDevicePicker devices={[PHONE]} value="f1" onChange={vi.fn()} />,
    )
    expect(container.innerHTML).toBe("")
  })

  it("lets the user pick which device the code comes from", () => {
    const onChange = vi.fn()
    render(<MfaDevicePicker devices={[PHONE, TABLET]} value="f1" onChange={onChange} />)

    expect(screen.getByRole("group", { name: "Code from" })).toBeTruthy()
    expect((screen.getByRole("radio", { name: "iPhone" }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole("radio", { name: "iPad" }))
    expect(onChange).toHaveBeenCalledWith("f2")
  })
})

describe("useMfaDevices", () => {
  it("loads devices only while active", async () => {
    devices.mockResolvedValue([PHONE, TABLET])
    const { result, rerender } = renderHook(({ active }) => useMfaDevices(active), {
      initialProps: { active: false },
    })
    expect(devices).not.toHaveBeenCalled()
    expect(result.current).toEqual([])

    rerender({ active: true })
    await waitFor(() => expect(result.current).toEqual([PHONE, TABLET]))

    rerender({ active: false })
    expect(result.current).toEqual([])
  })

  it("stays empty when the list can't be loaded", async () => {
    devices.mockRejectedValue(new Error("offline"))
    const { result } = renderHook(() => useMfaDevices(true))
    await waitFor(() => expect(devices).toHaveBeenCalled())
    expect(result.current).toEqual([])
  })
})
