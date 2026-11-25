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

type VaultRequestOptions = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown }

/** The routes' answer when a destructive action needs a fresh authenticator code. */
export const VAULT_STEP_UP_REQUIRED = "VAULT_STEP_UP_REQUIRED"

/** Asks the user for a code; resolves true once it's verified on this session. */
export type VaultStepUpPrompt = () => Promise<boolean>

let stepUpPrompt: VaultStepUpPrompt | null = null

/**
 * Registers the code prompt (VaultStepUpDialog, mounted by VaultDashboard).
 * Returns a function that removes it again, for an effect's cleanup.
 */
export function setVaultStepUpPrompt(prompt: VaultStepUpPrompt): () => void {
  stepUpPrompt = prompt
  return () => {
    if (stepUpPrompt === prompt) stepUpPrompt = null
  }
}

/**
 * A request to this app's /api/vault routes. When a reset or keyset
 * replacement is refused for want of a fresh code (403
 * VAULT_STEP_UP_REQUIRED), the registered prompt asks for one and the request
 * is sent once more with the refreshed session token — never more than once.
 */
export async function vaultRequest<T>(path: string, options: VaultRequestOptions = {}): Promise<T> {
  try {
    return await sendVaultRequest<T>(path, options)
  } catch (error) {
    const prompt = stepUpPrompt
    if (!(error instanceof VaultHttpError) || error.code !== VAULT_STEP_UP_REQUIRED || !prompt) {
      throw error
    }
    if (!(await prompt())) throw error
    return sendVaultRequest<T>(path, options)
  }
}

async function sendVaultRequest<T>(path: string, options: VaultRequestOptions): Promise<T> {
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
