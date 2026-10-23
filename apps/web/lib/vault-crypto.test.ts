import { describe, expect, it } from "vitest"

import {
  decryptVaultPassword,
  deriveVaultKey,
  encryptVaultPassword,
  envelopeSalt,
  isVaultEnvelope,
  newVaultSalt,
  unlockVault,
  VaultDecryptError,
} from "./vault-crypto"

// Low iteration count keeps the suite fast; the production default is
// exercised once below.
const FAST = 1_000
const SAMPLE = "correct-horse-battery-staple"

describe("vault crypto", () => {
  it("round-trips a password", async () => {
    const key = await deriveVaultKey("master password one", newVaultSalt(), FAST)
    const envelope = await encryptVaultPassword(SAMPLE, key)
    expect(await decryptVaultPassword(envelope, key)).toBe(SAMPLE)
  })

  it("produces a versioned envelope that never contains the plaintext", async () => {
    const key = await deriveVaultKey("master password one", newVaultSalt(), FAST)
    const envelope = await encryptVaultPassword(SAMPLE, key)
    expect(isVaultEnvelope(envelope)).toBe(true)
    expect(envelope.startsWith("v1.")).toBe(true)
    expect(envelope).not.toContain(SAMPLE)
    expect(atob(envelope.split(".")[3])).not.toContain(SAMPLE)
  })

  it("uses a fresh IV every time", async () => {
    const key = await deriveVaultKey("master password one", newVaultSalt(), FAST)
    const a = await encryptVaultPassword(SAMPLE, key)
    const b = await encryptVaultPassword(SAMPLE, key)
    expect(a).not.toBe(b)
    expect(a.split(".")[2]).not.toBe(b.split(".")[2])
  })

  it("rejects the wrong master password", async () => {
    const salt = newVaultSalt()
    const envelope = await encryptVaultPassword(
      SAMPLE,
      await deriveVaultKey("right one!!", salt, FAST),
    )
    const wrong = await deriveVaultKey("wrong one!!", salt, FAST)
    await expect(decryptVaultPassword(envelope, wrong)).rejects.toBeInstanceOf(VaultDecryptError)
  })

  it("detects tampering", async () => {
    const key = await deriveVaultKey("master password one", newVaultSalt(), FAST)
    const parts = (await encryptVaultPassword(SAMPLE, key)).split(".")
    const bytes = Uint8Array.from(atob(parts[3]), (c) => c.charCodeAt(0))
    bytes[0] ^= 1
    parts[3] = btoa(String.fromCharCode(...bytes))
    await expect(decryptVaultPassword(parts.join("."), key)).rejects.toBeInstanceOf(
      VaultDecryptError,
    )
  })

  it.each(["hunter2", "", "v1.", "v1.a.b", "v2.AAAA.AAAA.AAAA", "v1.AA AA.AAAA.AAAA", null, 42])(
    "does not treat %s as an envelope",
    (value) => {
      expect(isVaultEnvelope(value)).toBe(false)
    },
  )

  it("keeps the salt in the envelope so one unlock covers every password", async () => {
    const key = await deriveVaultKey("master password one", newVaultSalt(), FAST)
    const envelope = await encryptVaultPassword(SAMPLE, key)
    expect(Array.from(envelopeSalt(envelope))).toEqual(Array.from(key.salt))
  })
})

describe("unlockVault", () => {
  it("requires a long enough master password the first time", async () => {
    await expect(unlockVault("short", null, FAST)).rejects.toThrow(/at least 12/)
    const key = await unlockVault("a long master password", null, FAST)
    expect(key.salt).toHaveLength(16)
  })

  it("proves the master password against an existing envelope", async () => {
    const first = await unlockVault("a long master password", null, FAST)
    const envelope = await encryptVaultPassword(SAMPLE, first)

    const again = await unlockVault("a long master password", envelope, FAST)
    expect(await decryptVaultPassword(envelope, again)).toBe(SAMPLE)
    await expect(unlockVault("a different password", envelope, FAST)).rejects.toBeInstanceOf(
      VaultDecryptError,
    )
  })

  it("works with the production iteration count", async () => {
    const key = await unlockVault("a long master password", null)
    expect(await decryptVaultPassword(await encryptVaultPassword(SAMPLE, key), key)).toBe(SAMPLE)
  })
})
