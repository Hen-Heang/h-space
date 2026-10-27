import { createClient } from "@supabase/supabase-js"

import { getSupabaseAccessToken } from "@/lib/auth-store"

// Single Supabase client for the whole app (browser-side). KoriAI shares the
// Supabase project with Orbit/DailyGoalMap — KoriAI-owned tables are prefixed
// `kori_`; the goals/tasks domain reuses Orbit's original tables and RPCs.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""

const MISSING_SUPABASE_URL = "https://missing-supabase-config.invalid"
const MISSING_SUPABASE_KEY = "missing-supabase-publishable-key"

export const SUPABASE_CONFIGURATION_MESSAGE =
  "Supabase is not configured. Copy .env.example to .env.local, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart the dev server."

export function resolveSupabaseClientConfig(
  url: string | undefined,
  key: string | undefined,
): { url: string; key: string; configured: boolean } {
  const normalizedUrl = url?.trim() ?? ""
  const normalizedKey = key?.trim() ?? ""
  const configured = normalizedUrl.length > 0 && normalizedKey.length > 0
  return {
    url: configured ? normalizedUrl : MISSING_SUPABASE_URL,
    key: configured ? normalizedKey : MISSING_SUPABASE_KEY,
    configured,
  }
}

const clientConfig = resolveSupabaseClientConfig(SUPABASE_URL, SUPABASE_KEY)

export const IS_SUPABASE_CONFIGURED = clientConfig.configured

export function assertSupabaseConfigured(): void {
  if (!IS_SUPABASE_CONFIGURED) throw new Error(SUPABASE_CONFIGURATION_MESSAGE)
}

// Keep public routes renderable before a developer has created .env.local.
// Data and auth operations explicitly guard this inert fallback.
//
// Sign-in is h-space-api's (lib/auth-store.ts), not Supabase auth: every
// request carries the bridge-issued token, which RLS reads like a Supabase
// session. With `accessToken` set, supabase-js disables `supabase.auth.*` —
// accessing it throws — so session and user lookups go through auth-store.
export const supabase = createClient(clientConfig.url, clientConfig.key, {
  accessToken: getSupabaseAccessToken,
})
