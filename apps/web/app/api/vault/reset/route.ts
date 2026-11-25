import { requireRecentMfa, requireVaultUser } from "@/lib/server/vault/auth"
import { readVaultJson, vaultFail, vaultOk } from "@/lib/server/vault/http"
import { resetVault } from "@/lib/server/vault/service"
import { MAX_BODY_BYTES, resetSchema } from "@/lib/server/vault/validation"

// Deletes the keyset and every item only it could read. The body must be
// exactly { "confirm": "RESET" }, and the session must have checked an
// authenticator code in the last five minutes (requireRecentMfa).

export async function POST(req: Request) {
  try {
    const userId = await requireVaultUser(req)
    resetSchema.parse(await readVaultJson(req, MAX_BODY_BYTES))
    requireRecentMfa(req)
    await resetVault(userId)
    return vaultOk({})
  } catch (error) {
    return vaultFail(error)
  }
}
