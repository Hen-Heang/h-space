/** @vitest-environment jsdom */

// Tests for vaultApi's two adapters.
//
// SAFETY: `@/lib/supabase` is replaced by an in-memory fake that records
// every call, so nothing here can reach a live project. The fake models the
// one server behaviour that matters for ownership — RLS — by scoping every
// read/update/delete to the signed-in user, which lets the "another user's
// row" tests show that the client never tries to bypass it (no user filter
// is ever dropped or overridden from input).

import { beforeEach, describe, expect, it, vi } from "vitest"

type Row = Record<string, unknown>

const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  currentUser: "user-a" as string | null,
  live: true,
  failNext: null as { message: string; code?: string } | null,
  inserts: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
  tables: [] as string[],
}))

vi.mock("@/lib/feature-flags", () => ({ isVaultLiveEnabled: () => state.live }))

vi.mock("@/lib/auth-store", () => ({
  requireUserId: () => {
    if (!state.currentUser) throw new Error("Not signed in")
    return state.currentUser
  },
  getUserId: () => state.currentUser,
}))

vi.mock("@/lib/supabase", () => {
  function visible(): Row[] {
    // RLS: a user only ever sees their own rows.
    return state.rows.filter((r) => r.user_id === state.currentUser)
  }

  function builder(table: string) {
    state.tables.push(table)
    let op: "select" | "insert" | "update" | "delete" = "select"
    let payload: Row | null = null
    const filters: Array<[string, unknown]> = []

    const run = (): { data: unknown; error: unknown } => {
      if (state.failNext) {
        const error = state.failNext
        state.failNext = null
        return { data: null, error }
      }
      const match = (r: Row) => filters.every(([k, v]) => r[k] === v)
      if (op === "insert") {
        // RLS `with check`: the row must belong to the caller.
        if (payload!.user_id !== state.currentUser) {
          return {
            data: null,
            error: { message: "new row violates row-level security policy", code: "42501" },
          }
        }
        const row = {
          id: `id-${state.rows.length + 1}`,
          created_at: "2026-10-23T00:00:00.000Z",
          updated_at: "2026-10-23T00:00:00.000Z",
          tags: [],
          is_favorite: false,
          status: "active",
          category: "other",
          account_label: null,
          login_identifier: null,
          website_url: null,
          password_ciphertext: null,
          ...payload,
        }
        state.rows.push(row)
        return { data: row, error: null }
      }
      const targets = visible().filter(match)
      if (op === "update") {
        if (targets.length === 0)
          return { data: null, error: { message: "0 rows", code: "PGRST116" } }
        Object.assign(targets[0], payload)
        return { data: targets[0], error: null }
      }
      if (op === "delete") {
        state.rows = state.rows.filter((r) => !targets.includes(r))
        return { data: null, error: null }
      }
      return { data: targets, error: null }
    }

    const b = {
      select: () => b,
      order: () => b,
      eq: (k: string, v: unknown) => {
        filters.push([k, v])
        return b
      },
      insert: (p: Row) => {
        op = "insert"
        payload = p
        state.inserts.push(p)
        return b
      },
      update: (p: Row) => {
        op = "update"
        payload = p
        state.updates.push(p)
        return b
      },
      delete: () => {
        op = "delete"
        return b
      },
      single: () => Promise.resolve(run()),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(run()).then(resolve, reject),
    }
    return b
  }

  return { supabase: { from: (table: string) => builder(table) } }
})

const { vaultApi, toWritableRow, VAULT_DEMO_STORAGE_KEY, resetVaultDemoData } =
  await import("./vault")
const { DEMO_VAULT_ACCOUNTS } = await import("@/lib/vault-demo")
const { decryptVaultPassword, deriveVaultKey, encryptVaultPassword, newVaultSalt } =
  await import("@/lib/vault-crypto")

const input = {
  serviceName: "GitHub",
  accountLabel: "Personal",
  loginIdentifier: "demo-dev",
  websiteUrl: "https://github.com/login",
  category: "development",
  tags: ["code"],
  isFavorite: false,
  status: "active" as const,
  loginMethod: "password" as const,
}

beforeEach(() => {
  state.rows = []
  state.currentUser = "user-a"
  state.live = true
  state.failNext = null
  state.inserts = []
  state.updates = []
  state.tables = []
  window.localStorage.clear()
})

describe("live adapter (Supabase)", () => {
  it("creates metadata owned by the signed-in user and maps it to camelCase", async () => {
    const created = await vaultApi.create(input)
    expect(state.tables).toEqual(["kori_vault_accounts"])
    expect(state.inserts[0]).toEqual({
      service_name: "GitHub",
      account_label: "Personal",
      login_identifier: "demo-dev",
      website_url: "https://github.com/login",
      category: "development",
      tags: ["code"],
      is_favorite: false,
      status: "active",
      login_method: "password",
      user_id: "user-a",
    })
    expect(created).toMatchObject({ serviceName: "GitHub", loginIdentifier: "demo-dev" })
  })

  it("reads only the caller's rows", async () => {
    await vaultApi.create(input)
    state.currentUser = "user-b"
    await vaultApi.create({ ...input, loginIdentifier: "other-dev" })
    const list = await vaultApi.list()
    expect(list.map((a) => a.loginIdentifier)).toEqual(["other-dev"])
  })

  it("updates metadata, stamps updated_at, and never sends user_id", async () => {
    const created = await vaultApi.create(input)
    const updated = await vaultApi.update(created.id, { accountLabel: "Work" })
    expect(updated.accountLabel).toBe("Work")
    expect(state.updates[0]).toHaveProperty("updated_at")
    expect(state.updates[0]).not.toHaveProperty("user_id")
  })

  it("toggles favorite", async () => {
    const created = await vaultApi.create(input)
    expect((await vaultApi.setFavorite(created.id, true)).isFavorite).toBe(true)
  })

  it("deletes the caller's row", async () => {
    const created = await vaultApi.create(input)
    await vaultApi.remove(created.id)
    expect(await vaultApi.list()).toEqual([])
  })

  it("cannot update or delete another user's row", async () => {
    const created = await vaultApi.create(input)
    state.currentUser = "user-b"
    await expect(vaultApi.update(created.id, { accountLabel: "hijacked" })).rejects.toBeTruthy()
    await vaultApi.remove(created.id)
    state.currentUser = "user-a"
    const [row] = await vaultApi.list()
    expect(row.accountLabel).toBe("Personal")
  })

  it("ignores a user_id smuggled into input — ownership always comes from the session", async () => {
    await vaultApi.create({ ...input, user_id: "user-b" } as unknown as typeof input)
    expect(state.inserts[0].user_id).toBe("user-a")
    await vaultApi.update("id-1", { user_id: "user-b" } as never)
    expect(state.updates[0]).not.toHaveProperty("user_id")
    expect(state.rows[0].user_id).toBe("user-a")
  })

  it("refuses to write when signed out", async () => {
    state.currentUser = null
    await expect(vaultApi.create(input)).rejects.toThrow("Not signed in")
    await expect(vaultApi.update("id-1", { accountLabel: "x" })).rejects.toThrow("Not signed in")
    await expect(vaultApi.remove("id-1")).rejects.toThrow("Not signed in")
    expect(state.inserts).toEqual([])
  })

  it("surfaces data errors", async () => {
    state.failNext = { message: "network down" }
    await expect(vaultApi.list()).rejects.toMatchObject({ message: "network down" })
    state.failNext = { message: "insert failed" }
    await expect(vaultApi.create(input)).rejects.toMatchObject({ message: "insert failed" })
  })

  it("rejects secret-like fields before anything is sent", async () => {
    await expect(
      vaultApi.create({ ...input, password: "not-a-real-password" } as unknown as typeof input),
    ).rejects.toThrow(/Refusing secret-like/)
    await expect(vaultApi.update("id-1", { recoveryCodes: "x" } as never)).rejects.toThrow(
      /Refusing secret-like/,
    )
    expect(state.inserts).toEqual([])
    expect(state.updates).toEqual([])
  })

  it("writes only allowlisted metadata columns", () => {
    const row = toWritableRow({ ...input, id: "x", createdAt: "y", extra: 1 } as never)
    expect(Object.keys(row).sort()).toEqual([
      "account_label",
      "category",
      "is_favorite",
      "login_identifier",
      "login_method",
      "service_name",
      "status",
      "tags",
      "website_url",
    ])
  })

  it("refuses an unencrypted value in passwordCiphertext", async () => {
    await expect(
      vaultApi.create({ ...input, passwordCiphertext: "not-a-real-password" }),
    ).rejects.toThrow("Refusing to save an unencrypted password.")
    await expect(
      vaultApi.update("id-1", { passwordCiphertext: "not-a-real-password" }),
    ).rejects.toThrow("Refusing to save an unencrypted password.")
    expect(state.inserts).toEqual([])
    expect(state.updates).toEqual([])
  })

  it("stores and returns only the encrypted envelope, which decrypts with the key", async () => {
    const key = await deriveVaultKey("a long master password", newVaultSalt(), 1_000)
    const envelope = await encryptVaultPassword("not-a-real-password", key)
    const created = await vaultApi.create({ ...input, passwordCiphertext: envelope })
    expect(state.inserts[0].password_ciphertext).toBe(envelope)
    expect(JSON.stringify(state.rows)).not.toContain("not-a-real-password")
    expect(created.passwordCiphertext).toBe(envelope)
    expect(await decryptVaultPassword(created.passwordCiphertext!, key)).toBe("not-a-real-password")
  })

  it("leaves the password untouched when omitted, and removes it with null", async () => {
    const key = await deriveVaultKey("a long master password", newVaultSalt(), 1_000)
    const envelope = await encryptVaultPassword("x", key)
    const created = await vaultApi.create({ ...input, passwordCiphertext: envelope })
    await vaultApi.update(created.id, { accountLabel: "Work" })
    expect(state.updates[0]).not.toHaveProperty("password_ciphertext")
    expect((await vaultApi.list())[0].passwordCiphertext).toBe(envelope)
    await vaultApi.update(created.id, { passwordCiphertext: null })
    expect((await vaultApi.list())[0].passwordCiphertext).toBeNull()
  })
})

describe("demo adapter (browser-local)", () => {
  beforeEach(() => {
    state.live = false
  })

  it("starts with the fictional sample set and never touches Supabase", async () => {
    const list = await vaultApi.list()
    expect(list).toHaveLength(DEMO_VAULT_ACCOUNTS.length)
    expect(vaultApi.isLive()).toBe(false)
    await vaultApi.create(input)
    expect(state.tables).toEqual([])
  })

  it("supports create, update, favorite, and delete", async () => {
    const created = await vaultApi.create(input)
    expect((await vaultApi.list())[0].id).toBe(created.id)

    const updated = await vaultApi.update(created.id, { accountLabel: "Work" })
    expect(updated.accountLabel).toBe("Work")
    expect((await vaultApi.setFavorite(created.id, true)).isFavorite).toBe(true)

    await vaultApi.remove(created.id)
    expect((await vaultApi.list()).some((a) => a.id === created.id)).toBe(false)
  })

  it("persists under its own isolated storage key, without secret fields", async () => {
    await expect(
      vaultApi.create({ ...input, password: "x" } as unknown as typeof input),
    ).rejects.toThrow(/Refusing secret-like/)
    await vaultApi.create({ ...input, extra: "dropped" } as unknown as typeof input)
    const stored = JSON.parse(window.localStorage.getItem(VAULT_DEMO_STORAGE_KEY)!)
    expect(stored[0]).not.toHaveProperty("extra")
    expect(stored[0]).not.toHaveProperty("password")
  })

  it("reports a missing account on update", async () => {
    await expect(vaultApi.update("nope", { accountLabel: "x" })).rejects.toThrow(
      "Account not found.",
    )
  })

  it("restores the sample data on reset", async () => {
    await vaultApi.remove(DEMO_VAULT_ACCOUNTS[0].id)
    resetVaultDemoData()
    expect(await vaultApi.list()).toHaveLength(DEMO_VAULT_ACCOUNTS.length)
  })
})
