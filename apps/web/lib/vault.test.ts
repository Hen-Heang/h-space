import { describe, expect, it } from "vitest"

import {
  accountToFormValues,
  applyVaultFilters,
  assertNoSecretFields,
  countByCategory,
  defaultVaultFilters,
  emptyVaultAccountForm,
  findSecretFields,
  formValuesToInput,
  getCategoryLabel,
  hasActiveVaultFilters,
  matchesVaultQuery,
  normalizeWebsiteUrl,
  safeWebsiteHref,
  sortVaultAccounts,
  VAULT_CATEGORIES,
  vaultAccountFormSchema,
  vaultStats,
  type VaultAccount,
} from "./vault"
import { DEMO_VAULT_ACCOUNTS } from "./vault-demo"

function make(
  partial: Partial<VaultAccount> & Pick<VaultAccount, "id" | "serviceName">,
): VaultAccount {
  return {
    accountLabel: null,
    loginIdentifier: null,
    websiteUrl: null,
    category: "other",
    tags: [],
    isFavorite: false,
    status: "active",
    loginMethod: "password",
    passwordCiphertext: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...partial,
  }
}

const github = make({
  id: "a",
  serviceName: "GitHub",
  accountLabel: "Personal",
  loginIdentifier: "demo-dev",
  category: "development",
  isFavorite: true,
  tags: ["code"],
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-10-05T00:00:00.000Z",
})
const githubSecondary = make({
  id: "b",
  serviceName: "GitHub",
  accountLabel: "Secondary",
  loginIdentifier: "demo-lab",
  category: "development",
  status: "needs_review",
  createdAt: "2026-10-03T00:00:00.000Z",
  updatedAt: "2026-10-03T00:00:00.000Z",
})
const google = make({
  id: "c",
  serviceName: "google",
  accountLabel: "Learning",
  loginIdentifier: "Demo.Learning@Example.com",
  category: "email",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-10-09T00:00:00.000Z",
})
const all = [github, githubSecondary, google]

describe("search", () => {
  it("matches service name, label, and login identifier case-insensitively", () => {
    expect(matchesVaultQuery(github, "GITHUB")).toBe(true)
    expect(matchesVaultQuery(githubSecondary, "secondary")).toBe(true)
    expect(matchesVaultQuery(google, "demo.learning@example")).toBe(true)
    expect(matchesVaultQuery(github, "  dev  ")).toBe(true)
  })

  it("matches tags and treats an empty query as a match", () => {
    expect(matchesVaultQuery(github, "code")).toBe(true)
    expect(matchesVaultQuery(github, "")).toBe(true)
  })

  it("does not match unrelated text", () => {
    expect(matchesVaultQuery(github, "kakao")).toBe(false)
  })
})

describe("filters", () => {
  it("filters by category", () => {
    const result = applyVaultFilters(all, { ...defaultVaultFilters, category: "development" })
    expect(result.map((a) => a.id).sort()).toEqual(["a", "b"])
  })

  it("filters favorites", () => {
    const result = applyVaultFilters(all, { ...defaultVaultFilters, view: "favorites" })
    expect(result.map((a) => a.id)).toEqual(["a"])
  })

  it("filters by status", () => {
    const result = applyVaultFilters(all, { ...defaultVaultFilters, status: "needs_review" })
    expect(result.map((a) => a.id)).toEqual(["b"])
  })

  it("combines query, category, and favorites", () => {
    expect(
      applyVaultFilters(all, {
        ...defaultVaultFilters,
        query: "github",
        category: "development",
        view: "favorites",
      }).map((a) => a.id),
    ).toEqual(["a"])
    expect(
      applyVaultFilters(all, { ...defaultVaultFilters, query: "github", category: "email" }),
    ).toEqual([])
  })

  it("supports multiple accounts for one service", () => {
    const result = applyVaultFilters(all, { ...defaultVaultFilters, query: "GitHub" })
    expect(result).toHaveLength(2)
  })

  it("reports whether any filter is active (sort doesn't count)", () => {
    expect(hasActiveVaultFilters(defaultVaultFilters)).toBe(false)
    expect(hasActiveVaultFilters({ ...defaultVaultFilters, sort: "name-asc" })).toBe(false)
    expect(hasActiveVaultFilters({ ...defaultVaultFilters, query: " x " })).toBe(true)
    expect(hasActiveVaultFilters({ ...defaultVaultFilters, category: "email" })).toBe(true)
  })
})

describe("sorting", () => {
  it("orders by recently updated", () => {
    expect(sortVaultAccounts(all, "updated").map((a) => a.id)).toEqual(["c", "a", "b"])
  })

  it("orders by recently added", () => {
    expect(sortVaultAccounts(all, "created").map((a) => a.id)).toEqual(["b", "a", "c"])
  })

  it("orders by name A–Z and Z–A, case-insensitively, using the label as a tiebreaker", () => {
    expect(sortVaultAccounts(all, "name-asc").map((a) => a.id)).toEqual(["a", "b", "c"])
    expect(sortVaultAccounts(all, "name-desc").map((a) => a.id)).toEqual(["c", "b", "a"])
  })

  it("does not mutate its input", () => {
    const input = [...all]
    sortVaultAccounts(input, "name-desc")
    expect(input).toEqual(all)
  })
})

describe("overview", () => {
  it("counts totals, favorites, categories, and accounts needing review", () => {
    expect(vaultStats(all)).toEqual({ total: 3, favorites: 1, categories: 2, needsReview: 1 })
    expect(vaultStats([])).toEqual({ total: 0, favorites: 0, categories: 0, needsReview: 0 })
  })

  it("counts accounts per category", () => {
    expect(countByCategory(all)).toEqual({ development: 2, email: 1 })
  })
})

describe("categories", () => {
  it("ships the ten personal categories", () => {
    expect(VAULT_CATEGORIES.map((c) => c.label)).toEqual([
      "Email",
      "Development",
      "AI Tools",
      "Social",
      "Finance",
      "Shopping",
      "Productivity",
      "Korea & Local Services",
      "Devices",
      "Other",
    ])
  })

  it("falls back to the raw id for a future custom category", () => {
    expect(getCategoryLabel("finance")).toBe("Finance")
    expect(getCategoryLabel("gaming")).toBe("gaming")
  })

  it("maps an unknown category to Other when editing", () => {
    expect(
      accountToFormValues(make({ id: "x", serviceName: "X", category: "gaming" })).category,
    ).toBe("other")
  })
})

describe("website URL safety", () => {
  it("accepts https links and normalizes a missing scheme to https", () => {
    expect(normalizeWebsiteUrl("https://github.com/login")).toBe("https://github.com/login")
    expect(normalizeWebsiteUrl("github.com")).toBe("https://github.com/")
    expect(normalizeWebsiteUrl("  https://accounts.google.com  ")).toBe(
      "https://accounts.google.com/",
    )
  })

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "http://github.com",
    "ftp://example.com",
    "https://user:secret@example.com",
    "https://localhost",
    "not a url",
    "//example.com",
  ])("rejects %s", (raw) => {
    expect(normalizeWebsiteUrl(raw)).toBeNull()
  })

  it("only renders https hrefs, even for values stored outside the form", () => {
    expect(safeWebsiteHref("https://github.com/login")).toBe("https://github.com/login")
    expect(safeWebsiteHref("javascript:alert(1)")).toBeNull()
    expect(safeWebsiteHref("github.com")).toBeNull()
    expect(safeWebsiteHref(null)).toBeNull()
  })
})

describe("form validation", () => {
  const valid = { ...emptyVaultAccountForm, serviceName: "GitHub" }

  it("requires a service name", () => {
    expect(vaultAccountFormSchema.safeParse(emptyVaultAccountForm).success).toBe(false)
    expect(vaultAccountFormSchema.safeParse({ ...valid, serviceName: "   " }).success).toBe(false)
    expect(vaultAccountFormSchema.safeParse(valid).success).toBe(true)
  })

  it("rejects unsafe website links with a helpful message", () => {
    const result = vaultAccountFormSchema.safeParse({ ...valid, websiteUrl: "javascript:alert(1)" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/https:\/\//)
  })

  it("rejects unknown categories and statuses", () => {
    expect(vaultAccountFormSchema.safeParse({ ...valid, category: "secret" }).success).toBe(false)
    expect(vaultAccountFormSchema.safeParse({ ...valid, status: "compromised" }).success).toBe(
      false,
    )
  })

  it("enforces length limits", () => {
    expect(
      vaultAccountFormSchema.safeParse({ ...valid, serviceName: "x".repeat(121) }).success,
    ).toBe(false)
    expect(vaultAccountFormSchema.safeParse({ ...valid, tags: Array(21).fill("t") }).success).toBe(
      false,
    )
  })

  it("turns empty optional fields into null, normalizes the URL, and dedupes tags", () => {
    expect(
      formValuesToInput({
        ...valid,
        serviceName: "  GitHub ",
        websiteUrl: "github.com/login",
        tags: ["Code", "code", " work "],
      }),
    ).toEqual({
      serviceName: "GitHub",
      accountLabel: null,
      loginIdentifier: null,
      websiteUrl: "https://github.com/login",
      category: "other",
      tags: ["code", "work"],
      isFavorite: false,
      status: "active",
      loginMethod: "password",
    })
  })

  it("never passes the plain password (or the remove flag) through — the caller encrypts it", () => {
    const input = formValuesToInput({
      ...valid,
      password: "not-a-real-password",
      removePassword: true,
    })
    expect(input).not.toHaveProperty("password")
    expect(input).not.toHaveProperty("removePassword")
    expect(JSON.stringify(input)).not.toContain("not-a-real-password")
  })

  it("never decrypts a saved password back into the edit form", () => {
    const values = accountToFormValues(
      make({ id: "x", serviceName: "X", passwordCiphertext: "v1.AAAA.AAAA.AAAA" }),
    )
    expect(values.password).toBe("")
  })

  it("limits password length", () => {
    expect(vaultAccountFormSchema.safeParse({ ...valid, password: "x".repeat(1025) }).success).toBe(
      false,
    )
  })
})

describe("secret-field guard", () => {
  it.each([
    "password",
    "Password",
    "passwd",
    "pwd",
    "passcode",
    "passphrase",
    "secret",
    "clientSecret",
    "token",
    "access_token",
    "pin",
    "bankPin",
    "recoveryCodes",
    "backup_codes",
    "apiKey",
    "api_key",
    "totpSeed",
    "otp",
    "privateKey",
    "credentials",
  ])("flags %s", (field) => {
    expect(findSecretFields({ [field]: "x" })).toEqual([field])
    expect(() => assertNoSecretFields({ [field]: "x" })).toThrow(/Refusing secret-like/)
  })

  it("allows only the encrypted password field through", () => {
    expect(findSecretFields({ passwordCiphertext: "v1.x", password_ciphertext: "v1.x" })).toEqual(
      [],
    )
    expect(findSecretFields({ password: "x" })).toEqual(["password"])
  })

  it("allows every real H-Vault field, camelCase and snake_case", () => {
    const fields = {
      id: 1,
      serviceName: 1,
      accountLabel: 1,
      loginIdentifier: 1,
      websiteUrl: 1,
      category: 1,
      tags: 1,
      isFavorite: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
      service_name: 1,
      account_label: 1,
      login_identifier: 1,
      website_url: 1,
      is_favorite: 1,
      user_id: 1,
      created_at: 1,
      updated_at: 1,
    }
    expect(findSecretFields(fields)).toEqual([])
  })
})

describe("demo data", () => {
  it("is fictional: every email uses a reserved example domain", () => {
    for (const account of DEMO_VAULT_ACCOUNTS) {
      if (account.loginIdentifier?.includes("@")) {
        expect(account.loginIdentifier).toMatch(/@example\.(com|org)$/)
      }
    }
  })

  it("has no secret-like fields and only safe https links", () => {
    for (const account of DEMO_VAULT_ACCOUNTS) {
      expect(findSecretFields(account as unknown as Record<string, unknown>)).toEqual([])
      if (account.websiteUrl) expect(safeWebsiteHref(account.websiteUrl)).toBe(account.websiteUrl)
    }
  })

  it("demonstrates multiple accounts for one service", () => {
    expect(DEMO_VAULT_ACCOUNTS.filter((a) => a.serviceName === "GitHub")).toHaveLength(2)
    expect(DEMO_VAULT_ACCOUNTS.filter((a) => a.serviceName === "Google")).toHaveLength(2)
  })
})
