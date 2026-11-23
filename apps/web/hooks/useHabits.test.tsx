/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { HabitCheckIn } from "@/lib/types"

// Synthetic habit data only.
const api = vi.hoisted(() => ({
  getCheckins: vi.fn<(habitId: string) => Promise<HabitCheckIn[]>>(async () => []),
  setCheckin: vi.fn<(habitId: string, date: string) => Promise<unknown>>(async () => ({})),
  removeCheckin: vi.fn<(habitId: string, date: string) => Promise<unknown>>(async () => ({})),
}))
const toastError = vi.hoisted(() => vi.fn())

vi.mock("@/lib/api", () => ({
  habitsApi: api,
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}))
vi.mock("@/lib/auth-store", () => ({ getUserId: () => "user-a" }))
vi.mock("@/hooks/useLogActivity", () => ({ useLogActivity: () => ({ logActivity: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))

const { useHabitCheckins, useHabitsDoneToday } = await import("./useHabits")

function checkin(date: string, habitId = "h1"): HabitCheckIn {
  return {
    id: `${habitId}-${date}`,
    habitId,
    date,
    completed: true,
    createdAt: `${date}T00:00:00Z`,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper }
}

const done = (checkins: HabitCheckIn[], date: string) =>
  checkins.some((c) => c.date === date && c.completed)

beforeEach(() => {
  vi.clearAllMocks()
  api.getCheckins.mockResolvedValue([])
})

describe("useHabitCheckins toggleCheckin", () => {
  it("shows the check-in before the save finishes", async () => {
    const save = deferred<unknown>()
    api.setCheckin.mockReturnValueOnce(save.promise)
    const { wrapper } = setup()
    const { result } = renderHook(() => useHabitCheckins("h1", "2026-07-01"), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let saved: Promise<boolean> | undefined
    act(() => {
      saved = result.current.toggleCheckin("2026-07-14")
    })
    await waitFor(() => expect(done(result.current.checkins, "2026-07-14")).toBe(true))
    expect(result.current.pendingDates.has("2026-07-14")).toBe(true)

    api.getCheckins.mockResolvedValue([checkin("2026-07-14")])
    save.resolve({})
    await act(async () => {
      await expect(saved).resolves.toBe(true)
    })
    expect(api.setCheckin).toHaveBeenCalledWith("h1", "2026-07-14")
    expect(result.current.pendingDates.size).toBe(0)
    expect(toastError).not.toHaveBeenCalled()
  })

  it("un-checks a done day", async () => {
    api.getCheckins.mockResolvedValue([checkin("2026-07-14")])
    const { wrapper } = setup()
    const { result } = renderHook(() => useHabitCheckins("h1", "2026-07-01"), { wrapper })
    await waitFor(() => expect(done(result.current.checkins, "2026-07-14")).toBe(true))

    api.getCheckins.mockResolvedValue([])
    await act(async () => {
      await expect(result.current.toggleCheckin("2026-07-14")).resolves.toBe(true)
    })
    expect(api.removeCheckin).toHaveBeenCalledWith("h1", "2026-07-14")
    expect(api.setCheckin).not.toHaveBeenCalled()
    expect(done(result.current.checkins, "2026-07-14")).toBe(false)
  })

  it("puts the day back and says so when the save fails", async () => {
    const save = deferred<unknown>()
    api.setCheckin.mockReturnValueOnce(save.promise)
    const { wrapper } = setup()
    const { result } = renderHook(() => useHabitCheckins("h1", "2026-07-01"), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let saved: Promise<boolean> | undefined
    act(() => {
      saved = result.current.toggleCheckin("2026-07-14")
    })
    await waitFor(() => expect(done(result.current.checkins, "2026-07-14")).toBe(true))

    save.reject(new Error("network down"))
    await act(async () => {
      await expect(saved).resolves.toBe(false)
    })
    expect(done(result.current.checkins, "2026-07-14")).toBe(false)
    expect(toastError).toHaveBeenCalledWith("Couldn't save that check-in. Try again.")
  })

  it("ignores a second tap on a date that is still saving", async () => {
    const save = deferred<unknown>()
    api.setCheckin.mockReturnValueOnce(save.promise)
    const { wrapper } = setup()
    const { result } = renderHook(() => useHabitCheckins("h1", "2026-07-01"), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let first: Promise<boolean> | undefined
    act(() => {
      first = result.current.toggleCheckin("2026-07-14")
    })
    await act(async () => {
      await expect(result.current.toggleCheckin("2026-07-14")).resolves.toBe(false)
    })
    expect(api.removeCheckin).not.toHaveBeenCalled()

    save.resolve({})
    await act(async () => {
      await first
    })
    expect(api.setCheckin).toHaveBeenCalledTimes(1)
  })
})

describe("useHabitsDoneToday", () => {
  it("counts the habits checked in today", async () => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    api.getCheckins.mockImplementation(async (habitId: string) =>
      habitId === "h1" ? [checkin(today, "h1")] : [checkin("2000-01-01", habitId)],
    )
    const habits = ["h1", "h2", "h3"].map((id) => ({
      id,
      label: id,
      category: "custom" as const,
      active: true,
      startedAt: "2026-07-01T00:00:00Z",
      createdAt: "2026-07-01T00:00:00Z",
    }))
    const { wrapper } = setup()
    const { result } = renderHook(() => useHabitsDoneToday(habits), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current).toEqual({ done: 1, total: 3, loading: false })
  })
})
