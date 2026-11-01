// H-Vault encryption, v2 — end-to-end, in the browser (Web Crypto only, no
// dependency). Design: h-space-api docs/vault-design.md, section 5.
//
//   master password ─PBKDF2-SHA256(salt, iterations)─▶ KEK ─┐
//   recovery key ────HKDF-SHA256─────────────────────▶ KEK ─┤ AES-256-GCM wrap
//                                                           ▼
//                     random 256-bit vault key (wrapped twice in the keyset)
//                                 │ AES-256-GCM, fresh 12-byte IV,
//                                 │ associated data = user + item id
//                                 ▼
//                     item payload / password envelopes
//
// The server (and the demo's localStorage) only ever sees envelopes and the
// public KDF settings. The master password, the recovery key and every
// unwrapped key stay in this tab: the vault key is imported non-extractable
// and its raw bytes are wiped right after.
//
// Envelope: v2.<12-byte IV, base64>.<AES-GCM ciphertext + tag, base64>
// The associated data binds each envelope to its user and row, so a server
// that swaps envelopes between rows (or users) makes decryption fail instead
// of showing the wrong password under an account.
//
// Framework-free and tested (lib/vault-crypto.test.ts).

export const VAULT_ENVELOPE_VERSION = "v2"
export const VAULT_KDF = "PBKDF2-SHA256"
/** OWASP's 2023+ recommendation for PBKDF2-HMAC-SHA256; the server refuses less. */
export const PBKDF2_ITERATIONS = 600_000
export const MIN_MASTER_PASSWORD_LENGTH = 12
/** The longest password H-Vault will encrypt. */
export const MAX_VAULT_PASSWORD_LENGTH = 1024
/** Item payloads are padded to a multiple of this, so sizes reveal less. */
export const PAYLOAD_PADDING = 256

const KEY_BYTES = 32
const SALT_BYTES = 16
const IV_BYTES = 12
const RECOVERY_INFO = "h-vault/recovery/v2"
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

// The server (h-space-api VaultFormats / V1__vault.sql) checks item envelopes
// for at least 24 base64 characters; items are padded to 256+ bytes so they
// always pass. Password envelopes stay inside items, and a 1-character
// password is just over the 16-byte tag, so here the floor is the tag alone.
const ENVELOPE_PATTERN = /^v2\.[A-Za-z0-9+/]{16}\.[A-Za-z0-9+/]{22,}={0,2}$/
const WRAPPED_KEY_PATTERN = /^v2\.[A-Za-z0-9+/]{16}\.[A-Za-z0-9+/]{64}$/

/** Raised when an envelope can't be decrypted: wrong secret, wrong row, or tampering. */
export class VaultDecryptError extends Error {
  constructor(message = "Wrong master password.") {
    super(message)
    this.name = "VaultDecryptError"
  }
}

/** The unlocked vault key for one user. Never leaves tab memory (lib/vault-session.ts). */
export type VaultKey = { key: CryptoKey; userId: string }

/** What the server stores for a user: wrapped keys plus the public KDF settings. */
export type VaultKeysetData = {
  kdf: string
  kdfIterations: number
  kdfSalt: string
  wrappedKey: string
  recoveryWrappedKey: string
}

// ─── encoding ─────────────────────────────────────────────────────────────────

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle
  if (!s) throw new Error("This browser can't encrypt passwords (Web Crypto unavailable).")
  return s
}

function randomBytes(length: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(length))
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

const utf8 = (value: string) => new TextEncoder().encode(value)

export function isVaultEnvelope(value: unknown): value is string {
  return typeof value === "string" && ENVELOPE_PATTERN.test(value)
}

export function isWrappedKey(value: unknown): value is string {
  return typeof value === "string" && WRAPPED_KEY_PATTERN.test(value)
}

// ─── associated data ──────────────────────────────────────────────────────────

const keysetAad = (userId: string) => `h-vault/keyset/v2/${userId}`
const recoveryAad = (userId: string) => `h-vault/recovery/v2/${userId}`
const itemAad = (userId: string, itemId: string) => `h-vault/item/v2/${userId}/${itemId}`
const passwordAad = (userId: string, itemId: string) => `h-vault/password/v2/${userId}/${itemId}`

// ─── AES-GCM envelopes ────────────────────────────────────────────────────────

async function seal(key: CryptoKey, plaintext: Uint8Array, aad: string): Promise<string> {
  const iv = randomBytes(IV_BYTES)
  const ciphertext = new Uint8Array(
    await subtle().encrypt(
      { name: "AES-GCM", iv: iv as BufferSource, additionalData: utf8(aad) as BufferSource },
      key,
      plaintext as BufferSource,
    ),
  )
  return [VAULT_ENVELOPE_VERSION, toBase64(iv), toBase64(ciphertext)].join(".")
}

async function open(
  key: CryptoKey,
  envelope: string,
  aad: string,
  error: () => VaultDecryptError,
): Promise<Uint8Array> {
  if (!isVaultEnvelope(envelope)) throw new VaultDecryptError("Not an H-Vault encrypted value.")
  const [, iv, ciphertext] = envelope.split(".")
  try {
    return new Uint8Array(
      await subtle().decrypt(
        {
          name: "AES-GCM",
          iv: fromBase64(iv) as BufferSource,
          additionalData: utf8(aad) as BufferSource,
        },
        key,
        fromBase64(ciphertext) as BufferSource,
      ),
    )
  } catch {
    // The GCM tag didn't verify: wrong key, wrong row/user, or tampering.
    throw error()
  }
}

// ─── keys ─────────────────────────────────────────────────────────────────────

async function importVaultKey(raw: Uint8Array): Promise<CryptoKey> {
  // Non-extractable: the raw bytes can never be read back out of it. Callers
  // wipe `raw` once they're done with it.
  return subtle().importKey("raw", raw as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"])
}

async function masterKek(masterPassword: string, salt: Uint8Array, iterations: number) {
  if (!masterPassword) throw new Error("Enter your master password.")
  const base = await subtle().importKey(
    "raw",
    utf8(masterPassword) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"],
  )
  return subtle().deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

// The recovery key is 256 random bits, so it needs no slow KDF.
async function recoveryKek(recoveryKey: Uint8Array) {
  const base = await subtle().importKey("raw", recoveryKey as BufferSource, "HKDF", false, [
    "deriveKey",
  ])
  return subtle().deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32) as BufferSource,
      info: utf8(RECOVERY_INFO) as BufferSource,
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

function checkMasterPassword(masterPassword: string) {
  if (masterPassword.length < MIN_MASTER_PASSWORD_LENGTH) {
    throw new Error(`Use at least ${MIN_MASTER_PASSWORD_LENGTH} characters.`)
  }
}

// ─── recovery key format ──────────────────────────────────────────────────────

/** 32 bytes as base32 in groups of four, e.g. `K7QF-2MXP-…` (52 characters). */
export function formatRecoveryKey(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ""
  for (const byte of bytes) {
    value = ((value << 8) | byte) & 0xffff
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out.match(/.{1,4}/g)!.join("-")
}

/** Accepts the key as printed, in any case, with or without dashes or spaces. */
export function parseRecoveryKey(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[\s-]/g, "")
  if (clean.length !== 52 || [...clean].some((c) => !BASE32.includes(c))) {
    throw new VaultDecryptError("That doesn't look like an H-Vault recovery key.")
  }
  const bytes = new Uint8Array(KEY_BYTES)
  let bits = 0
  let value = 0
  let index = 0
  for (const char of clean) {
    value = ((value << 5) | BASE32.indexOf(char)) & 0xffff
    bits += 5
    if (bits >= 8) {
      if (index < KEY_BYTES) bytes[index++] = (value >>> (bits - 8)) & 255
      bits -= 8
    }
  }
  return bytes
}

// ─── keyset lifecycle ─────────────────────────────────────────────────────────

async function wrapUnderMaster(
  rawVaultKey: Uint8Array,
  masterPassword: string,
  userId: string,
  iterations: number,
) {
  const salt = randomBytes(SALT_BYTES)
  const kek = await masterKek(masterPassword, salt, iterations)
  return {
    kdf: VAULT_KDF,
    kdfIterations: iterations,
    kdfSalt: toBase64(salt),
    wrappedKey: await seal(kek, rawVaultKey, keysetAad(userId)),
  }
}

/**
 * First-time setup: a new random vault key, wrapped under the master password
 * and a new recovery key. Show `recoveryKey` to the user once; it isn't
 * stored anywhere.
 */
export async function createVaultKeyset(
  masterPassword: string,
  userId: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<{ keyset: VaultKeysetData; recoveryKey: string; vaultKey: VaultKey }> {
  checkMasterPassword(masterPassword)
  const raw = randomBytes(KEY_BYTES)
  const recovery = randomBytes(KEY_BYTES)
  try {
    const keyset: VaultKeysetData = {
      ...(await wrapUnderMaster(raw, masterPassword, userId, iterations)),
      recoveryWrappedKey: await seal(await recoveryKek(recovery), raw, recoveryAad(userId)),
    }
    return {
      keyset,
      recoveryKey: formatRecoveryKey(recovery),
      vaultKey: { key: await importVaultKey(raw), userId },
    }
  } finally {
    raw.fill(0)
    recovery.fill(0)
  }
}

async function unwrapWithMaster(keyset: VaultKeysetData, masterPassword: string, userId: string) {
  if (keyset.kdf !== VAULT_KDF) throw new Error(`Unsupported key derivation: ${keyset.kdf}`)
  const kek = await masterKek(masterPassword, fromBase64(keyset.kdfSalt), keyset.kdfIterations)
  return open(kek, keyset.wrappedKey, keysetAad(userId), () => new VaultDecryptError())
}

async function unwrapWithRecovery(keyset: VaultKeysetData, recoveryKey: string, userId: string) {
  const recovery = parseRecoveryKey(recoveryKey)
  try {
    return await open(
      await recoveryKek(recovery),
      keyset.recoveryWrappedKey,
      recoveryAad(userId),
      () => new VaultDecryptError("That recovery key doesn't match this vault."),
    )
  } finally {
    recovery.fill(0)
  }
}

/** Wraps an unwrapped vault key under a new master password; the recovery wrap is kept. */
async function rewrap(
  raw: Uint8Array,
  keyset: VaultKeysetData,
  newMasterPassword: string,
  userId: string,
  iterations: number,
): Promise<{ keyset: VaultKeysetData; vaultKey: VaultKey }> {
  try {
    const next: VaultKeysetData = {
      ...(await wrapUnderMaster(raw, newMasterPassword, userId, iterations)),
      recoveryWrappedKey: keyset.recoveryWrappedKey,
    }
    return { keyset: next, vaultKey: { key: await importVaultKey(raw), userId } }
  } finally {
    raw.fill(0)
  }
}

/** Unlocks with the master password. A wrong one fails the GCM check (VaultDecryptError). */
export async function unlockWithMasterPassword(
  keyset: VaultKeysetData,
  masterPassword: string,
  userId: string,
): Promise<VaultKey> {
  const raw = await unwrapWithMaster(keyset, masterPassword, userId)
  try {
    return { key: await importVaultKey(raw), userId }
  } finally {
    raw.fill(0)
  }
}

/**
 * Forgotten master password: unwraps with the recovery key and wraps the same
 * vault key under a new master password. Every item stays readable; the
 * recovery key keeps working.
 */
export async function recoverWithRecoveryKey(
  keyset: VaultKeysetData,
  recoveryKey: string,
  newMasterPassword: string,
  userId: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<{ keyset: VaultKeysetData; vaultKey: VaultKey }> {
  checkMasterPassword(newMasterPassword)
  const raw = await unwrapWithRecovery(keyset, recoveryKey, userId)
  return rewrap(raw, keyset, newMasterPassword, userId, iterations)
}

/** Re-wraps the vault key under a new master password. Items aren't touched. */
export async function changeMasterPassword(
  keyset: VaultKeysetData,
  currentMasterPassword: string,
  newMasterPassword: string,
  userId: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<{ keyset: VaultKeysetData; vaultKey: VaultKey }> {
  checkMasterPassword(newMasterPassword)
  const raw = await unwrapWithMaster(keyset, currentMasterPassword, userId)
  return rewrap(raw, keyset, newMasterPassword, userId, iterations)
}

// ─── items and passwords ──────────────────────────────────────────────────────

/** Encrypts a whole item (any JSON-able object), padded and bound to its row. */
export async function encryptItemPayload(
  payload: unknown,
  itemId: string,
  vaultKey: VaultKey,
): Promise<string> {
  const json = JSON.stringify(payload)
  const padded = json.padEnd(
    Math.ceil((json.length + 1) / PAYLOAD_PADDING) * PAYLOAD_PADDING,
    " ",
  )
  return seal(vaultKey.key, utf8(padded), itemAad(vaultKey.userId, itemId))
}

export async function decryptItemPayload(
  envelope: string,
  itemId: string,
  vaultKey: VaultKey,
): Promise<unknown> {
  const plain = await open(
    vaultKey.key,
    envelope,
    itemAad(vaultKey.userId, itemId),
    () => new VaultDecryptError("This item can't be decrypted with this vault's key."),
  )
  // JSON.parse ignores the trailing padding spaces.
  return JSON.parse(new TextDecoder().decode(plain))
}

/**
 * A password gets its own envelope inside the item, so loading the list never
 * puts plaintext passwords in memory: they're decrypted only to copy/reveal.
 */
export async function encryptVaultPassword(
  password: string,
  itemId: string,
  vaultKey: VaultKey,
): Promise<string> {
  if (!password) throw new Error("Nothing to encrypt.")
  if (password.length > MAX_VAULT_PASSWORD_LENGTH) throw new Error("That password is too long.")
  return seal(vaultKey.key, utf8(password), passwordAad(vaultKey.userId, itemId))
}

export async function decryptVaultPassword(
  envelope: string,
  itemId: string,
  vaultKey: VaultKey,
): Promise<string> {
  const plain = await open(
    vaultKey.key,
    envelope,
    passwordAad(vaultKey.userId, itemId),
    () => new VaultDecryptError("This password can't be decrypted with this vault's key."),
  )
  return new TextDecoder().decode(plain)
}
