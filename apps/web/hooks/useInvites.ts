"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { accountApi, invitesApi, isAdmin, type SignupInvite } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"

export const accountQueryKey = (userId?: string | null) => ["account", userId] as const
export const invitesQueryKey = (userId?: string | null) => ["invites", userId] as const

// Fetched fresh rather than read from the stored session, so an owner who
// was just granted admin sees admin screens without signing out first.
export function useIsAdmin() {
  const userId = getUserId()
  const { data, isPending } = useQuery({
    queryKey: accountQueryKey(userId),
    queryFn: accountApi.current,
    enabled: userId != null,
  })
  return { isAdmin: isAdmin(data), loading: userId != null && isPending }
}

export function useInvites(enabled = true) {
  const userId = getUserId()
  const { data, isPending, isError } = useQuery({
    queryKey: invitesQueryKey(userId),
    queryFn: invitesApi.list,
    enabled: enabled && userId != null,
  })

  return {
    invites: (data ?? []) as SignupInvite[],
    loading: isPending,
    error: isError ? "Couldn't load invites." : "",
  }
}

export function useInviteMutations() {
  const queryClient = useQueryClient()
  const userId = getUserId()
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: invitesQueryKey(userId) })

  const create = useMutation({
    mutationFn: (email: string) => invitesApi.create(email),
    onSuccess: () => invalidateList(),
  })

  const revoke = useMutation({
    mutationFn: (id: string) => invitesApi.revoke(id),
    onSuccess: () => invalidateList(),
  })

  return { create, revoke }
}
