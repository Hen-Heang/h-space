// H-Vault password encryption — end-to-end, in the browser (Web Crypto only,
// no dependency). Passwords are encrypted with a key derived from the user's
// master password BEFORE they leave the browser; the database, Supabase, logs
// and the demo localStorage only ever see the ciphertext envelope below. The
// master password and the derived key are never stored or sent anywhere —
// lose the master password and the saved passwords cannot be recovered.
//
// Envelope (one text column, `password_ciphertext`):
//   v1.<salt b64>.<iv b64>.<AES-GCM ciphertext+tag b64>
// - key:  PBKDF2-SHA256(master password, salt, 600 000 iterations) → AES-256-GCM
// - salt: 16 random bytes, shared by every envelope of one user, so a single
//         unlock derives one key for the whole vault
// - iv:   12 random bytes, unique per encryption
//
// Framework-free and tested (lib/vault-crypto.test.ts).

export const VAULT_ENVELOPE_VERSION = "v1"
/** OWASP's 2023+ recommendation for PBKDF2-HMAC-SHA256. */
export const PBKDF2_ITERATIONS = 600_000
export const MIN_MASTER_PASSWORD_LENGTH = 12
/** The longest password H-Vault will encrypt. */
export const MAX_VAULT_PASSWORD_LENGTH = 1024

const SALT_BYTES = 16
const IV_BYTES = 12
const ENVELOPE_PATTERN = /^v1\.[A-Za-z0-9+/]+={0,2}\.[A-Za-z0-9+/]+={0,2}\.[A-Za-z0-9+/]+={0,2}$/

/** Raised when a ciphertext can't be decrypted — almost always a wrong master password. */
export class VaultDecryptError extends Error {
  constructor(message = "Wrong master password.") {
    super(message)
    this.name = "VaultDecryptError"
  }
}

export type VaultKey = { key: CryptoKey; salt: Uint8Array }

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle
  if (!s) throw new Error("This browser can't encrypt passwords (Web Crypto unavailable).")
  return s
}

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function isVaultEnvelope(value: unknown): value is string {
  return typeof value === "string" && value.length <= 4096 && ENVELOPE_PATTERN.test(value)
}

type Envelope = { salt: Uint8Array; iv: Uint8Array; ciphertext: Uint8Array }

function parseEnvelope(value: string): Envelope {
  if (!isVaultEnvelope(value)) throw new VaultDecryptError("Not an H-Vault encrypted value.")
  const [, salt, iv, ciphertext] = value.split(".")
  return { salt: fromBase64(salt), iv: fromBase64(iv), ciphertext: fromBase64(ciphertext) }
}

/** The salt an envelope was encrypted under — used to unlock with the same key. */
export function envelopeSalt(value: string): Uint8Array {
  return parseEnvelope(value).salt
}

export function newVaultSalt(): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES))
}

export async function deriveVaultKey(
  masterPassword: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<VaultKey> {
  if (!masterPassword) throw new Error("Enter your master password.")
  const baseKey = await subtle().importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"],
  )
  const key = await subtle().deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    baseKey,
    { name: "AES-GCM", length: 256 },
    // Non-extractable: the raw key bytes can never be read back out.
    false,
    ["encrypt", "decrypt"],
  )
  return { key, salt }
}

export async function encryptVaultPassword(password: string, vaultKey: VaultKey): Promise<string> {
  if (!password) throw new Error("Nothing to encrypt.")
  if (password.length > MAX_VAULT_PASSWORD_LENGTH) throw new Error("That password is too long.")
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ciphertext = new Uint8Array(
    await subtle().encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      vaultKey.key,
      new TextEncoder().encode(password),
    ),
  )
  return [VAULT_ENVELOPE_VERSION, toBase64(vaultKey.salt), toBase64(iv), toBase64(ciphertext)].join(
    ".",
  )
}

export async function decryptVaultPassword(envelope: string, vaultKey: VaultKey): Promise<string> {
  const { iv, ciphertext } = parseEnvelope(envelope)
  try {
    const plain = await subtle().decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      vaultKey.key,
      ciphertext as BufferSource,
    )
    return new TextDecoder().decode(plain)
  } catch {
    // AES-GCM authentication failed: wrong key, or the value was tampered with.
    throw new VaultDecryptError()
  }
}

/**
 * Unlocks the vault: derives the key from the master password and proves it
 * against an existing envelope (when there is one), so a typo can never start
 * encrypting new passwords under a different key.
 */
export async function unlockVault(
  masterPassword: string,
  existingEnvelope: string | null,
  iterations = PBKDF2_ITERATIONS,
): Promise<VaultKey> {
  if (!existingEnvelope) {
    if (masterPassword.length < MIN_MASTER_PASSWORD_LENGTH) {
      throw new Error(`Use at least ${MIN_MASTER_PASSWORD_LENGTH} characters.`)
    }
    return deriveVaultKey(masterPassword, newVaultSalt(), iterations)
  }
  const vaultKey = await deriveVaultKey(masterPassword, envelopeSalt(existingEnvelope), iterations)
  await decryptVaultPassword(existingEnvelope, vaultKey)
  return vaultKey
}
