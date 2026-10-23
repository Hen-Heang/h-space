import { supabase } from "@/lib/supabase"
import { requireUserId } from "@/lib/auth-store"
import { isVaultLiveEnabled } from "@/lib/feature-flags"
import { DEMO_VAULT_ACCOUNTS } from "@/lib/vault-demo"
import { isVaultEnvelope } from "@/lib/vault-crypto"
import {
  assertNoSecretFields,
  DEFAULT_VAULT_LOGIN_METHOD,
  isVaultLoginMethod,
  type VaultAccount,
  type VaultAccountInput,
  type VaultLoginMethod,
  type VaultStatus,
} from "@/lib/vault"

// H-Vault account metadata over kori_vault_accounts. Domain types and rules
// live in lib/vault.ts; re-exported here so `import { VaultAccount } from
// "@/lib/api"` works like the other domains.
//
// Two adapters share one interface:
// - `supabaseVaultAdapter` — the live table, owner-scoped by RLS.
// - `demoVaultAdapter` — fictional accounts in this browser's localStorage,
//   used until the migration is approved and applied
//   (`NEXT_PUBLIC_FEATURE_VAULT_LIVE`, lib/feature-flags.ts).
//
// Writes only ever send the columns in `toWritableRow` — an explicit
// allowlist — so nothing else can reach the table even if a caller passes
// extra properties. `assertNoSecretFields` rejects secret-named input
// (a plain `password`, PINs, tokens, …) outright, and `password_ciphertext`
// is only accepted as an encrypted envelope (lib/vault-crypto.ts): a plain
// password can't be written by mistake. Decryption never happens here.
export type { VaultAccount, VaultAccountInput } from "@/lib/vault"

const TABLE = "kori_vault_accounts"

const COLUMNS =
  "id, service_name, account_label, login_identifier, website_url, category, tags, is_favorite, status, login_method, password_ciphertext, created_at, updated_at"

type VaultAccountRow = {
  id: string
  service_name: string
  account_label: string | null
  login_identifier: string | null
  website_url: string | null
  category: string
  tags: string[] | null
  is_favorite: boolean
  status: VaultStatus
  login_method: VaultLoginMethod
  password_ciphertext: string | null
  created_at: string
  updated_at: string
}

type WritableRow = Partial<
  Pick<
    VaultAccountRow,
    | "service_name"
    | "account_label"
    | "login_identifier"
    | "website_url"
    | "category"
    | "tags"
    | "is_favorite"
    | "status"
    | "login_method"
    | "password_ciphertext"
  >
>

export function toVaultAccount(row: VaultAccountRow): VaultAccount {
  return {
    id: row.id,
    serviceName: row.service_name,
    accountLabel: row.account_label,
    loginIdentifier: row.login_identifier,
    websiteUrl: row.website_url,
    category: row.category,
    tags: row.tags ?? [],
    isFavorite: row.is_favorite,
    status: row.status,
    loginMethod: isVaultLoginMethod(row.login_method)
      ? row.login_method
      : DEFAULT_VAULT_LOGIN_METHOD,
    passwordCiphertext: row.password_ciphertext ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Maps app input to the only columns a client may write. Never includes `user_id`. */
export function toWritableRow(data: Partial<VaultAccountInput>): WritableRow {
  assertNoSecretFields(data as Record<string, unknown>)
  const ciphertext = data.passwordCiphertext
  if (ciphertext != null && !isVaultEnvelope(ciphertext)) {
    throw new Error("Refusing to save an unencrypted password.")
  }
  return {
    ...(ciphertext !== undefined ? { password_ciphertext: ciphertext } : {}),
    ...(data.serviceName !== undefined ? { service_name: data.serviceName } : {}),
    ...(data.accountLabel !== undefined ? { account_label: data.accountLabel } : {}),
    ...(data.loginIdentifier !== undefined ? { login_identifier: data.loginIdentifier } : {}),
    ...(data.websiteUrl !== undefined ? { website_url: data.websiteUrl } : {}),
    ...(data.category !== undefined ? { category: data.category } : {}),
    ...(data.tags !== undefined ? { tags: data.tags } : {}),
    ...(data.isFavorite !== undefined ? { is_favorite: data.isFavorite } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.loginMethod !== undefined ? { login_method: data.loginMethod } : {}),
  }
}

export type VaultAdapter = {
  list: () => Promise<VaultAccount[]>
  create: (data: VaultAccountInput) => Promise<VaultAccount>
  update: (id: string, data: Partial<VaultAccountInput>) => Promise<VaultAccount>
  remove: (id: string) => Promise<void>
}

// ─── Live (Supabase) ──────────────────────────────────────────────────────────

export const supabaseVaultAdapter: VaultAdapter = {
  list: async () => {
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLUMNS)
      .order("updated_at", { ascending: false })
    if (error) throw error
    return (data as unknown as VaultAccountRow[]).map(toVaultAccount)
  },

  create: async (data) => {
    // The row's owner always comes from the session, never from input. RLS's
    // `with check` enforces the same thing server-side.
    const userId = requireUserId()
    const { data: row, error } = await supabase
      .from(TABLE)
      .insert({ ...toWritableRow(data), user_id: userId })
      .select(COLUMNS)
      .single()
    if (error) throw error
    return toVaultAccount(row as unknown as VaultAccountRow)
  },

  update: async (id, data) => {
    requireUserId()
    const { data: row, error } = await supabase
      .from(TABLE)
      .update({ ...toWritableRow(data), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(COLUMNS)
      .single()
    if (error) throw error
    return toVaultAccount(row as unknown as VaultAccountRow)
  },

  remove: async (id) => {
    requireUserId()
    const { error } = await supabase.from(TABLE).delete().eq("id", id)
    if (error) throw error
  },
}

// ─── Demo (browser-local, fictional) ──────────────────────────────────────────

/** New, isolated storage key — nothing else reads or writes it. */
export const VAULT_DEMO_STORAGE_KEY = "hengo-vault-demo-accounts"

function readDemoAccounts(): VaultAccount[] {
  if (typeof window === "undefined") return [...DEMO_VAULT_ACCOUNTS]
  try {
    const raw = window.localStorage.getItem(VAULT_DEMO_STORAGE_KEY)
    if (!raw) return [...DEMO_VAULT_ACCOUNTS]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...DEMO_VAULT_ACCOUNTS]
    // Accounts saved before `loginMethod` existed default to email & password.
    return (parsed as VaultAccount[]).map((a) => ({
      ...a,
      loginMethod: isVaultLoginMethod(a.loginMethod) ? a.loginMethod : DEFAULT_VAULT_LOGIN_METHOD,
    }))
  } catch {
    return [...DEMO_VAULT_ACCOUNTS]
  }
}

function writeDemoAccounts(accounts: VaultAccount[]): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(VAULT_DEMO_STORAGE_KEY, JSON.stringify(accounts))
}

function newDemoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Rebuilds the account from allowlisted fields only — same guarantee as the live adapter. */
function pickInput(data: Partial<VaultAccountInput>): Partial<VaultAccountInput> {
  const row = toWritableRow(data)
  return {
    ...(row.service_name !== undefined ? { serviceName: row.service_name } : {}),
    ...(row.account_label !== undefined ? { accountLabel: row.account_label } : {}),
    ...(row.login_identifier !== undefined ? { loginIdentifier: row.login_identifier } : {}),
    ...(row.website_url !== undefined ? { websiteUrl: row.website_url } : {}),
    ...(row.category !== undefined ? { category: row.category } : {}),
    ...(row.tags !== undefined ? { tags: row.tags ?? [] } : {}),
    ...(row.is_favorite !== undefined ? { isFavorite: row.is_favorite } : {}),
    ...(row.status !== undefined ? { status: row.status } : {}),
    ...(row.login_method !== undefined ? { loginMethod: row.login_method } : {}),
    ...(row.password_ciphertext !== undefined
      ? { passwordCiphertext: row.password_ciphertext }
      : {}),
  }
}

export const demoVaultAdapter: VaultAdapter = {
  list: async () => [...readDemoAccounts()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

  create: async (data) => {
    const now = new Date().toISOString()
    const account: VaultAccount = {
      passwordCiphertext: null,
      ...(pickInput(data) as VaultAccountInput),
      id: newDemoId(),
      createdAt: now,
      updatedAt: now,
    }
    writeDemoAccounts([account, ...readDemoAccounts()])
    return account
  },

  update: async (id, data) => {
    const accounts = readDemoAccounts()
    const index = accounts.findIndex((a) => a.id === id)
    if (index === -1) throw new Error("Account not found.")
    const updated: VaultAccount = {
      ...accounts[index],
      ...pickInput(data),
      updatedAt: new Date().toISOString(),
    }
    accounts[index] = updated
    writeDemoAccounts(accounts)
    return updated
  },

  remove: async (id) => {
    writeDemoAccounts(readDemoAccounts().filter((a) => a.id !== id))
  },
}

/** Clears demo edits and restores the fictional sample set. */
export function resetVaultDemoData(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(VAULT_DEMO_STORAGE_KEY)
}

// ─── Public API ───────────────────────────────────────────────────────────────

function adapter(): VaultAdapter {
  return isVaultLiveEnabled() ? supabaseVaultAdapter : demoVaultAdapter
}

export const vaultApi = {
  /** Whether rows come from Supabase (true) or the browser-local demo set (false). */
  isLive: (): boolean => isVaultLiveEnabled(),
  list: (): Promise<VaultAccount[]> => adapter().list(),
  create: (data: VaultAccountInput): Promise<VaultAccount> => adapter().create(data),
  update: (id: string, data: Partial<VaultAccountInput>): Promise<VaultAccount> =>
    adapter().update(id, data),
  setFavorite: (id: string, isFavorite: boolean): Promise<VaultAccount> =>
    adapter().update(id, { isFavorite }),
  remove: (id: string): Promise<void> => adapter().remove(id),
}
