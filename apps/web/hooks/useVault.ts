"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { vaultApi, type VaultAccount, type VaultAccountInput } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"

// `live` is part of the key so switching the data source (demo ↔ Supabase)
// can never serve one source's cached rows as the other's.
export const vaultAccountsQueryKey = (userId?: string | null, live = vaultApi.isLive()) =>
  ["vault-accounts", userId, live ? "live" : "demo"] as const

export function useVaultAccounts() {
  const userId = getUserId()
  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: vaultAccountsQueryKey(userId),
    queryFn: vaultApi.list,
    enabled: userId != null,
  })

  return {
    accounts: (data ?? []) as VaultAccount[],
    loading: isPending,
    error: isError ? "Couldn't load your accounts." : "",
    retry: refetch,
    retrying: isRefetching,
    isLive: vaultApi.isLive(),
  }
}

export function useVaultMutations() {
  const queryClient = useQueryClient()
  const userId = getUserId()
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: vaultAccountsQueryKey(userId) })

  const create = useMutation({
    mutationFn: (data: VaultAccountInput) => vaultApi.create(data),
    onSuccess: () => invalidateList(),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VaultAccountInput> }) =>
      vaultApi.update(id, data),
    onSuccess: () => invalidateList(),
  })

  const setFavorite = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      vaultApi.setFavorite(id, isFavorite),
    onSuccess: () => invalidateList(),
  })

  const remove = useMutation({
    mutationFn: (id: string) => vaultApi.remove(id),
    onSuccess: () => invalidateList(),
  })

  /**
   * Bulk create for CSV import: one row at a time (so a failure names its
   * row and earlier rows are kept), then a single list refresh — on success
   * or partial failure alike.
   */
  const createMany = useMutation({
    mutationFn: async ({
      items,
      onProgress,
    }: {
      items: VaultAccountInput[]
      onProgress?: (done: number) => void
    }) => {
      const failed: Array<{ index: number; message: string }> = []
      for (let i = 0; i < items.length; i++) {
        try {
          await vaultApi.create(items[i])
        } catch (err) {
          failed.push({ index: i, message: err instanceof Error ? err.message : "Failed" })
        }
        onProgress?.(i + 1)
      }
      return { created: items.length - failed.length, failed }
    },
    onSettled: () => invalidateList(),
  })

  return { create, update, setFavorite, remove, createMany }
}
