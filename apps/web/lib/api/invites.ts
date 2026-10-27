import { authRequest } from "@/lib/api/auth-http"
import { getValidAccessToken } from "@/lib/auth-store"

// Sign-up invites and the signed-in account, both from h-space-api (not
// Supabase). Sign-up is invite-only there: an admin invites an email, which
// gets a link to /register?email=…; the invite is used up by that sign-up.

export interface SignupInvite {
  id: string
  email: string
  invitedBy: string | null
  createdAt: string
  usedAt: string | null
  pending: boolean
  /** Only set right after sending; null in the list. */
  emailSent: boolean | null
}

/** h-space-api's view of the signed-in account (GET /api/auth/user). */
export interface AccountInfo {
  id: string
  name: string | null
  username: string | null
  email: string | null
  emailVerified: boolean | null
  imageUrl: string | null
  provider: string | null
  roles: string[]
}

async function bearer(): Promise<string> {
  const token = await getValidAccessToken()
  if (!token) throw new Error("Not signed in")
  return token
}

export const accountApi = {
  current: async (): Promise<AccountInfo> => {
    const account = await authRequest<AccountInfo>("/api/auth/user", { token: await bearer() })
    return { ...account, roles: account.roles ?? [] }
  },
}

export function isAdmin(account: Pick<AccountInfo, "roles"> | null | undefined): boolean {
  return account?.roles.includes("ROLE_ADMIN") ?? false
}

export const invitesApi = {
  list: async (): Promise<SignupInvite[]> =>
    (await authRequest<SignupInvite[]>("/api/admin/invites", { token: await bearer() })) ?? [],

  // Inviting an address that already has a pending invite re-sends it.
  create: async (email: string): Promise<SignupInvite> =>
    authRequest<SignupInvite>("/api/admin/invites", {
      method: "POST",
      body: { email: email.trim() },
      token: await bearer(),
    }),

  revoke: async (id: string): Promise<void> => {
    await authRequest(`/api/admin/invites/${encodeURIComponent(id)}`, {
      method: "DELETE",
      token: await bearer(),
    })
  },
}
