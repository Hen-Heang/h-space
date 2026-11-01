/** @vitest-environment jsdom */

// Tests for vaultApi's two backends.
//
// SAFETY: `@/lib/api/hspace-http` is replaced by an in-memory fake of
// hspace-api's /api/hub/vault that records every request, so nothing here can
// reach a real server. Like the real one it scopes rows to the signed-in user
// and only ever sees what the client sends — which is what the "only
// ciphertext leaves the browser" tests inspect. All values are fictional.

import { beforeEach, describe, expect, it, vi } from "vitest"

type Row = { id: string; userId: string; payloadCiphertext: string; version: number }

const state = vi.hoisted(() => ({
  live: true,
  currentUser: "00000000-0000-4000-8000-00000000000a",
  rows: [] as Array<{ id: string; userId: string; payloadCiphertext: string; version: number }>,
  keysets: {} as Record<string, Record<string, unknown>>,
  sent: [] as Array<{ path: string; method: string; body?: unknown }>,
  failNext: null as { status: number; code?: number; message: string } | null,
}))

vi.mock("@/lib/feature-flags", () => ({ isVaultLiveEnabled: () => state.live }))

vi.mock("@/lib/api/hspace-http", async () => {
  const { AuthApiError } = await import("@/lib/api/auth-http")
  const stamp = "2026-11-01T00:00:00Z"
  const toItem = (r: Row) => ({
    id: r.id,
    payloadCiphertext: r.payloadCiphertext,
    createdAt: stamp,
    updatedAt: stamp,
    version: r.version,
  })
  return {
    hspaceRequest: vi.fn(
      async (path: string, options: { method?: string; body?: unknown } = {}) => {
        const method = options.method ?? "GET"
        state.sent.push({ path, method, body: options.body })
        if (state.failNext) {
          const f = state.failNext
          state.failNext = null
          throw new AuthApiError(f.message, f.status, f.code)
        }
        const me = state.currentUser
        const body = (options.body ?? {}) as Record<string, unknown>
        const itemId = path.match(/\/items\/(.+)$/)?.[1]
        if (path === "/api/hub/vault/keyset" && method === "GET") {
          if (!state.keysets[me]) throw new AuthApiError("Vault isn't set up yet.", 404, 40400)
          return state.keysets[me]
        }
        if (path === "/api/hub/vault/keyset" && method === "PUT") {
          const current = state.keysets[me]
          state.keysets[me] = { ...body, version: current ? (current.version as number) + 1 : 0 }
          return state.keysets[me]
        }
        if (path === "/api/hub/vault/reset") {
          state.rows = state.rows.filter((r) => r.userId !== me)
          delete state.keysets[me]
          return {}
        }
        if (path === "/api/hub/vault/items" && method === "GET") {
          return state.rows.filter((r) => r.userId === me).map(toItem)
        }
        if (path === "/api/hub/vault/items" && method === "POST") {
          const row = {
            id: body.id as string,
            userId: me,
            payloadCiphertext: body.payloadCiphertext as string,
            version: 0,
          }
          state.rows.push(row)
          return toItem(row)
        }
        const row = state.rows.find((r) => r.id === itemId && r.userId === me)
        if (!row) throw new AuthApiError("Vault item not found", 404, 40400)
        if (method === "PUT") {
          if (body.version !== row.version)
            throw new AuthApiError("Changed on another device.", 409, 40900)
          row.payloadCiphertext = body.payloadCiphertext as string
          row.version += 1
          return toItem(row)
        }
        if (method === "DELETE") {
          state.rows = state.rows.filter((r) => r !== row)
          return {}
        }
        throw new Error(`unexpected ${method} ${path}`)
      },
    ),
  }
})

const {
  vaultApi,
  VaultLockedError,
  VaultMfaRequiredError,
  VAULT_DEMO_STORAGE_KEY,
  VAULT_DEMO_KEYSET_KEY,
  resetVaultDemoData,
} = await import("./vault")
const { DEMO_VAULT_ACCOUNTS } = await import("@/lib/vault-demo")
const { createVaultKeyset, decryptVaultPassword, encryptVaultPassword } =
  await import("@/lib/vault-crypto")

const input = {
  serviceName: "Example Service",
  accountLabel: "Personal",
  loginIdentifier: "someone@example.com",
  websiteUrl: "https://example.com",
  category: "dev",
  tags: ["sample"],
  isFavorite: false,
  status: "active" as const,
  loginMethod: "password" as const,
}

const ITEM = "10000000-0000-4000-8000-000000000001"
const ITEM_2 = "10000000-0000-4000-8000-000000000002"
const unlock = async (userId = state.currentUser) =>
  (await createVaultKeyset("a long fictional master password", userId, 1_000)).vaultKey

beforeEach(() => {
  state.live = true
  state.currentUser = "00000000-0000-4000-8000-00000000000a"
  state.rows = []
  state.keysets = {}
  state.sent = []
  state.failNext = null
  window.localStorage.clear()
})

describe("hspace-api backend", () => {
  it("sends only the id and ciphertext — nothing readable leaves the browser", async () => {
    const key = await unlock()
    const password = await encryptVaultPassword("not-a-real-password", ITEM, key)
    await vaultApi.create(ITEM, { ...input, passwordCiphertext: password }, key)

    const sent = JSON.stringify(state.sent)
    for (const value of [
      "Example Service",
      "someone@example.com",
      "example.com",
      "Personal",
      "sample",
    ]) {
      expect(sent).not.toContain(value)
    }
    const post = state.sent.find((r) => r.method === "POST")!
    expect(Object.keys(post.body as object).sort()).toEqual(["id", "payloadCiphertext"])
  })

  it("lists by decrypting in the browser, keeping the password itself encrypted", async () => {
    const key = await unlock()
    const password = await encryptVaultPassword("not-a-real-password", ITEM, key)
    await vaultApi.create(ITEM, { ...input, passwordCiphertext: password }, key)

    const [account] = await vaultApi.list(key)
    expect(account).toMatchObject({ ...input, id: ITEM, version: 0 })
    expect(account.passwordCiphertext).toBe(password)
    expect(await decryptVaultPassword(account.passwordCiphertext!, ITEM, key)).toBe(
      "not-a-real-password",
    )
  })

  it("needs the unlocked key to list, create or update", async () => {
    await expect(vaultApi.list(null)).rejects.toBeInstanceOf(VaultLockedError)
    await expect(vaultApi.create(ITEM, input, null)).rejects.toBeInstanceOf(VaultLockedError)
    expect(state.sent).toEqual([])
  })

  it("re-encrypts the whole account on update and sends the version it read", async () => {
    const key = await unlock()
    const created = await vaultApi.create(ITEM, input, key)
    const updated = await vaultApi.update(created, { accountLabel: "Work" }, key)

    expect(updated).toMatchObject({ ...input, accountLabel: "Work", version: 1 })
    const put = state.sent.find((r) => r.method === "PUT")!
    expect(put.path).toBe(`/api/hub/vault/items/${ITEM}`)
    expect(put.body).toMatchObject({ version: 0 })
    expect(JSON.stringify(put.body)).not.toContain("Work")
  })

  it("surfaces a change made on another device (stale version)", async () => {
    const key = await unlock()
    const created = await vaultApi.create(ITEM, input, key)
    await vaultApi.update(created, { accountLabel: "Phone" }, key)
    await expect(vaultApi.setFavorite(created, true, key)).rejects.toThrow(/another device/)
  })

  it("never shows another user's items, and skips ones bound to another user", async () => {
    const key = await unlock()
    await vaultApi.create(ITEM, input, key)
    // The server hands this user a row that was encrypted for someone else.
    const otherKey = await unlock("00000000-0000-4000-8000-00000000000b")
    state.currentUser = "00000000-0000-4000-8000-00000000000b"
    await vaultApi.create(ITEM_2, { ...input, serviceName: "Theirs" }, otherKey)
    state.rows.find((r) => r.id === ITEM_2)!.userId = "00000000-0000-4000-8000-00000000000a"
    state.currentUser = "00000000-0000-4000-8000-00000000000a"
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    const list = await vaultApi.list(key)
    expect(list.map((a) => a.id)).toEqual([ITEM])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(ITEM_2))
    expect(JSON.stringify(warn.mock.calls)).not.toContain("Theirs")
    warn.mockRestore()
  })

  it("rejects secret-like fields and unencrypted passwords before anything is sent", async () => {
    const key = await unlock()
    await expect(
      vaultApi.create(ITEM, { ...input, password: "x" } as unknown as typeof input, key),
    ).rejects.toThrow(/Refusing secret-like/)
    await expect(
      vaultApi.create(ITEM, { ...input, passwordCiphertext: "plain text" }, key),
    ).rejects.toThrow(/unencrypted/)
    expect(state.sent).toEqual([])
  })

  it("treats a missing keyset as not set up, and sends the version only when replacing", async () => {
    expect(await vaultApi.getKeyset()).toBeNull()
    const { keyset } = await createVaultKeyset(
      "a long fictional master password",
      state.currentUser,
      1_000,
    )
    const first = await vaultApi.saveKeyset(keyset, null)
    expect(state.sent.at(-1)!.body).not.toHaveProperty("version")
    await vaultApi.saveKeyset(keyset, first.version)
    expect(state.sent.at(-1)!.body).toMatchObject({ version: 0 })
    expect(await vaultApi.getKeyset()).toMatchObject({ wrappedKey: keyset.wrappedKey, version: 1 })
  })

  it("maps the server's MFA requirement to VaultMfaRequiredError", async () => {
    state.failNext = { status: 403, code: 40301, message: "Turn on MFA" }
    await expect(vaultApi.getKeyset()).rejects.toBeInstanceOf(VaultMfaRequiredError)
  })

  it("resets with an explicit confirmation and deletes by id", async () => {
    const key = await unlock()
    await vaultApi.create(ITEM, input, key)
    await vaultApi.remove(ITEM)
    expect(state.sent.at(-1)).toMatchObject({
      method: "DELETE",
      path: `/api/hub/vault/items/${ITEM}`,
    })
    await vaultApi.reset()
    expect(state.sent.at(-1)).toMatchObject({
      method: "POST",
      path: "/api/hub/vault/reset",
      body: { confirm: "RESET" },
    })
  })
})

describe("demo backend (browser-local)", () => {
  beforeEach(() => {
    state.live = false
  })

  it("starts with the fictional sample set and never calls the server", async () => {
    const list = await vaultApi.list(null)
    expect(list).toHaveLength(DEMO_VAULT_ACCOUNTS.length)
    expect(vaultApi.isLive()).toBe(false)
    expect(vaultApi.listNeedsUnlock()).toBe(false)
    await vaultApi.create(ITEM, input, null)
    expect(state.sent).toEqual([])
  })

  it("supports create with a chosen id, update, favorite, and delete", async () => {
    const created = await vaultApi.create(ITEM, input, null)
    expect(created.id).toBe(ITEM)
    expect((await vaultApi.list(null))[0].id).toBe(ITEM)

    const updated = await vaultApi.update(created, { accountLabel: "Work" }, null)
    expect(updated.accountLabel).toBe("Work")
    expect((await vaultApi.setFavorite(updated, true, null)).isFavorite).toBe(true)

    await vaultApi.remove(ITEM)
    expect((await vaultApi.list(null)).some((a) => a.id === ITEM)).toBe(false)
  })

  it("persists under its own isolated storage key, without secret fields", async () => {
    await expect(
      vaultApi.create(ITEM, { ...input, password: "x" } as unknown as typeof input, null),
    ).rejects.toThrow(/Refusing secret-like/)
    await vaultApi.create(ITEM, { ...input, extra: "dropped" } as unknown as typeof input, null)
    const stored = JSON.parse(window.localStorage.getItem(VAULT_DEMO_STORAGE_KEY)!)
    expect(stored[0]).not.toHaveProperty("extra")
    expect(stored[0]).not.toHaveProperty("password")
  })

  it("drops old v1 password envelopes it can no longer read", async () => {
    window.localStorage.setItem(
      VAULT_DEMO_STORAGE_KEY,
      JSON.stringify([{ ...DEMO_VAULT_ACCOUNTS[0], passwordCiphertext: "v1.a.b.c" }]),
    )
    expect((await vaultApi.list(null))[0].passwordCiphertext).toBeNull()
  })

  it("keeps a keyset locally and reset clears it and every saved password", async () => {
    const { keyset, vaultKey } = await createVaultKeyset(
      "a long fictional master password",
      state.currentUser,
      1_000,
    )
    await vaultApi.saveKeyset(keyset, null)
    expect(await vaultApi.getKeyset()).toMatchObject({ wrappedKey: keyset.wrappedKey })
    await vaultApi.create(
      ITEM,
      { ...input, passwordCiphertext: await encryptVaultPassword("x1", ITEM, vaultKey) },
      null,
    )

    await vaultApi.reset()
    expect(window.localStorage.getItem(VAULT_DEMO_KEYSET_KEY)).toBeNull()
    expect((await vaultApi.list(null)).every((a) => a.passwordCiphertext === null)).toBe(true)
  })

  it("reports a missing account on update", async () => {
    await expect(
      vaultApi.update({ ...DEMO_VAULT_ACCOUNTS[0], id: "nope" }, { accountLabel: "x" }, null),
    ).rejects.toThrow("Account not found.")
  })

  it("restores the sample data", async () => {
    await vaultApi.remove(DEMO_VAULT_ACCOUNTS[0].id)
    resetVaultDemoData()
    expect(await vaultApi.list(null)).toHaveLength(DEMO_VAULT_ACCOUNTS.length)
  })
})
