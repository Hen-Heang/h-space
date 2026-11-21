import { createHmac } from "node:crypto"

// RFC 6238 TOTP (SHA-1, 6 digits, 30 s) — what Google Authenticator computes —
// so the signed-in journey can answer two-step prompts for its own throwaway
// test account. Test-only; the app never generates codes.

const STEP_SECONDS = 30
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s=-]/g, "").toUpperCase()
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of clean) {
    const index = BASE32.indexOf(char)
    if (index === -1) throw new Error("Not a base32 secret")
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

export function totpStep(now = Date.now()): number {
  return Math.floor(now / 1000 / STEP_SECONDS)
}

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return code.toString().padStart(6, "0")
}

const lastUsed = new Map<string, number>()

/**
 * A code for a time step this secret hasn't answered yet — Supabase refuses a
 * code that was already used — waiting for the next step when needed. Also
 * avoids the last 3 seconds of a step so the code doesn't expire in flight.
 */
export async function freshTotp(secret: string): Promise<string> {
  for (;;) {
    const now = Date.now()
    const step = totpStep(now)
    const secondsLeft = STEP_SECONDS - ((now / 1000) % STEP_SECONDS)
    if (step > (lastUsed.get(secret) ?? -1) && secondsLeft > 3) {
      lastUsed.set(secret, step)
      return totpAt(secret, step)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}
