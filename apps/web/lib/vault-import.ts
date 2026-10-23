import {
  DEFAULT_VAULT_CATEGORY,
  normalizeWebsiteUrl,
  type VaultAccount,
  type VaultCategoryId,
  type VaultStatus,
} from "@/lib/vault"

// H-Vault CSV import (e.g. a Notion database export). Everything here runs in
// the user's browser: the file is parsed locally, reviewed row by row, and
// passwords are encrypted locally before saving (components/vault/
// VaultImportDialog.tsx). Nothing is uploaded except the encrypted result,
// and a "Notes" column is never imported because notes tend to hold secrets.
// Framework-free and tested (lib/vault-import.test.ts).

export const MAX_IMPORT_FILE_BYTES = 1_000_000
export const MAX_IMPORT_ROWS = 500

/** One reviewed row. `password` is plain text in memory only, until encrypted. */
export type VaultImportRow = {
  /** 1-based line in the file's data rows, for error messages. */
  line: number
  include: boolean
  serviceName: string
  accountLabel: string | null
  loginIdentifier: string | null
  websiteUrl: string | null
  category: VaultCategoryId
  status: VaultStatus
  password: string | null
  warnings: string[]
  duplicate: boolean
}

export type VaultImportResult = {
  rows: VaultImportRow[]
  /** Columns recognized, e.g. { service: "Service", username: "Username" }. */
  columns: Partial<Record<ImportField, string>>
  /** Columns present but deliberately not imported (Notes, Last Updated, …). */
  ignoredColumns: string[]
  /** Rows dropped entirely (no service name). */
  skipped: number
}

type ImportField = "service" | "label" | "username" | "website" | "category" | "status" | "password"

// Header aliases, lowercased and with non-letters stripped ("Login Email" →
// "loginemail"). The first match wins per field.
const HEADER_ALIASES: Record<ImportField, string[]> = {
  service: ["service", "servicename", "name", "platform", "site", "app", "title", "account"],
  label: ["label", "accountlabel", "type", "profile"],
  username: [
    "username",
    "user",
    "userid",
    "id",
    "login",
    "loginid",
    "email",
    "loginemail",
    "emailaddress",
    "account id",
    "accountid",
  ],
  website: ["website", "url", "link", "loginurl", "websiteurl", "site url", "siteurl"],
  category: ["category", "categories", "group", "folder"],
  status: ["status", "state"],
  password: ["password", "pass", "pwd", "passcode"],
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "")
}

/**
 * RFC 4180 CSV parser: quoted fields, `""` escapes, commas and newlines
 * inside quotes, CRLF or LF, and a leading BOM. Returns rows of raw cells.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  const input = text.replace(/^﻿/, "")

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ",") {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else {
      cell += ch
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

const CATEGORY_KEYWORDS: Array<[VaultCategoryId, RegExp]> = [
  ["email", /mail/],
  // `\bdev\b`, not `dev`: "Devices" must not land in Development.
  ["development", /\bdev\b|develop|code|git|program|engineer|cloud|hosting/],
  ["ai-tools", /\bai\b|^ai|gpt|llm|artificial/],
  ["social", /social|sns|community|chat|messag/],
  ["finance", /financ|bank|money|pay|card|invest|crypto|wallet|tax/],
  ["shopping", /shop|store|commerce|market|delivery/],
  ["productivity", /productiv|work|office|tool|note|calendar|task/],
  ["korea-local", /korea|local|kr\b|gov|government|public/],
  ["devices", /device|phone|mobile|hardware|router|wifi|apple|samsung/],
  ["other", /other|misc|etc/],
]

/** Maps a free-text category to a built-in one; unknown → Other. */
export function mapCategory(raw: string): VaultCategoryId {
  const value = raw.trim().toLowerCase()
  if (!value) return DEFAULT_VAULT_CATEGORY
  for (const [id, pattern] of CATEGORY_KEYWORDS) if (pattern.test(value)) return id
  return DEFAULT_VAULT_CATEGORY
}

/** Maps a free-text status; unknown or empty → Active. */
export function mapStatus(raw: string): VaultStatus {
  const value = raw.trim().toLowerCase()
  if (/review|rotat|change|update|expir|weak|todo|check/.test(value)) return "needs_review"
  if (/inactive|archiv|delet|close|unused|old|disabled|cancel/.test(value)) return "inactive"
  return "active"
}

function duplicateKey(serviceName: string, loginIdentifier: string | null): string {
  return `${serviceName.trim().toLowerCase()}\u0000${(loginIdentifier ?? "").trim().toLowerCase()}`
}

export class VaultImportError extends Error {}

/**
 * Turns CSV text into reviewable rows. Rows matching an existing account
 * (same service + login, case-insensitive) or an earlier row in the file are
 * flagged `duplicate` and start unselected.
 */
export function buildImportRows(text: string, existing: VaultAccount[] = []): VaultImportResult {
  const table = parseCsv(text)
  if (table.length < 2) throw new VaultImportError("The file has no data rows.")
  const [header, ...data] = table
  if (data.length > MAX_IMPORT_ROWS) {
    throw new VaultImportError(`Import at most ${MAX_IMPORT_ROWS} rows at a time.`)
  }

  const normalized = header.map(normalizeHeader)
  const columns: Partial<Record<ImportField, string>> = {}
  const indexes: Partial<Record<ImportField, number>> = {}
  for (const field of Object.keys(HEADER_ALIASES) as ImportField[]) {
    const aliases = HEADER_ALIASES[field].map(normalizeHeader)
    const index = normalized.findIndex(
      (h, i) => aliases.includes(h) && !Object.values(indexes).includes(i),
    )
    if (index !== -1) {
      indexes[field] = index
      columns[field] = header[index].replace(/^﻿/, "").trim()
    }
  }
  // Notion exports put the title property first; fall back to it for Service.
  if (indexes.service === undefined && !Object.values(indexes).includes(0)) {
    indexes.service = 0
    columns.service = header[0].replace(/^﻿/, "").trim()
  }
  const used = new Set(Object.values(indexes))
  const ignoredColumns = header
    .map((h, i) => ({ h: h.replace(/^﻿/, "").trim(), i }))
    .filter(({ h, i }) => h && !used.has(i))
    .map(({ h }) => h)

  const seen = new Set(existing.map((a) => duplicateKey(a.serviceName, a.loginIdentifier)))
  const cell = (cells: string[], field: ImportField) =>
    indexes[field] === undefined ? "" : (cells[indexes[field]!] ?? "").trim()

  const rows: VaultImportRow[] = []
  let skipped = 0
  data.forEach((cells, i) => {
    const serviceName = cell(cells, "service").slice(0, 120)
    if (!serviceName) {
      skipped++
      return
    }
    const warnings: string[] = []
    const loginIdentifier = cell(cells, "username").slice(0, 254) || null
    const rawWebsite = cell(cells, "website")
    const websiteUrl = rawWebsite ? normalizeWebsiteUrl(rawWebsite) : null
    if (rawWebsite && !websiteUrl) warnings.push("Website skipped (not a secure https:// link)")
    let password = cell(cells, "password") || null
    if (password && password.length > 1024) {
      password = null
      warnings.push("Password skipped (too long)")
    }
    const key = duplicateKey(serviceName, loginIdentifier)
    const duplicate = seen.has(key)
    if (duplicate) warnings.push("Already in H-Vault or earlier in this file")
    seen.add(key)

    rows.push({
      line: i + 1,
      include: !duplicate,
      serviceName,
      accountLabel: cell(cells, "label").slice(0, 80) || null,
      loginIdentifier,
      websiteUrl,
      category: mapCategory(cell(cells, "category")),
      status: mapStatus(cell(cells, "status")),
      password,
      warnings,
      duplicate,
    })
  })

  if (rows.length === 0) throw new VaultImportError("No rows have a service name.")
  return { rows, columns, ignoredColumns, skipped }
}
