/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const api = vi.hoisted(() => ({
  isLive: vi.fn(() => false),
  list: vi.fn(async () => [] as unknown[]),
  create: vi.fn(async () => ({ id: "new" })),
  update: vi.fn(async () => ({ id: "a" })),
  setFavorite: vi.fn(async () => ({ id: "a" })),
  remove: vi.fn(async () => undefined),
}))
const auth = vi.hoisted(() => ({ userId: "user-a" as string | null }))

vi.mock("@/lib/api", () => ({ vaultApi: api }))
vi.mock("@/lib/auth-store", () => ({ getUserId: () => auth.userId }))

const { useVaultAccounts, useVaultMutations, vaultAccountsQueryKey } = await import("./useVault")

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper, invalidate }
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.userId = "user-a"
})

describe("useVaultAccounts", () => {
  it("does not query while signed out", () => {
    auth.userId = null
    const { wrapper } = setup()
    renderHook(() => useVaultAccounts(), { wrapper })
    expect(api.list).not.toHaveBeenCalled()
  })

  it("loads accounts for the signed-in user", async () => {
    api.list.mockResolvedValueOnce([{ id: "a" }])
    const { wrapper } = setup()
    const { result } = renderHook(() => useVaultAccounts(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.accounts).toEqual([{ id: "a" }])
    expect(result.current.error).toBe("")
  })

  it("reports a load error", async () => {
    api.list.mockRejectedValueOnce(new Error("network down"))
    const { wrapper } = setup()
    const { result } = renderHook(() => useVaultAccounts(), { wrapper })
    await waitFor(() => expect(result.current.error).toBe("Couldn't load your accounts."))
  })

  it("keys the cache by user and data source", () => {
    expect(vaultAccountsQueryKey("user-a", false)).toEqual(["vault-accounts", "user-a", "demo"])
    expect(vaultAccountsQueryKey("user-a", true)).toEqual(["vault-accounts", "user-a", "live"])
  })
})

describe("useVaultMutations", () => {
  it.each(["create", "update", "setFavorite", "remove"] as const)(
    "%s invalidates the account list",
    async (name) => {
      const { wrapper, invalidate } = setup()
      const { result } = renderHook(() => useVaultMutations(), { wrapper })
      const args = {
        create: { serviceName: "GitHub" },
        update: { id: "a", data: { accountLabel: "Work" } },
        setFavorite: { id: "a", isFavorite: true },
        remove: "a",
      }[name]
      await act(async () => {
        await (result.current[name].mutateAsync as (a: unknown) => Promise<unknown>)(args)
      })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vault-accounts", "user-a", "demo"] })
    },
  )

  it("createMany keeps going past a failed row, reports it, and refreshes once", async () => {
    api.create
      .mockResolvedValueOnce({ id: "1" })
      .mockRejectedValueOnce(new Error("row rejected"))
      .mockResolvedValueOnce({ id: "3" })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useVaultMutations(), { wrapper })
    const progress: number[] = []
    let outcome: unknown
    await act(async () => {
      outcome = await result.current.createMany.mutateAsync({
        items: [{ serviceName: "A" }, { serviceName: "B" }, { serviceName: "C" }] as never,
        onProgress: (n) => progress.push(n),
      })
    })
    expect(outcome).toEqual({ created: 2, failed: [{ index: 1, message: "row rejected" }] })
    expect(progress).toEqual([1, 2, 3])
    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it("does not invalidate when a mutation fails", async () => {
    api.remove.mockRejectedValueOnce(new Error("denied"))
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useVaultMutations(), { wrapper })
    await act(async () => {
      await expect(result.current.remove.mutateAsync("a")).rejects.toThrow("denied")
    })
    expect(invalidate).not.toHaveBeenCalled()
  })
})
