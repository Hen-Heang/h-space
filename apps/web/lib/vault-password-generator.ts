// H-Vault password generator. Runs in the browser with the Web Crypto CSPRNG
// (`crypto.getRandomValues`), never `Math.random`, and uses rejection sampling
// so every character is equally likely (no modulo bias). The result only ever
// lands in the form's password field, which is encrypted before saving.
// Framework-free and tested (lib/vault-password-generator.test.ts).

export const GENERATED_PASSWORD_MIN_LENGTH = 12
export const GENERATED_PASSWORD_MAX_LENGTH = 64
export const GENERATED_PASSWORD_DEFAULT_LENGTH = 20

// Look-alike characters (I l 1 O 0) are left out so a password can be read
// off the screen and typed on another device without guessing.
const LOWER = "abcdefghijkmnopqrstuvwxyz"
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"
const DIGITS = "23456789"
// Symbols most sign-up forms accept.
const SYMBOLS = "!@#$%^&*-_=+?"

export type PasswordGeneratorOptions = {
  length?: number
  symbols?: boolean
}

/** A uniformly random integer in [0, max). */
function randomIndex(max: number): number {
  // The largest multiple of `max` that fits in 32 bits; values at or above it
  // are redrawn so the remainder is unbiased.
  const limit = Math.floor(0x1_0000_0000 / max) * max
  const buffer = new Uint32Array(1)
  for (;;) {
    globalThis.crypto.getRandomValues(buffer)
    if (buffer[0] < limit) return buffer[0] % max
  }
}

function pick(chars: string): string {
  return chars[randomIndex(chars.length)]
}

/**
 * A random password with at least one lowercase letter, uppercase letter and
 * digit (and symbol, unless `symbols: false`), so it passes common sign-up
 * rules. Length is clamped to 12–64.
 */
export function generateVaultPassword(options: PasswordGeneratorOptions = {}): string {
  const length = Math.min(
    GENERATED_PASSWORD_MAX_LENGTH,
    Math.max(
      GENERATED_PASSWORD_MIN_LENGTH,
      Math.floor(options.length ?? GENERATED_PASSWORD_DEFAULT_LENGTH),
    ),
  )
  const sets = [LOWER, UPPER, DIGITS, ...(options.symbols === false ? [] : [SYMBOLS])]
  const all = sets.join("")

  const chars = sets.map(pick)
  while (chars.length < length) chars.push(pick(all))

  // Fisher–Yates, so the guaranteed characters aren't always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join("")
}
