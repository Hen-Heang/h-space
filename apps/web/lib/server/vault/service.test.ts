import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

// SAFETY: the Neon client is replaced by a fake that records every query and
// returns queued rows, so nothing here can reach a database. All values are
// fictional.
const db = vi.hoisted(() => ({
  queries: [] as Array<{ text: string; values: unknown[] }>,
  results: [] as unknown[][],
}))
vi.mock("@/lib/server/vault/db", () => ({
  vaultSql:
    () =>
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      db.queries.push({ text: strings.join("?").replace(/\s+/g, " ").trim(), values })
      return Promise.resolve(db.results.shift() ?? [])
    },
}))

import { VaultError } from "./http"
import {
  createItem,
  deleteItem,
  getKeyset,
  listItems,
  resetVault,
  saveKeyset,
  updateItem,
} from "./service"

const ME = "00000000-0000-4000-8000-00000000000a"
const ITEM = "0b9f3e3a-6a51-4c5e-9d0a-2f4b8c1d7e60"
const ENVELOPE = `v2.${"C".repeat(16)}.${"D".repeat(40)}==`
const WRAPPED = `v2.${"A".repeat(16)}.${"B".repeat(64)}`
const KEYSET = {
  kdf: "PBKDF2-SHA256" as const,
  kdfIterations: 600_000,
  kdfSalt: `${"E".repeat(22)}==`,
  wrappedKey: WRAPPED,
  recoveryWrappedKey: WRAPPED,
}
const STAMP = new Date("2026-11-21T00:00:00Z")

const keysetRow = (version: number | string) => ({
  kdf: KEYSET.kdf,
  kdf_iterations: KEYSET.kdfIterations,
  kdf_salt: KEYSET.kdfSalt,
  wrapped_key: WRAPPED,
  recovery_wrapped_key: WRAPPED,
  created_at: STAMP,
  updated_at: STAMP,
  version, // Neon returns bigint as a string
})
const itemRow = (version: number | string = "0") => ({
  id: ITEM,
  payload_ciphertext: ENVELOPE,
  created_at: STAMP,
  updated_at: STAMP,
  version,
})

function queue(...results: unknown[][]) {
  db.results.push(...results)
}

async function conflict(promise: Promise<unknown>): Promise<VaultError> {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(VaultError)
  return error as VaultError
}

afterEach(() => {
  db.queries = []
  db.results = []
})

describe("every query", () => {
  it("is parameterised and scoped by the caller's user id", async () => {
    queue(
      [keysetRow("0")],
      [itemRow()],
      [itemRow()],
      [itemRow("1")],
      [{ id: ITEM }],
      [{ items: 0 }],
    )
    await getKeyset(ME)
    await listItems(ME)
    await createItem(ME, { id: ITEM, payloadCiphertext: ENVELOPE })
    await updateItem(ME, ITEM, { payloadCiphertext: ENVELOPE, version: 0 })
    await deleteItem(ME, ITEM)
    await resetVault(ME)

    for (const q of db.queries) {
      expect(q.values).toContain(ME)
      expect(q.text).not.toContain(ME) // values are bound, never interpolated
      expect(q.text).not.toContain(ENVELOPE)
    }
  })

  it("audits writes with ids only, in the same statement", async () => {
    queue([itemRow()], [itemRow("1")], [{ id: ITEM }], [{ items: 2 }], [keysetRow("0")])
    await createItem(ME, { id: ITEM, payloadCiphertext: ENVELOPE })
    await updateItem(ME, ITEM, { payloadCiphertext: ENVELOPE, version: 0 })
    await deleteItem(ME, ITEM)
    await resetVault(ME)
    await saveKeyset(ME, KEYSET)

    const events = [
      "VAULT_ITEM_CREATED",
      "VAULT_ITEM_UPDATED",
      "VAULT_ITEM_DELETED",
      "VAULT_RESET",
      "VAULT_KEYSET_CREATED",
    ]
    db.queries.forEach((q, i) => {
      expect(q.text).toContain("insert into audit_logs")
      expect(q.text).toContain(events[i])
      // The audit details are built from the id column, never the payload.
      expect(q.text).not.toMatch(/details[^)]*payload_ciphertext/)
    })
  })
})

describe("keyset", () => {
  it("maps the row and Neon's string bigint version", async () => {
    queue([keysetRow("4")])
    await expect(getKeyset(ME)).resolves.toEqual({
      ...KEYSET,
      createdAt: STAMP.toISOString(),
      updatedAt: STAMP.toISOString(),
      version: 4,
    })
  })

  it("is 404 before setup", async () => {
    queue([])
    expect(await conflict(getKeyset(ME))).toMatchObject({ status: 404 })
  })

  it("won't create over an existing keyset (another device won)", async () => {
    queue([], [{ has_keyset: true }])
    expect(await conflict(saveKeyset(ME, KEYSET))).toMatchObject({
      status: 409,
      message: expect.stringContaining("another device"),
    })
  })

  it("won't create while items from an earlier keyset remain", async () => {
    queue([], [{ has_keyset: false }])
    expect(await conflict(saveKeyset(ME, KEYSET))).toMatchObject({
      status: 409,
      message: "Reset the vault before creating a new one.",
    })
  })

  it("replaces only from the version read", async () => {
    queue([keysetRow("3")])
    await expect(saveKeyset(ME, { ...KEYSET, version: 2 })).resolves.toMatchObject({ version: 3 })
    expect(db.queries[0].values).toContain(2)
    expect(db.queries[0].text).toContain("version = version + 1")
  })

  it("is 409 for a stale version, or when there's nothing to replace", async () => {
    queue([], [{ has_keyset: true }])
    expect(await conflict(saveKeyset(ME, { ...KEYSET, version: 1 }))).toMatchObject({
      status: 409,
      message: expect.stringContaining("another device"),
    })
    queue([], [{ has_keyset: false }])
    expect(await conflict(saveKeyset(ME, { ...KEYSET, version: 0 }))).toMatchObject({
      message: expect.stringContaining("create it without a version"),
    })
  })
})

describe("items", () => {
  it("creates and returns the stored row", async () => {
    queue([itemRow()])
    await expect(createItem(ME, { id: ITEM, payloadCiphertext: ENVELOPE })).resolves.toEqual({
      id: ITEM,
      payloadCiphertext: ENVELOPE,
      createdAt: STAMP.toISOString(),
      updatedAt: STAMP.toISOString(),
      version: 0,
    })
  })

  it.each([
    [{ has_keyset: false, items: 0 }, "Set up the vault before adding items."],
    [{ has_keyset: true, items: 1000 }, "The vault is full (1000 items)."],
    // Same answer whether the clashing id is ours or another user's.
    [{ has_keyset: true, items: 3 }, "An item with this id already exists."],
  ])("explains a refused create (%o)", async (state, message) => {
    queue([], [state])
    expect(await conflict(createItem(ME, { id: ITEM, payloadCiphertext: ENVELOPE }))).toMatchObject(
      { status: 409, message },
    )
  })

  it("updates only from the version read", async () => {
    queue([itemRow("6")])
    await expect(
      updateItem(ME, ITEM, { payloadCiphertext: ENVELOPE, version: 5 }),
    ).resolves.toMatchObject({ version: 6 })
  })

  it("is 404 for someone else's or a missing item, 409 for a stale version", async () => {
    queue([], [{ owned: false }])
    expect(
      await conflict(updateItem(ME, ITEM, { payloadCiphertext: ENVELOPE, version: 0 })),
    ).toMatchObject({ status: 404 })
    queue([], [{ owned: true }])
    expect(
      await conflict(updateItem(ME, ITEM, { payloadCiphertext: ENVELOPE, version: 0 })),
    ).toMatchObject({ status: 409 })
  })

  it("deletes only the caller's item", async () => {
    queue([])
    expect(await conflict(deleteItem(ME, ITEM))).toMatchObject({ status: 404 })
    expect(db.queries[0].values).toEqual([ITEM, ME])
  })

  it("resets items and keyset together and reports the count", async () => {
    queue([{ items: 7 }])
    await expect(resetVault(ME)).resolves.toBe(7)
    expect(db.queries).toHaveLength(1)
    expect(db.queries[0].text).toContain("delete from vault_items")
    expect(db.queries[0].text).toContain("delete from vault_keysets")
  })
})
