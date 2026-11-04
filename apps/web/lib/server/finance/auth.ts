import "server-only"
import { requireUser } from "@/lib/server/ai"
import { parseFinanceAccountLinks, resolveLuyraUserId } from "@/lib/server/finance/account-link"
import { isFinanceDatabaseConfigured } from "@/lib/server/finance/db"
import { AppError, Errors } from "@/lib/server/finance/errors"

/**
 * Server-side gate for every app/api/finance/* route — H-Space's replacement
 * for Luyra's cookie-based `ensureAppUserId()`. Verifies the caller's H-Space
 * session (the bridged Supabase JWT in the Authorization header), then returns
 * the explicitly linked Luyra user id. Every finance query must be scoped by
 * this value, never by an id sent from the browser.
 *
 * Throws an AppError, so the route's `apiError()` answers in Luyra's
 * `{ error: { code, message } }` envelope:
 *   - no or invalid session      → 401 UNAUTHORIZED
 *   - finance not configured     → 503 FINANCE_NOT_CONFIGURED
 *   - this user has no link      → 403 FINANCE_NOT_LINKED
 *
 * Unlike Luyra it never creates a `users` row: the linked Luyra user already
 * exists in Neon, and H-Space must not mint finance accounts.
 */
export async function requireFinanceUserId(req: Request): Promise<string> {
  const authed = await requireUser(req)
  if (authed instanceof Response) {
    if (authed.status === 503) {
      throw new AppError("FINANCE_NOT_CONFIGURED", "Finance is not available right now", 503)
    }
    throw Errors.unauthorized()
  }

  const links = parseFinanceAccountLinks(process.env.FINANCE_ACCOUNT_LINKS)
  if (!links || !isFinanceDatabaseConfigured()) {
    throw new AppError("FINANCE_NOT_CONFIGURED", "Finance is not available right now", 503)
  }

  const financeUserId = resolveLuyraUserId(links, authed.user.id)
  if (!financeUserId) {
    throw new AppError("FINANCE_NOT_LINKED", "No finance account is linked to this user", 403)
  }
  return financeUserId
}
