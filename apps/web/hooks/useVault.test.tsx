/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const api = vi.hoisted(() => ({
  isLive: vi.fn(() => false),
  listNeedsUnlock: vi.fn(() => false),
  getKeyset: vi.fn(async () => null as unknown),
  saveKeyset: vi.fn(async () => ({ version: 0 })),
  reset: vi.fn(async () => undefined),
  list: vi.fn<(key: unknown) => Promise<unknown[]>>(async () => []),
  create: vi.fn<(id: string, data: unknown, key: unknown) => Promise<unknown>>(async () => ({
    id: "new",
  })),
  update: vi.fn(async () => ({ id: "a" })),
  setFavorite: vi.fn(async () => ({ id: "a" })),
  remove: vi.fn(async () => undefined),
}))
const auth = vi.hoisted(() => ({ userId: "user-a" as string | null }))

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/vault")>("@/lib/api/vault")
  return {
    vaultApi: api,
    newVaultItemId: () => "generated-id",
    VaultMfaRequiredError: actual.VaultMfaRequiredError,
  }
})
vi.mock("@/lib/auth-store", () => ({ getUserId: () => auth.userId }))

const { useVaultAccounts, useVaultKeyset, useVaultMutations, vaultAccountsQueryKey, currentVaultKey } =
  await import("./useVault")
const { lockVault, setVaultKey } = await import("@/lib/vault-session")
const { VaultMfaRequiredError } = await import("@/lib/api/vault")

const KEY = { key: {} as CryptoKey, userId: "user-a" }

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper, invalidate, queryClient }
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.userId = "user-a"
  api.isLive.mockReturnValue(false)
  api.listNeedsUnlock.mockReturnValue(false)
  lockVault()
})

describe("useVaultAccounts", () => {
  it("does not query while signed out", () => {
    auth.userId = null
    const { wrapper } = setup()
    renderHook(() => useVaultAccounts(), { wrapper })
    expect(api.list).not.toHaveBeenCalled()
  })

  it("loads the demo list without unlocking", async () => {
    api.list.mockResolvedValueOnce([{ id: "a" }])
    const { wrapper } = setup()
    const { result } = renderHook(() => useVaultAccounts(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.accounts).toEqual([{ id: "a" }])
    expect(result.current.locked).toBe(false)
  })

  it("waits for the unlock when the list is encrypted, then drops it again on lock", async () => {
    api.isLive.mockReturnValue(true)
    api.listNeedsUnlock.mockReturnValue(true)
    api.list.mockResolvedValue([{ id: "secret-row" }])
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(() => useVaultAccounts(), { wrapper })

    expect(result.current.locked).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(api.list).not.toHaveBeenCalled()

    act(() => setVaultKey(KEY))
    await waitFor(() => expect(result.current.accounts).toEqual([{ id: "secret-row" }]))
    expect(api.list).toHaveBeenCalledWith(KEY)

    act(() => lockVault())
    await waitFor(() => expect(result.current.locked).toBe(true))
    expect(result.current.accounts).toEqual([])
    expect(queryClient.getQueryData(vaultAccountsQueryKey("user-a", true))).toBeUndefined()
  })

  it("reports a load error, and an MFA requirement separately", async () => {
    api.list.mockRejectedValueOnce(new Error("network down"))
    const { wrapper } = setup()
    const { result } = renderHook(() => useVaultAccounts(), { wrapper })
    await waitFor(() => expect(result.current.error).toBe("Couldn't load your accounts."))

    api.getKeyset.mockRejectedValueOnce(new VaultMfaRequiredError())
    const keyset = renderHook(() => useVaultKeyset(), { wrapper: setup().wrapper })
    await waitFor(() => expect(keyset.result.current.mfaRequired).toBe(true))
    expect(keyset.result.current.error).toBe("")
  })

  it("keys the cache by user and data source", () => {
    expect(vaultAccountsQueryKey("user-a", false)).toEqual(["vault-accounts", "user-a", "demo"])
    expect(vaultAccountsQueryKey("user-a", true)).toEqual(["vault-accounts", "user-a", "live"])
  })

  it("never hands out a key unlocked by a different user", () => {
    setVaultKey({ ...KEY, userId: "user-b" })
    expect(currentVaultKey()).toBeNull()
    setVaultKey(KEY)
    expect(currentVaultKey()).toBe(KEY)
  })
})

describe("useVaultMutations", () => {
  it.each(["create", "update", "setFavorite", "remove"] as const)(
    "%s invalidates the account list",
    async (name) => {
      const { wrapper, invalidate } = setup()
      const { result } = renderHook(() => useVaultMutations(), { wrapper })
      const account = { id: "a" }
      const args = {
        create: { data: { serviceName: "GitHub" } },
        update: { account, data: { accountLabel: "Work" } },
        setFavorite: { account, isFavorite: true },
        remove: "a",
      }[name]
      await act(async () => {
        await (result.current[name].mutateAsync as (a: unknown) => Promise<unknown>)(args)
      })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vault-accounts", "user-a", "demo"] })
    },
  )

  it("creates with the given id (or a new one) and the current key", async () => {
    setVaultKey(KEY)
    const { wrapper } = setup()
    const { result } = renderHook(() => useVaultMutations(), { wrapper })
    await act(async () => {
      await result.current.create.mutateAsync({ id: "chosen", data: { serviceName: "A" } as never })
      await result.current.create.mutateAsync({ data: { serviceName: "B" } as never })
    })
    expect(api.create).toHaveBeenNthCalledWith(1, "chosen", { serviceName: "A" }, KEY)
    expect(api.create).toHaveBeenNthCalledWith(2, "generated-id", { serviceName: "B" }, KEY)
  })

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
        items: ["1", "2", "3"].map((id) => ({ id, data: { serviceName: id } })) as never,
        onProgress: (n) => progress.push(n),
      })
    })
    expect(outcome).toEqual({ created: 2, failed: [{ index: 1, message: "row rejected" }] })
    expect(progress).toEqual([1, 2, 3])
    expect(api.create).toHaveBeenNthCalledWith(2, "2", { serviceName: "2" }, null)
    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it("does not invalidate when a delete fails", async () => {
    api.remove.mockRejectedValueOnce(new Error("denied"))
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useVaultMutations(), { wrapper })
    await act(async () => {
      await expect(result.current.remove.mutateAsync("a")).rejects.toThrow("denied")
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("locks the vault after a reset", async () => {
    setVaultKey(KEY)
    const { wrapper } = setup()
    const { result } = renderHook(() => useVaultMutations(), { wrapper })
    await act(async () => {
      await result.current.reset.mutateAsync()
    })
    expect(currentVaultKey()).toBeNull()
  })
})
