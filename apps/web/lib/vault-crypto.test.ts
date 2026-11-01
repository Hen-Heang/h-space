import { describe, expect, it } from "vitest"

import {
  changeMasterPassword,
  createVaultKeyset,
  decryptItemPayload,
  decryptVaultPassword,
  encryptItemPayload,
  encryptVaultPassword,
  formatRecoveryKey,
  isVaultEnvelope,
  isWrappedKey,
  PAYLOAD_PADDING,
  parseRecoveryKey,
  recoverWithRecoveryKey,
  unlockWithMasterPassword,
  VaultDecryptError,
} from "./vault-crypto"

// Low iteration count keeps the suite fast; the production default is
// exercised once below. All values are fictional.
const FAST = 1_000
const USER = "00000000-0000-4000-8000-000000000001"
const OTHER_USER = "00000000-0000-4000-8000-000000000002"
const ITEM = "10000000-0000-4000-8000-000000000001"
const OTHER_ITEM = "10000000-0000-4000-8000-000000000002"
const MASTER = "a long fictional master password"
const NEW_MASTER = "another fictional master password"
const SAMPLE = "not-a-real-password-123"

// The server's checks (h-space-api VaultFormats), copied so a drift fails here.
const SERVER_ITEM_ENVELOPE = /^v2\.[A-Za-z0-9+/]{16}\.[A-Za-z0-9+/]{24,}={0,2}$/
const SERVER_WRAPPED_KEY = /^v2\.[A-Za-z0-9+/]{16}\.[A-Za-z0-9+/]{64}$/
const SERVER_SALT = /^[A-Za-z0-9+/]{22}==$/

const setup = () => createVaultKeyset(MASTER, USER, FAST)

describe("keyset", () => {
  it("creates a keyset in exactly the shapes the server accepts", async () => {
    const { keyset, recoveryKey } = await setup()
    expect(keyset.kdf).toBe("PBKDF2-SHA256")
    expect(keyset.kdfIterations).toBe(FAST)
    expect(keyset.kdfSalt).toMatch(SERVER_SALT)
    expect(keyset.wrappedKey).toMatch(SERVER_WRAPPED_KEY)
    expect(keyset.recoveryWrappedKey).toMatch(SERVER_WRAPPED_KEY)
    expect(isWrappedKey(keyset.wrappedKey)).toBe(true)
    expect(recoveryKey).toMatch(/^([A-Z2-7]{4}-){12}[A-Z2-7]{4}$/)
    // Nothing about the master password or recovery key is in what's stored.
    expect(JSON.stringify(keyset)).not.toContain(MASTER)
    expect(JSON.stringify(keyset)).not.toContain(recoveryKey.replace(/-/g, ""))
  })

  it("requires a long enough master password", async () => {
    await expect(createVaultKeyset("short", USER, FAST)).rejects.toThrow(/at least 12/)
  })

  it("unlocks with the master password and rejects a wrong one", async () => {
    const { keyset, vaultKey } = await setup()
    const sealed = await encryptVaultPassword(SAMPLE, ITEM, vaultKey)

    const unlocked = await unlockWithMasterPassword(keyset, MASTER, USER)
    expect(await decryptVaultPassword(sealed, ITEM, unlocked)).toBe(SAMPLE)
    await expect(unlockWithMasterPassword(keyset, MASTER + "!", USER)).rejects.toBeInstanceOf(
      VaultDecryptError,
    )
  })

  it("binds the keyset to its user", async () => {
    const { keyset } = await setup()
    await expect(unlockWithMasterPassword(keyset, MASTER, OTHER_USER)).rejects.toBeInstanceOf(
      VaultDecryptError,
    )
  })

  it("holds the vault key as a non-extractable key", async () => {
    const { vaultKey } = await setup()
    expect(vaultKey.key.extractable).toBe(false)
    await expect(crypto.subtle.exportKey("raw", vaultKey.key)).rejects.toThrow()
  })

  it("recovers with the recovery key and sets a new master password, keeping items", async () => {
    const { keyset, recoveryKey, vaultKey } = await setup()
    const sealed = await encryptVaultPassword(SAMPLE, ITEM, vaultKey)

    // Typed loosely: lower case, spaces instead of dashes.
    const loose = recoveryKey.toLowerCase().replace(/-/g, " ")
    const recovered = await recoverWithRecoveryKey(keyset, loose, NEW_MASTER, USER, FAST)

    expect(recovered.keyset.recoveryWrappedKey).toBe(keyset.recoveryWrappedKey)
    expect(recovered.keyset.kdfSalt).not.toBe(keyset.kdfSalt)
    expect(await decryptVaultPassword(sealed, ITEM, recovered.vaultKey)).toBe(SAMPLE)
    const unlocked = await unlockWithMasterPassword(recovered.keyset, NEW_MASTER, USER)
    expect(await decryptVaultPassword(sealed, ITEM, unlocked)).toBe(SAMPLE)
    await expect(unlockWithMasterPassword(recovered.keyset, MASTER, USER)).rejects.toBeInstanceOf(
      VaultDecryptError,
    )
  })

  it("rejects a wrong or malformed recovery key", async () => {
    const { keyset } = await setup()
    const other = (await setup()).recoveryKey
    await expect(recoverWithRecoveryKey(keyset, other, NEW_MASTER, USER, FAST)).rejects.toThrow(
      /doesn't match/,
    )
    await expect(
      recoverWithRecoveryKey(keyset, "ABCD-EFGH", NEW_MASTER, USER, FAST),
    ).rejects.toThrow(/doesn't look like/)
  })

  it("changes the master password without touching items", async () => {
    const { keyset, vaultKey } = await setup()
    const payload = await encryptItemPayload({ serviceName: "Example" }, ITEM, vaultKey)

    const changed = await changeMasterPassword(keyset, MASTER, NEW_MASTER, USER, FAST)
    const unlocked = await unlockWithMasterPassword(changed.keyset, NEW_MASTER, USER)
    expect(await decryptItemPayload(payload, ITEM, unlocked)).toEqual({ serviceName: "Example" })
    await expect(
      changeMasterPassword(keyset, "wrong password!!", NEW_MASTER, USER, FAST),
    ).rejects.toBeInstanceOf(VaultDecryptError)
  })

  it("works with the production iteration count", async () => {
    const { keyset } = await createVaultKeyset(MASTER, USER)
    expect(keyset.kdfIterations).toBe(600_000)
    await expect(unlockWithMasterPassword(keyset, MASTER, USER)).resolves.toBeTruthy()
  }, 20_000)
})

describe("recovery key format", () => {
  it("round-trips 32 bytes through the printed form", () => {
    for (let i = 0; i < 20; i++) {
      const bytes = crypto.getRandomValues(new Uint8Array(32))
      const printed = formatRecoveryKey(bytes)
      expect(printed.replace(/-/g, "")).toHaveLength(52)
      expect(parseRecoveryKey(printed)).toEqual(bytes)
    }
  })
})

describe("items and passwords", () => {
  it("round-trips an item payload in a server-acceptable, padded envelope", async () => {
    const { vaultKey } = await setup()
    const item = { serviceName: "Example", loginIdentifier: "someone@example.com", tags: ["a"] }
    const envelope = await encryptItemPayload(item, ITEM, vaultKey)

    expect(envelope).toMatch(SERVER_ITEM_ENVELOPE)
    expect(envelope).not.toContain("someone@example.com")
    // A 16-byte tag on top of a padded plaintext.
    const bytes = atob(envelope.split(".")[2]).length
    expect((bytes - 16) % PAYLOAD_PADDING).toBe(0)
    expect(await decryptItemPayload(envelope, ITEM, vaultKey)).toEqual(item)
  })

  it("uses a fresh IV every time", async () => {
    const { vaultKey } = await setup()
    const a = await encryptVaultPassword(SAMPLE, ITEM, vaultKey)
    const b = await encryptVaultPassword(SAMPLE, ITEM, vaultKey)
    expect(a).not.toBe(b)
    expect(a.split(".")[1]).not.toBe(b.split(".")[1])
  })

  it("never contains the plaintext and handles a one-character password", async () => {
    const { vaultKey } = await setup()
    const sealed = await encryptVaultPassword(SAMPLE, ITEM, vaultKey)
    expect(isVaultEnvelope(sealed)).toBe(true)
    expect(sealed).not.toContain(SAMPLE)
    const tiny = await encryptVaultPassword("x", ITEM, vaultKey)
    expect(await decryptVaultPassword(tiny, ITEM, vaultKey)).toBe("x")
  })

  it("fails when an envelope is moved to another item or user (server swap)", async () => {
    const { vaultKey } = await setup()
    const password = await encryptVaultPassword(SAMPLE, ITEM, vaultKey)
    const payload = await encryptItemPayload({ serviceName: "Bank" }, ITEM, vaultKey)

    await expect(decryptVaultPassword(password, OTHER_ITEM, vaultKey)).rejects.toBeInstanceOf(
      VaultDecryptError,
    )
    await expect(decryptItemPayload(payload, OTHER_ITEM, vaultKey)).rejects.toBeInstanceOf(
      VaultDecryptError,
    )
    await expect(
      decryptVaultPassword(password, ITEM, { ...vaultKey, userId: OTHER_USER }),
    ).rejects.toBeInstanceOf(VaultDecryptError)
    // A password envelope isn't accepted as an item payload.
    await expect(decryptItemPayload(password, ITEM, vaultKey)).rejects.toBeInstanceOf(
      VaultDecryptError,
    )
  })

  it("detects tampering", async () => {
    const { vaultKey } = await setup()
    const sealed = await encryptVaultPassword(SAMPLE, ITEM, vaultKey)
    const [v, iv, ct] = sealed.split(".")
    const flipped = (ct[0] === "A" ? "B" : "A") + ct.slice(1)
    await expect(
      decryptVaultPassword([v, iv, flipped].join("."), ITEM, vaultKey),
    ).rejects.toBeInstanceOf(VaultDecryptError)
  })

  it("refuses an old v1 envelope", async () => {
    const { vaultKey } = await setup()
    const v1 = "v1.AAAAAAAAAAAAAAAAAAAAAA==.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    expect(isVaultEnvelope(v1)).toBe(false)
    await expect(decryptVaultPassword(v1, ITEM, vaultKey)).rejects.toThrow(/Not an H-Vault/)
  })
})
