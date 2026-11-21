import { describe, expect, it } from "vitest"

import {
  itemCreateSchema,
  itemUpdateSchema,
  keysetSchema,
  MAX_ITEM_CIPHERTEXT_LENGTH,
  resetSchema,
  vaultIdSchema,
} from "./validation"

// Fictional, well-formed shapes only — nothing here is a real envelope.
const WRAPPED = `v2.${"A".repeat(16)}.${"B".repeat(64)}`
const ENVELOPE = `v2.${"C".repeat(16)}.${"D".repeat(40)}==`
const ID = "0b9f3e3a-6a51-4c5e-9d0a-2f4b8c1d7e60"

const keyset = {
  kdf: "PBKDF2-SHA256",
  kdfIterations: 600_000,
  kdfSalt: `${"E".repeat(22)}==`,
  wrappedKey: WRAPPED,
  recoveryWrappedKey: WRAPPED,
}

describe("keysetSchema", () => {
  it("accepts a keyset, with or without a version", () => {
    expect(keysetSchema.parse(keyset)).toEqual(keyset)
    expect(keysetSchema.parse({ ...keyset, version: 3 }).version).toBe(3)
  })

  it.each([
    [{ ...keyset, kdf: "scrypt" }, "kdf must be PBKDF2-SHA256."],
    [{ ...keyset, kdfIterations: 1000 }, "kdfIterations must be at least 600000."],
    [{ ...keyset, kdfSalt: "short" }, "kdfSalt must be 16 bytes of base64."],
    [{ ...keyset, wrappedKey: "plaintext" }, "wrappedKey must be a v2 wrapped key."],
    [{ ...keyset, version: -1 }, "version must be a whole number."],
    [{ ...keyset, masterPassword: "x" }, "Unknown field."],
  ])("rejects %o", (input, message) => {
    const result = keysetSchema.safeParse(input)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(message)
  })
})

describe("item schemas", () => {
  it("accepts an id and a v2 envelope", () => {
    expect(itemCreateSchema.parse({ id: ID, payloadCiphertext: ENVELOPE }).id).toBe(ID)
    expect(itemUpdateSchema.parse({ payloadCiphertext: ENVELOPE, version: 0 }).version).toBe(0)
  })

  it("refuses anything that isn't a v2 envelope", () => {
    for (const payloadCiphertext of ["hunter2", "v1.abc.def", `v2.${"C".repeat(16)}.short`]) {
      expect(itemCreateSchema.safeParse({ id: ID, payloadCiphertext }).success).toBe(false)
    }
  })

  it("refuses oversized ciphertext", () => {
    const big = `v2.${"C".repeat(16)}.${"D".repeat(MAX_ITEM_CIPHERTEXT_LENGTH)}`
    const result = itemCreateSchema.safeParse({ id: ID, payloadCiphertext: big })
    expect(result.error?.issues[0]?.message).toBe("payloadCiphertext is too large.")
  })

  it("refuses extra fields, so nothing readable rides along", () => {
    expect(
      itemCreateSchema.safeParse({ id: ID, payloadCiphertext: ENVELOPE, serviceName: "x" }).success,
    ).toBe(false)
    expect(itemUpdateSchema.safeParse({ payloadCiphertext: ENVELOPE }).success).toBe(false)
  })

  it("only accepts UUID ids", () => {
    expect(vaultIdSchema.safeParse(ID).success).toBe(true)
    expect(vaultIdSchema.safeParse("1 or 1=1").success).toBe(false)
    expect(vaultIdSchema.safeParse("../keyset").success).toBe(false)
  })
})

describe("resetSchema", () => {
  it("needs exactly RESET", () => {
    expect(resetSchema.safeParse({ confirm: "RESET" }).success).toBe(true)
    expect(resetSchema.safeParse({ confirm: "reset" }).success).toBe(false)
    expect(resetSchema.safeParse({}).success).toBe(false)
  })
})
