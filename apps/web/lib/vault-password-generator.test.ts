import { describe, expect, it } from "vitest"

import {
  GENERATED_PASSWORD_DEFAULT_LENGTH,
  GENERATED_PASSWORD_MAX_LENGTH,
  GENERATED_PASSWORD_MIN_LENGTH,
  generateVaultPassword,
} from "./vault-password-generator"

describe("generateVaultPassword", () => {
  it("defaults to 20 characters with every character class", () => {
    for (let i = 0; i < 50; i++) {
      const password = generateVaultPassword()
      expect(password).toHaveLength(GENERATED_PASSWORD_DEFAULT_LENGTH)
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/[0-9]/)
      expect(password).toMatch(/[^a-zA-Z0-9]/)
    }
  })

  it("can leave symbols out", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateVaultPassword({ symbols: false })).toMatch(/^[a-zA-Z0-9]+$/)
    }
  })

  it("clamps the length to 12–64", () => {
    expect(generateVaultPassword({ length: 4 })).toHaveLength(GENERATED_PASSWORD_MIN_LENGTH)
    expect(generateVaultPassword({ length: 500 })).toHaveLength(GENERATED_PASSWORD_MAX_LENGTH)
    expect(generateVaultPassword({ length: 32 })).toHaveLength(32)
  })

  it("never uses look-alike characters", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateVaultPassword({ length: 64 })).not.toMatch(/[Il1O0]/)
    }
  })

  it("doesn't repeat itself", () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateVaultPassword()))
    expect(seen.size).toBe(200)
  })
})
