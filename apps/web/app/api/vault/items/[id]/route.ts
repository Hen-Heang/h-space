import { requireVaultUser } from "@/lib/server/vault/auth"
import { readVaultJson, vaultFail, vaultOk } from "@/lib/server/vault/http"
import { deleteItem, updateItem } from "@/lib/server/vault/service"
import { itemUpdateSchema, MAX_BODY_BYTES, vaultIdSchema } from "@/lib/server/vault/validation"

// One vault item. Updates carry the version they were read at (409 if it
// changed); another user's id is 404, the same as a missing one.

type Context = { params: Promise<{ id: string }> }

export async function PUT(req: Request, context: Context) {
  try {
    const userId = await requireVaultUser(req)
    const id = vaultIdSchema.parse((await context.params).id)
    const input = itemUpdateSchema.parse(await readVaultJson(req, MAX_BODY_BYTES))
    return vaultOk(await updateItem(userId, id, input))
  } catch (error) {
    return vaultFail(error)
  }
}

export async function DELETE(req: Request, context: Context) {
  try {
    const userId = await requireVaultUser(req)
    const id = vaultIdSchema.parse((await context.params).id)
    await deleteItem(userId, id)
    return vaultOk({})
  } catch (error) {
    return vaultFail(error)
  }
}
