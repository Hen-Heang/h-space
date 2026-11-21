import { requireVaultUser } from "@/lib/server/vault/auth"
import { readVaultJson, vaultFail, vaultOk } from "@/lib/server/vault/http"
import { createItem, listItems } from "@/lib/server/vault/service"
import { itemCreateSchema, MAX_BODY_BYTES } from "@/lib/server/vault/validation"

// The signed-in user's vault items, newest first. Each item is one v2
// envelope; the id is chosen in the browser because envelopes are bound to it.

export async function GET(req: Request) {
  try {
    const userId = await requireVaultUser(req)
    return vaultOk(await listItems(userId))
  } catch (error) {
    return vaultFail(error)
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireVaultUser(req)
    const input = itemCreateSchema.parse(await readVaultJson(req, MAX_BODY_BYTES))
    return vaultOk(await createItem(userId, input), 201)
  } catch (error) {
    return vaultFail(error)
  }
}
