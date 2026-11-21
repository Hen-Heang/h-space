import { getSupabaseAccessToken } from "@/lib/auth-store"

// Transport for H-Vault: same-origin requests to this app's app/api/vault/*
// routes (which read and write the vault tables in Neon), carrying the
// Supabase access token. Bodies are only ever ids, versions, KDF settings and
// v2 envelopes — lib/api/vault.ts encrypts before calling this. Nothing is
// logged here.

export class VaultHttpError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when the request never got a response. */
    readonly httpStatus: number,
    /** The route's error code (lib/server/vault/http.ts), when present. */
    readonly code?: string,
  ) {
    super(message)
    this.name = "VaultHttpError"
  }
}

type ErrorBody = { error?: { code?: unknown; message?: unknown } }

export async function vaultRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const token = await getSupabaseAccessToken()
  if (!token) {
    throw new VaultHttpError(
      "Your session has ended. Sign in again to continue.",
      401,
      "UNAUTHORIZED",
    )
  }

  let res: Response
  try {
    res = await fetch(`/api/vault${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    })
  } catch {
    throw new VaultHttpError("Can't reach H-Space. Check your connection and try again.", 0)
  }

  const payload = (await res.json().catch(() => null)) as unknown
  if (!res.ok) {
    const error = (payload as ErrorBody | null)?.error
    const message =
      typeof error?.message === "string" ? error.message : `Request failed (${res.status})`
    const code = typeof error?.code === "string" ? error.code : undefined
    throw new VaultHttpError(message, res.status, code)
  }
  return payload as T
}
