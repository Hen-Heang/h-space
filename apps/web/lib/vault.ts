import { z } from "zod"

// H-Vault — a private directory of your accounts: which email/username you use
// for which service, plus an optional password. Passwords are only ever
// handled as end-to-end-encrypted envelopes (lib/vault-crypto.ts): the plain
// password exists only in the form field and in memory while revealed/copied,
// and only the ciphertext reaches the API layer (lib/api/vault.ts) and the
// table (kori_vault_accounts). Every other secret field — PINs, recovery
// codes, API keys, TOTP seeds — is still refused. Framework-free and tested
// (lib/vault.test.ts).

// ─── Categories ───────────────────────────────────────────────────────────────

/**
 * Built-in categories. The column is free text (≤ 40 chars) rather than a
 * Postgres check, so custom categories can be added later without a
 * migration; `getCategoryLabel` falls back to the raw id for unknown ones.
 */
export const VAULT_CATEGORIES = [
  { id: "email", label: "Email" },
  { id: "development", label: "Development" },
  { id: "ai-tools", label: "AI Tools" },
  { id: "social", label: "Social" },
  { id: "finance", label: "Finance" },
  { id: "shopping", label: "Shopping" },
  { id: "productivity", label: "Productivity" },
  { id: "korea-local", label: "Korea & Local Services" },
  { id: "devices", label: "Devices" },
  { id: "other", label: "Other" },
] as const

export type VaultCategoryId = (typeof VAULT_CATEGORIES)[number]["id"]

export const DEFAULT_VAULT_CATEGORY: VaultCategoryId = "other"

const CATEGORY_IDS = VAULT_CATEGORIES.map((c) => c.id) as [VaultCategoryId, ...VaultCategoryId[]]

export function getCategoryLabel(category: string): string {
  return VAULT_CATEGORIES.find((c) => c.id === category)?.label ?? category
}

// ─── Statuses ─────────────────────────────────────────────────────────────────

export const VAULT_STATUSES = [
  { id: "active", label: "Active" },
  { id: "needs_review", label: "Needs review" },
  { id: "inactive", label: "Inactive" },
] as const

export type VaultStatus = (typeof VAULT_STATUSES)[number]["id"]

const STATUS_IDS = VAULT_STATUSES.map((s) => s.id) as [VaultStatus, ...VaultStatus[]]

export function getStatusLabel(status: VaultStatus): string {
  return VAULT_STATUSES.find((s) => s.id === status)?.label ?? status
}

// ─── Login methods ────────────────────────────────────────────────────────────

/**
 * How the account is signed into. Many services have no password of their own
 * ("Continue with Google"), so the useful fact is which provider — and, via
 * `loginIdentifier`, which of your accounts there — signs you in.
 */
export const VAULT_LOGIN_METHODS = [
  { id: "password", label: "Email & password" },
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
  { id: "github", label: "GitHub" },
  { id: "microsoft", label: "Microsoft" },
  { id: "kakao", label: "Kakao" },
  { id: "naver", label: "Naver" },
  { id: "sso", label: "Other sign-in" },
] as const

export type VaultLoginMethod = (typeof VAULT_LOGIN_METHODS)[number]["id"]

export const DEFAULT_VAULT_LOGIN_METHOD: VaultLoginMethod = "password"

const LOGIN_METHOD_IDS = VAULT_LOGIN_METHODS.map((m) => m.id) as [
  VaultLoginMethod,
  ...VaultLoginMethod[],
]

export function isVaultLoginMethod(value: unknown): value is VaultLoginMethod {
  return typeof value === "string" && (LOGIN_METHOD_IDS as string[]).includes(value)
}

export function getLoginMethodLabel(method: VaultLoginMethod): string {
  return VAULT_LOGIN_METHODS.find((m) => m.id === method)?.label ?? method
}

/** "Sign in with Google" for providers; null for a plain email & password login. */
export function loginMethodBadge(method: VaultLoginMethod): string | null {
  if (method === "password") return null
  if (method === "sso") return "Other sign-in"
  return `Sign in with ${getLoginMethodLabel(method)}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type VaultAccount = {
  id: string
  serviceName: string
  accountLabel: string | null
  loginIdentifier: string | null
  websiteUrl: string | null
  category: string
  tags: string[]
  isFavorite: boolean
  status: VaultStatus
  loginMethod: VaultLoginMethod
  /** AES-GCM envelope (`v1.…`) or null. Never a plain password. */
  passwordCiphertext: string | null
  createdAt: string
  updatedAt: string
}

/** Everything the user can write. Ownership (`user_id`) is never part of it. */
export type VaultAccountInput = {
  serviceName: string
  accountLabel: string | null
  loginIdentifier: string | null
  websiteUrl: string | null
  category: string
  tags: string[]
  isFavorite: boolean
  status: VaultStatus
  loginMethod: VaultLoginMethod
  /** Omit to leave unchanged; null removes the saved password. Envelope only. */
  passwordCiphertext?: string | null
}

// ─── Secret-field guard ───────────────────────────────────────────────────────

/**
 * Field names that suggest a secret. `assertNoSecretFields` rejects any
 * payload carrying one, as defense in depth on top of the API layer's column
 * allowlist — a plain `password` field (or a PIN, token, recovery code, …)
 * fails loudly instead of being silently dropped or, worse, stored.
 */
const SECRET_FIELD_PATTERN =
  /pass(word|wd|code|phrase)?$|^pwd$|secret|token|pin$|^pin|recovery|backup.?code|api.?key|totp|otp|seed|private.?key|credential/i

/** The one password field allowed through: it only ever holds an encrypted envelope. */
const ENCRYPTED_PASSWORD_FIELDS = new Set(["passwordCiphertext", "password_ciphertext"])

export function findSecretFields(payload: Record<string, unknown>): string[] {
  return Object.keys(payload).filter(
    (key) => !ENCRYPTED_PASSWORD_FIELDS.has(key) && SECRET_FIELD_PATTERN.test(key),
  )
}

export function assertNoSecretFields(payload: Record<string, unknown>): void {
  const found = findSecretFields(payload)
  if (found.length > 0) {
    throw new Error(
      `Refusing secret-like field(s): ${found.join(", ")}. H-Vault only stores passwords encrypted, as passwordCiphertext.`,
    )
  }
}

// ─── Website URLs ─────────────────────────────────────────────────────────────

/**
 * Only plain `https://` links with a real hostname are allowed — no
 * `javascript:`, `data:`, `http:`, `file:`, embedded credentials
 * (`https://user:pass@host`), or bare words. A missing scheme is assumed to
 * be https (`github.com` → `https://github.com/`).
 *
 * Returns the normalized URL, or `null` when the input isn't safe.
 */
export function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Anything with an explicit scheme other than https is rejected outright,
  // rather than being "fixed" by prefixing https:// in front of it.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  // Protocol-relative / path-like input (`//host`, `/path`, `\\host`) is
  // ambiguous — ask for a real link instead of guessing.
  if (!hasScheme && /^[/\\]/.test(trimmed)) return null
  const candidate = hasScheme ? trimmed : `https://${trimmed}`
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }
  if (url.protocol !== "https:") return null
  if (url.username || url.password) return null
  // Require a dotted hostname (or localhost-free public host) — rejects
  // `https://github` typos and IP-less garbage.
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return null
  return url.toString()
}

/**
 * The href to render for a stored website URL, or `null` if it shouldn't be
 * linked. Re-checked at render time (not only on write) because rows can
 * come from anywhere the table is writable — the explicit `https://` prefix
 * is required here, so a stored `javascript:` value can never become a link.
 */
export function safeWebsiteHref(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || !/^https:\/\//i.test(raw.trim())) return null
  return normalizeWebsiteUrl(raw)
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** Form-side schema (string inputs) — parsed into a `VaultAccountInput`. */
export const vaultAccountFormSchema = z.object({
  serviceName: z
    .string()
    .trim()
    .min(1, "Service name is required.")
    .max(120, "Keep the service name under 120 characters."),
  accountLabel: z.string().trim().max(80, "Keep the label under 80 characters."),
  loginIdentifier: z.string().trim().max(254, "Keep the email or username under 254 characters."),
  websiteUrl: z
    .string()
    .trim()
    .max(2000, "That link is too long.")
    .refine((value) => value === "" || normalizeWebsiteUrl(value) !== null, {
      message: "Use a secure https:// link, e.g. https://github.com/login.",
    }),
  category: z.enum(CATEGORY_IDS),
  tags: z
    .array(z.string().trim().min(1).max(32, "Keep each tag under 32 characters."))
    .max(20, "Use at most 20 tags."),
  isFavorite: z.boolean(),
  status: z.enum(STATUS_IDS),
  loginMethod: z.enum(LOGIN_METHOD_IDS),
  /**
   * Plain password typed into the form. Empty = keep the saved one. It is
   * encrypted by the dashboard before saving and never reaches
   * `formValuesToInput`'s output.
   */
  password: z.string().max(1024, "That password is too long."),
  /** Edit only: remove the saved password. */
  removePassword: z.boolean(),
})

export type VaultAccountFormValues = z.infer<typeof vaultAccountFormSchema>

export const emptyVaultAccountForm: VaultAccountFormValues = {
  serviceName: "",
  accountLabel: "",
  loginIdentifier: "",
  websiteUrl: "",
  category: DEFAULT_VAULT_CATEGORY,
  tags: [],
  isFavorite: false,
  status: "active",
  loginMethod: DEFAULT_VAULT_LOGIN_METHOD,
  password: "",
  removePassword: false,
}

export function accountToFormValues(account: VaultAccount): VaultAccountFormValues {
  return {
    serviceName: account.serviceName,
    accountLabel: account.accountLabel ?? "",
    loginIdentifier: account.loginIdentifier ?? "",
    websiteUrl: account.websiteUrl ?? "",
    category: CATEGORY_IDS.includes(account.category as VaultCategoryId)
      ? (account.category as VaultCategoryId)
      : DEFAULT_VAULT_CATEGORY,
    tags: account.tags,
    isFavorite: account.isFavorite,
    status: account.status,
    loginMethod: account.loginMethod,
    // The saved password is never decrypted into the form; typing a new one replaces it.
    password: "",
    removePassword: false,
  }
}

/**
 * Validates form values and turns empty strings into nulls. Throws on invalid
 * input. The plain `password` is deliberately NOT part of the result — the
 * caller encrypts it and adds `passwordCiphertext` itself.
 */
export function formValuesToInput(values: VaultAccountFormValues): VaultAccountInput {
  const parsed = vaultAccountFormSchema.parse(values)
  return {
    serviceName: parsed.serviceName,
    accountLabel: parsed.accountLabel || null,
    loginIdentifier: parsed.loginIdentifier || null,
    websiteUrl: parsed.websiteUrl ? normalizeWebsiteUrl(parsed.websiteUrl) : null,
    category: parsed.category,
    tags: dedupeTags(parsed.tags),
    isFavorite: parsed.isFavorite,
    status: parsed.status,
    loginMethod: parsed.loginMethod,
  }
}

function dedupeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)))
}

// ─── Search, filter, sort ─────────────────────────────────────────────────────

export type VaultView = "all" | "favorites"

export type VaultSort = "updated" | "created" | "name-asc" | "name-desc"

export const VAULT_SORTS: Array<{ id: VaultSort; label: string }> = [
  { id: "updated", label: "Recently updated" },
  { id: "created", label: "Recently added" },
  { id: "name-asc", label: "Name A–Z" },
  { id: "name-desc", label: "Name Z–A" },
]

export type VaultFilters = {
  query: string
  view: VaultView
  /** `"all"` or a category id. */
  category: string
  /** `"all"` or a status id. */
  status: VaultStatus | "all"
  sort: VaultSort
}

export const defaultVaultFilters: VaultFilters = {
  query: "",
  view: "all",
  category: "all",
  status: "all",
  sort: "updated",
}

/**
 * Case-insensitive match on service name, account label, login identifier,
 * tags, and the sign-in provider (so "google" finds "Sign in with Google").
 */
export function matchesVaultQuery(account: VaultAccount, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const provider =
    account.loginMethod !== "password" ? getLoginMethodLabel(account.loginMethod) : null
  return [
    account.serviceName,
    account.accountLabel,
    account.loginIdentifier,
    provider,
    ...account.tags,
  ].some((field) => field?.toLowerCase().includes(needle))
}

const nameCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true })

function displayName(account: VaultAccount): string {
  return account.accountLabel
    ? `${account.serviceName} ${account.accountLabel}`
    : account.serviceName
}

export function sortVaultAccounts(accounts: VaultAccount[], sort: VaultSort): VaultAccount[] {
  const sorted = [...accounts]
  switch (sort) {
    case "updated":
      return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    case "created":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case "name-asc":
      return sorted.sort((a, b) => nameCollator.compare(displayName(a), displayName(b)))
    case "name-desc":
      return sorted.sort((a, b) => nameCollator.compare(displayName(b), displayName(a)))
  }
}

export function applyVaultFilters(accounts: VaultAccount[], filters: VaultFilters): VaultAccount[] {
  const filtered = accounts.filter(
    (account) =>
      (filters.view !== "favorites" || account.isFavorite) &&
      (filters.category === "all" || account.category === filters.category) &&
      (filters.status === "all" || account.status === filters.status) &&
      matchesVaultQuery(account, filters.query),
  )
  return sortVaultAccounts(filtered, filters.sort)
}

export function hasActiveVaultFilters(filters: VaultFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.view !== "all" ||
    filters.category !== "all" ||
    filters.status !== "all"
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export type VaultStats = {
  total: number
  favorites: number
  categories: number
  needsReview: number
}

export function vaultStats(accounts: VaultAccount[]): VaultStats {
  return {
    total: accounts.length,
    favorites: accounts.filter((a) => a.isFavorite).length,
    categories: new Set(accounts.map((a) => a.category)).size,
    needsReview: accounts.filter((a) => a.status === "needs_review").length,
  }
}

/** How many accounts each category holds — drives the category filter's counts. */
export function countByCategory(accounts: VaultAccount[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const account of accounts) counts[account.category] = (counts[account.category] ?? 0) + 1
  return counts
}

// ─── Passwords ────────────────────────────────────────────────────────────────

export const VAULT_PASSWORD_NOTICE =
  "Passwords are encrypted in your browser with your master password before they're saved. H-Vault never stores your master password and can't recover it if you forget it."

/** The first saved envelope — what an unlock proves the master password against. */
export function firstPasswordEnvelope(accounts: VaultAccount[]): string | null {
  return accounts.find((a) => a.passwordCiphertext)?.passwordCiphertext ?? null
}
