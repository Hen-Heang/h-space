import { AuthApiError } from "@/lib/api/auth-http"
import { hspaceRequest } from "@/lib/api/hspace-http"
import { isVaultLiveEnabled } from "@/lib/feature-flags"
import { DEMO_VAULT_ACCOUNTS } from "@/lib/vault-demo"
import {
  decryptItemPayload,
  encryptItemPayload,
  isVaultEnvelope,
  type VaultKey,
  type VaultKeysetData,
} from "@/lib/vault-crypto"
import {
  assertNoSecretFields,
  DEFAULT_VAULT_CATEGORY,
  DEFAULT_VAULT_LOGIN_METHOD,
  isVaultLoginMethod,
  type VaultAccount,
  type VaultAccountInput,
  type VaultStatus,
} from "@/lib/vault"

// H-Vault storage. Domain types and rules live in lib/vault.ts; re-exported
// here so `import { VaultAccount } from "@/lib/api"` works like the other
// domains. Design: h-space-api docs/vault-design.md.
//
// Two backends share one interface:
// - `springVault` — hspace-api /api/hub/vault. The server stores ciphertext
//   only: each account is encrypted whole in the browser (encryptItemPayload,
//   bound to its user and id), and the keyset holds the vault key wrapped
//   under the master password and the recovery key. Listing needs the
//   unlocked key. Requires an MFA-enabled account (403 otherwise).
// - `demoVault` — fictional accounts in this browser's localStorage, used
//   until `NEXT_PUBLIC_FEATURE_VAULT_LIVE` is on (lib/feature-flags.ts).
//   Account names stay readable there (they're sample data), but saved
//   passwords use the same v2 keyset and envelopes.
//
// Only the fields in `pickInput` — an explicit allowlist — are ever kept;
// `assertNoSecretFields` rejects secret-named input (a plain `password`, PINs,
// tokens, …) outright, and `passwordCiphertext` is only accepted as a v2
// envelope. Decryption of passwords never happens here.
export type { VaultAccount, VaultAccountInput } from "@/lib/vault"

/** The stored keyset plus its server version (null before the first save). */
export type VaultKeysetRecord = VaultKeysetData & { version: number | null }

/** A call that needs the unlocked vault key was made while the vault is locked. */
export class VaultLockedError extends Error {
  constructor() {
    super("Unlock your vault first.")
    this.name = "VaultLockedError"
  }
}

/** The H-Space account doesn't have authenticator-app MFA turned on (hspace-api 40301). */
export class VaultMfaRequiredError extends Error {
  constructor() {
    super("Turn on two-step verification with an authenticator app to use H-Vault.")
    this.name = "VaultMfaRequiredError"
  }
}

const VAULT_MFA_REQUIRED = 40301

/** Rebuilds input from allowlisted fields only, refusing anything secret-like. */
export function pickInput(data: Partial<VaultAccountInput>): Partial<VaultAccountInput> {
  assertNoSecretFields(data as Record<string, unknown>)
  const ciphertext = data.passwordCiphertext
  if (ciphertext != null && !isVaultEnvelope(ciphertext)) {
    throw new Error("Refusing to save an unencrypted password.")
  }
  return {
    ...(data.serviceName !== undefined ? { serviceName: data.serviceName } : {}),
    ...(data.accountLabel !== undefined ? { accountLabel: data.accountLabel } : {}),
    ...(data.loginIdentifier !== undefined ? { loginIdentifier: data.loginIdentifier } : {}),
    ...(data.websiteUrl !== undefined ? { websiteUrl: data.websiteUrl } : {}),
    ...(data.category !== undefined ? { category: data.category } : {}),
    ...(data.tags !== undefined ? { tags: data.tags ?? [] } : {}),
    ...(data.isFavorite !== undefined ? { isFavorite: data.isFavorite } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.loginMethod !== undefined ? { loginMethod: data.loginMethod } : {}),
    ...(ciphertext !== undefined ? { passwordCiphertext: ciphertext } : {}),
  }
}

function accountToInput(account: VaultAccount): VaultAccountInput {
  return {
    serviceName: account.serviceName,
    accountLabel: account.accountLabel,
    loginIdentifier: account.loginIdentifier,
    websiteUrl: account.websiteUrl,
    category: account.category,
    tags: account.tags,
    isFavorite: account.isFavorite,
    status: account.status,
    loginMethod: account.loginMethod,
    passwordCiphertext: account.passwordCiphertext,
  }
}

export type VaultBackend = {
  /** Whether rows sync to the H-Space account (true) or stay in this browser (false). */
  live: boolean
  /** Whether the list itself is encrypted, so it can only be read once unlocked. */
  listNeedsUnlock: boolean
  getKeyset: () => Promise<VaultKeysetRecord | null>
  saveKeyset: (data: VaultKeysetData, version: number | null) => Promise<VaultKeysetRecord>
  /** Deletes the keyset and everything only it could decrypt. */
  reset: () => Promise<void>
  list: (key: VaultKey | null) => Promise<VaultAccount[]>
  /** `id` is chosen by the caller: password envelopes are bound to it before saving. */
  create: (id: string, data: VaultAccountInput, key: VaultKey | null) => Promise<VaultAccount>
  update: (
    account: VaultAccount,
    data: Partial<VaultAccountInput>,
    key: VaultKey | null,
  ) => Promise<VaultAccount>
  remove: (id: string) => Promise<void>
}

// ─── hspace-api (Spring) ─────────────────────────────────────────────────────

const VAULT_PATH = "/api/hub/vault"

type ItemRow = {
  id: string
  payloadCiphertext: string
  createdAt: string
  updatedAt: string
  version: number
}

/** The plaintext inside an item envelope. `v` versions this shape. */
type ItemPayload = VaultAccountInput & { v: 1 }

async function vaultRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  try {
    return await hspaceRequest<T>(`${VAULT_PATH}${path}`, options)
  } catch (error) {
    if (error instanceof AuthApiError && error.code === VAULT_MFA_REQUIRED) {
      throw new VaultMfaRequiredError()
    }
    throw error
  }
}

function requireKey(key: VaultKey | null): VaultKey {
  if (!key) throw new VaultLockedError()
  return key
}

function toPayload(input: VaultAccountInput): ItemPayload {
  return {
    v: 1,
    serviceName: input.serviceName,
    accountLabel: input.accountLabel ?? null,
    loginIdentifier: input.loginIdentifier ?? null,
    websiteUrl: input.websiteUrl ?? null,
    category: input.category || DEFAULT_VAULT_CATEGORY,
    tags: input.tags ?? [],
    isFavorite: Boolean(input.isFavorite),
    status: input.status,
    loginMethod: input.loginMethod,
    passwordCiphertext: input.passwordCiphertext ?? null,
  }
}

// Defensive: the payload was written by this app, but a decrypted object is
// still treated as untrusted input and normalised field by field.
function fromRow(row: ItemRow, payload: unknown): VaultAccount {
  const p = (payload ?? {}) as Partial<ItemPayload>
  const text = (value: unknown) => (typeof value === "string" ? value : null)
  return {
    id: row.id,
    serviceName: text(p.serviceName) ?? "",
    accountLabel: text(p.accountLabel),
    loginIdentifier: text(p.loginIdentifier),
    websiteUrl: text(p.websiteUrl),
    category: text(p.category) ?? DEFAULT_VAULT_CATEGORY,
    tags: Array.isArray(p.tags) ? p.tags.filter((t): t is string => typeof t === "string") : [],
    isFavorite: p.isFavorite === true,
    status: (["active", "needs_review", "inactive"] as const).includes(p.status as VaultStatus)
      ? (p.status as VaultStatus)
      : "active",
    loginMethod: isVaultLoginMethod(p.loginMethod) ? p.loginMethod : DEFAULT_VAULT_LOGIN_METHOD,
    passwordCiphertext: isVaultEnvelope(p.passwordCiphertext) ? p.passwordCiphertext : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

async function decryptRow(row: ItemRow, key: VaultKey): Promise<VaultAccount> {
  return fromRow(row, await decryptItemPayload(row.payloadCiphertext, row.id, key))
}

export const springVault: VaultBackend = {
  live: true,
  listNeedsUnlock: true,

  getKeyset: async () => {
    try {
      return await vaultRequest<VaultKeysetRecord>("/keyset")
    } catch (error) {
      // 404 = the vault hasn't been set up yet.
      if (error instanceof AuthApiError && error.httpStatus === 404) return null
      throw error
    }
  },

  saveKeyset: (data, version) =>
    vaultRequest<VaultKeysetRecord>("/keyset", {
      method: "PUT",
      body: {
        kdf: data.kdf,
        kdfIterations: data.kdfIterations,
        kdfSalt: data.kdfSalt,
        wrappedKey: data.wrappedKey,
        recoveryWrappedKey: data.recoveryWrappedKey,
        ...(version != null ? { version } : {}),
      },
    }),

  reset: async () => {
    await vaultRequest("/reset", { method: "POST", body: { confirm: "RESET" } })
  },

  list: async (key) => {
    const unlocked = requireKey(key)
    const rows = (await vaultRequest<ItemRow[]>("/items")) ?? []
    const accounts: VaultAccount[] = []
    for (const row of rows) {
      try {
        accounts.push(await decryptRow(row, unlocked))
      } catch {
        // Bound to another key or tampered with. Skip it rather than hide the
        // whole vault; the id is all that's safe to mention.
        console.warn(`H-Vault: item ${row.id} couldn't be decrypted and was skipped`)
      }
    }
    return accounts
  },

  create: async (id, data, key) => {
    const unlocked = requireKey(key)
    const payload = toPayload(pickInput(data) as VaultAccountInput)
    const row = await vaultRequest<ItemRow>("/items", {
      method: "POST",
      body: { id, payloadCiphertext: await encryptItemPayload(payload, id, unlocked) },
    })
    return decryptRow(row, unlocked)
  },

  // Every edit re-encrypts the whole account and sends the version it was
  // read at; another device's newer save makes this fail with 409.
  update: async (account, data, key) => {
    const unlocked = requireKey(key)
    const merged = toPayload({ ...accountToInput(account), ...pickInput(data) })
    const row = await vaultRequest<ItemRow>(`/items/${encodeURIComponent(account.id)}`, {
      method: "PUT",
      body: {
        payloadCiphertext: await encryptItemPayload(merged, account.id, unlocked),
        version: account.version ?? 0,
      },
    })
    return decryptRow(row, unlocked)
  },

  remove: async (id) => {
    await vaultRequest(`/items/${encodeURIComponent(id)}`, { method: "DELETE" })
  },
}

// ─── Demo (browser-local, fictional) ──────────────────────────────────────────

/** New, isolated storage keys — nothing else reads or writes them. */
export const VAULT_DEMO_STORAGE_KEY = "hengo-vault-demo-accounts"
export const VAULT_DEMO_KEYSET_KEY = "hengo-vault-demo-keyset"

function readDemoAccounts(): VaultAccount[] {
  if (typeof window === "undefined") return [...DEMO_VAULT_ACCOUNTS]
  try {
    const raw = window.localStorage.getItem(VAULT_DEMO_STORAGE_KEY)
    if (!raw) return [...DEMO_VAULT_ACCOUNTS]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...DEMO_VAULT_ACCOUNTS]
    return (parsed as VaultAccount[]).map((a) => ({
      ...a,
      // Accounts saved before `loginMethod` existed default to email & password.
      loginMethod: isVaultLoginMethod(a.loginMethod) ? a.loginMethod : DEFAULT_VAULT_LOGIN_METHOD,
      // Demo passwords saved with the old v1 scheme can't be read by v2.
      passwordCiphertext: isVaultEnvelope(a.passwordCiphertext) ? a.passwordCiphertext : null,
    }))
  } catch {
    return [...DEMO_VAULT_ACCOUNTS]
  }
}

function writeDemoAccounts(accounts: VaultAccount[]): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(VAULT_DEMO_STORAGE_KEY, JSON.stringify(accounts))
}

export const demoVault: VaultBackend = {
  live: false,
  listNeedsUnlock: false,

  getKeyset: async () => {
    if (typeof window === "undefined") return null
    try {
      const raw = window.localStorage.getItem(VAULT_DEMO_KEYSET_KEY)
      return raw ? (JSON.parse(raw) as VaultKeysetRecord) : null
    } catch {
      return null
    }
  },

  saveKeyset: async (data, version) => {
    const record: VaultKeysetRecord = { ...data, version: (version ?? -1) + 1 }
    window.localStorage.setItem(VAULT_DEMO_KEYSET_KEY, JSON.stringify(record))
    return record
  },

  // Only saved passwords depend on the keyset here; the sample accounts stay.
  reset: async () => {
    window.localStorage.removeItem(VAULT_DEMO_KEYSET_KEY)
    writeDemoAccounts(readDemoAccounts().map((a) => ({ ...a, passwordCiphertext: null })))
  },

  list: async () =>
    [...readDemoAccounts()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

  create: async (id, data) => {
    const now = new Date().toISOString()
    const account: VaultAccount = {
      passwordCiphertext: null,
      ...(pickInput(data) as VaultAccountInput),
      id,
      createdAt: now,
      updatedAt: now,
    }
    writeDemoAccounts([account, ...readDemoAccounts()])
    return account
  },

  update: async (account, data) => {
    const accounts = readDemoAccounts()
    const index = accounts.findIndex((a) => a.id === account.id)
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

/** Clears demo edits and restores the fictional sample set (keeps the demo keyset). */
export function resetVaultDemoData(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(VAULT_DEMO_STORAGE_KEY)
}

// ─── Public API ───────────────────────────────────────────────────────────────

const backend = (): VaultBackend => (isVaultLiveEnabled() ? springVault : demoVault)

export const vaultApi = {
  /** Whether rows sync through hspace-api (true) or are the browser-local demo set (false). */
  isLive: (): boolean => backend().live,
  listNeedsUnlock: (): boolean => backend().listNeedsUnlock,
  getKeyset: (): Promise<VaultKeysetRecord | null> => backend().getKeyset(),
  saveKeyset: (data: VaultKeysetData, version: number | null): Promise<VaultKeysetRecord> =>
    backend().saveKeyset(data, version),
  reset: (): Promise<void> => backend().reset(),
  list: (key: VaultKey | null): Promise<VaultAccount[]> => backend().list(key),
  create: (id: string, data: VaultAccountInput, key: VaultKey | null): Promise<VaultAccount> =>
    backend().create(id, data, key),
  update: (
    account: VaultAccount,
    data: Partial<VaultAccountInput>,
    key: VaultKey | null,
  ): Promise<VaultAccount> => backend().update(account, data, key),
  setFavorite: (
    account: VaultAccount,
    isFavorite: boolean,
    key: VaultKey | null,
  ): Promise<VaultAccount> => backend().update(account, { isFavorite }, key),
  remove: (id: string): Promise<void> => backend().remove(id),
}

/** A new account id. Chosen before saving because envelopes are bound to it. */
export function newVaultItemId(): string {
  return crypto.randomUUID()
}
