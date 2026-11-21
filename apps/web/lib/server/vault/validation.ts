import { z } from "zod"

// Request bodies for app/api/vault/*, mirroring hub-api's VaultFormats and
// request classes (h-space-api hub-api payload/vault/*): only v2 envelopes and
// public KDF settings are accepted, and unknown fields are rejected (strict),
// so nothing readable can be smuggled into a row. The same shapes are checked
// again by the tables' CHECK constraints.

export const ITEM_ENVELOPE = /^v2\.[A-Za-z0-9+/]{16}\.[A-Za-z0-9+/]{24,}={0,2}$/
export const WRAPPED_KEY = /^v2\.[A-Za-z0-9+/]{16}\.[A-Za-z0-9+/]{64}$/
export const KDF_SALT = /^[A-Za-z0-9+/]{22}==$/
export const MIN_KDF_ITERATIONS = 600_000
export const MAX_KDF_ITERATIONS = 10_000_000
export const MAX_ITEM_CIPHERTEXT_LENGTH = 16_384
/** Far above what one person keeps; stops a runaway client filling the table. */
export const MAX_ITEMS_PER_USER = 1000
/** Largest body any vault request needs (one item envelope plus field names). */
export const MAX_BODY_BYTES = 32 * 1024

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const vaultIdSchema = z.string().regex(UUID, "id must be a UUID.")

const itemEnvelope = z
  .string({ error: "payloadCiphertext must be a v2 encrypted envelope." })
  .max(MAX_ITEM_CIPHERTEXT_LENGTH, "payloadCiphertext is too large.")
  .regex(ITEM_ENVELOPE, "payloadCiphertext must be a v2 encrypted envelope.")

const version = z
  .number({ error: "version must be a whole number." })
  .int("version must be a whole number.")
  .min(0, "version must be a whole number.")

export const keysetSchema = z.strictObject(
  {
    kdf: z.literal("PBKDF2-SHA256", { error: "kdf must be PBKDF2-SHA256." }),
    kdfIterations: z
      .number({ error: "kdfIterations must be a number." })
      .int("kdfIterations must be a whole number.")
      .min(MIN_KDF_ITERATIONS, "kdfIterations must be at least 600000.")
      .max(MAX_KDF_ITERATIONS, "kdfIterations is too large."),
    kdfSalt: z
      .string({ error: "kdfSalt must be 16 bytes of base64." })
      .regex(KDF_SALT, "kdfSalt must be 16 bytes of base64."),
    wrappedKey: z
      .string({ error: "wrappedKey must be a v2 wrapped key." })
      .regex(WRAPPED_KEY, "wrappedKey must be a v2 wrapped key."),
    recoveryWrappedKey: z
      .string({ error: "recoveryWrappedKey must be a v2 wrapped key." })
      .regex(WRAPPED_KEY, "recoveryWrappedKey must be a v2 wrapped key."),
    version: version.optional(),
  },
  { error: (issue) => (issue.code === "unrecognized_keys" ? "Unknown field." : undefined) },
)

export const resetSchema = z.strictObject(
  {
    confirm: z.literal("RESET", { error: "Type RESET to confirm deleting the whole vault." }),
  },
  { error: (issue) => (issue.code === "unrecognized_keys" ? "Unknown field." : undefined) },
)

export const itemCreateSchema = z.strictObject(
  { id: vaultIdSchema, payloadCiphertext: itemEnvelope },
  { error: (issue) => (issue.code === "unrecognized_keys" ? "Unknown field." : undefined) },
)

export const itemUpdateSchema = z.strictObject(
  { payloadCiphertext: itemEnvelope, version },
  { error: (issue) => (issue.code === "unrecognized_keys" ? "Unknown field." : undefined) },
)

export type KeysetInput = z.infer<typeof keysetSchema>
export type ItemCreateInput = z.infer<typeof itemCreateSchema>
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>
