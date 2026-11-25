import { requireRecentMfa, requireVaultUser } from "@/lib/server/vault/auth"
import { readVaultJson, vaultFail, vaultOk } from "@/lib/server/vault/http"
import { getKeyset, saveKeyset } from "@/lib/server/vault/service"
import { keysetSchema, MAX_BODY_BYTES } from "@/lib/server/vault/validation"

// H-Vault keyset: the vault key wrapped under the master password and the
// recovery key, plus public KDF settings. Ciphertext only. 404 = not set up.
// Gate and rules: lib/server/vault/auth.ts, lib/server/vault/service.ts.

export async function GET(req: Request) {
  try {
    const userId = await requireVaultUser(req)
    return vaultOk(await getKeyset(userId))
  } catch (error) {
    return vaultFail(error)
  }
}

export async function PUT(req: Request) {
  try {
    const userId = await requireVaultUser(req)
    const input = keysetSchema.parse(await readVaultJson(req, MAX_BODY_BYTES))
    // Replacing (a version is sent) can lock every item away, so it needs a
    // fresh authenticator code. Creating the first keyset doesn't: there's
    // nothing to lose, and a create over an existing keyset is a 409.
    if (input.version !== undefined) requireRecentMfa(req)
    return vaultOk(await saveKeyset(userId, input))
  } catch (error) {
    return vaultFail(error)
  }
}
