"use client"

import { useEffect, useSyncExternalStore } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  newVaultItemId,
  vaultApi,
  VaultMfaRequiredError,
  type VaultAccount,
  type VaultAccountInput,
} from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import type { VaultKeysetData } from "@/lib/vault-crypto"
import { getVaultKey, isVaultUnlocked, lockVault, subscribeVaultSession } from "@/lib/vault-session"

// `live` is part of the keys so switching the data source (demo ↔ hspace-api)
// can never serve one source's cached rows as the other's.
export const vaultAccountsQueryKey = (userId?: string | null, live = vaultApi.isLive()) =>
  ["vault-accounts", userId, live ? "live" : "demo"] as const

export const vaultKeysetQueryKey = (userId?: string | null, live = vaultApi.isLive()) =>
  ["vault-keyset", userId, live ? "live" : "demo"] as const

/** The unlocked key, but only if it belongs to the signed-in user. */
export function currentVaultKey() {
  const key = getVaultKey()
  return key && key.userId === getUserId() ? key : null
}

export function useVaultUnlocked(): boolean {
  return useSyncExternalStore(subscribeVaultSession, isVaultUnlocked, () => false)
}

export function useVaultKeyset() {
  const userId = getUserId()
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: vaultKeysetQueryKey(userId),
    queryFn: vaultApi.getKeyset,
    enabled: userId != null,
  })
  return {
    keyset: data ?? null,
    loading: userId != null && isPending,
    mfaRequired: error instanceof VaultMfaRequiredError,
    error: isError && !(error instanceof VaultMfaRequiredError) ? "Couldn't load your vault." : "",
    retry: refetch,
  }
}

export function useVaultAccounts() {
  const userId = getUserId()
  const queryClient = useQueryClient()
  const unlocked = useVaultUnlocked()
  const needsUnlock = vaultApi.listNeedsUnlock()
  const enabled = userId != null && (!needsUnlock || unlocked)

  // An encrypted vault's decrypted list must not outlive the unlock: drop it
  // from the query cache the moment the vault locks (button, timeout, reset).
  useEffect(() => {
    if (needsUnlock && !unlocked) {
      queryClient.removeQueries({ queryKey: ["vault-accounts"] })
    }
  }, [needsUnlock, unlocked, queryClient])

  const { data, isPending, isError, error, refetch, isRefetching } = useQuery({
    queryKey: vaultAccountsQueryKey(userId),
    queryFn: () => vaultApi.list(currentVaultKey()),
    enabled,
  })

  return {
    accounts: (data ?? []) as VaultAccount[],
    loading: enabled && isPending,
    /** True while an encrypted vault is locked: there is nothing to show yet. */
    locked: needsUnlock && !unlocked,
    mfaRequired: error instanceof VaultMfaRequiredError,
    error: isError && !(error instanceof VaultMfaRequiredError) ? "Couldn't load your accounts." : "",
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
  const invalidateKeyset = () =>
    queryClient.invalidateQueries({ queryKey: vaultKeysetQueryKey(userId) })

  const create = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: VaultAccountInput }) =>
      vaultApi.create(id ?? newVaultItemId(), data, currentVaultKey()),
    onSuccess: () => invalidateList(),
  })

  const update = useMutation({
    mutationFn: ({ account, data }: { account: VaultAccount; data: Partial<VaultAccountInput> }) =>
      vaultApi.update(account, data, currentVaultKey()),
    // A 409 (changed on another device) also needs the fresh copy.
    onSettled: () => invalidateList(),
  })

  const setFavorite = useMutation({
    mutationFn: ({ account, isFavorite }: { account: VaultAccount; isFavorite: boolean }) =>
      vaultApi.setFavorite(account, isFavorite, currentVaultKey()),
    onSettled: () => invalidateList(),
  })

  const remove = useMutation({
    mutationFn: (id: string) => vaultApi.remove(id),
    onSuccess: () => invalidateList(),
  })

  /**
   * Bulk create for CSV import: one row at a time (so a failure names its
   * row and earlier rows are kept), then a single list refresh — on success
   * or partial failure alike. Ids come with the rows: their passwords are
   * already encrypted against them.
   */
  const createMany = useMutation({
    mutationFn: async ({
      items,
      onProgress,
    }: {
      items: Array<{ id: string; data: VaultAccountInput }>
      onProgress?: (done: number) => void
    }) => {
      const failed: Array<{ index: number; message: string }> = []
      for (let i = 0; i < items.length; i++) {
        try {
          await vaultApi.create(items[i].id, items[i].data, currentVaultKey())
        } catch (err) {
          failed.push({ index: i, message: err instanceof Error ? err.message : "Failed" })
        }
        onProgress?.(i + 1)
      }
      return { created: items.length - failed.length, failed }
    },
    onSettled: () => invalidateList(),
  })

  const saveKeyset = useMutation({
    mutationFn: ({ data, version }: { data: VaultKeysetData; version: number | null }) =>
      vaultApi.saveKeyset(data, version),
    onSettled: () => invalidateKeyset(),
  })

  const reset = useMutation({
    mutationFn: () => vaultApi.reset(),
    onSuccess: () => lockVault(),
    onSettled: () => {
      invalidateKeyset()
      invalidateList()
    },
  })

  return { create, update, setFavorite, remove, createMany, saveKeyset, reset }
}
