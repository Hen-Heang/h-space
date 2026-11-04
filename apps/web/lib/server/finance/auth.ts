import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { requireUser } from "@/lib/server/ai"
import { parseFinanceAccountLinks, resolveLuyraUserId } from "@/lib/server/finance/account-link"
import { normalizeFinanceDatabaseUrl } from "@/lib/server/finance/database-url"
import { isFinanceDatabaseConfigured } from "@/lib/server/finance/db"
import { AppError, Errors } from "@/lib/server/finance/errors"
import { findUserById } from "@/lib/server/finance/repositories/user-repository"
import type { AppUser } from "@/types/user"

/**
 * Why finance is unavailable, by setting NAME only — never a value. Returned
 * for the server log; the HTTP response stays generic.
 */
export function financeConfigProblems(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const problems: string[] = []
  if (!env.FINANCE_DATABASE_URL?.trim()) {
    problems.push("FINANCE_DATABASE_URL is not set")
  } else if (!normalizeFinanceDatabaseUrl(env.FINANCE_DATABASE_URL)) {
    problems.push(
      "FINANCE_DATABASE_URL is malformed (expected a postgresql:// connection string, no 'psql' prefix)",
    )
  }
  if (!env.FINANCE_ACCOUNT_LINKS?.trim()) {
    problems.push("FINANCE_ACCOUNT_LINKS is not set")
  } else if (!parseFinanceAccountLinks(env.FINANCE_ACCOUNT_LINKS)) {
    problems.push(
      "FINANCE_ACCOUNT_LINKS is malformed (expected <h-space-user-uuid>=<luyra-user-uuid>)",
    )
  }
  return problems
}

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
 * The reason for a 503/403 goes to the server log (setting names, and the
 * caller's own H-Space id for a missing link) so it can be fixed without
 * guessing; no setting value is ever logged.
 *
 * Unlike Luyra it never creates a `users` row: the linked Luyra user already
 * exists in Neon, and H-Space must not mint finance accounts.
 */
export async function requireFinanceUserId(req: Request): Promise<string> {
  return (await requireFinanceSession(req)).financeUserId
}

export interface FinanceSession {
  /** The linked Luyra user id — scope every Neon query by this. */
  financeUserId: string
  /** The verified H-Space user id (the bridged Supabase JWT's subject). */
  hspaceUserId: string
  /**
   * Per-request Supabase client carrying the caller's JWT, so RLS applies.
   * For reading the caller's own H-Space rows (e.g. their Telegram link);
   * never a service-role client.
   */
  db: SupabaseClient
}

/** requireFinanceUserId plus the caller's H-Space id and RLS-scoped client. */
export async function requireFinanceSession(req: Request): Promise<FinanceSession> {
  const authed = await requireUser(req)
  if (authed instanceof Response) {
    if (authed.status === 503) {
      console.warn("[finance] unavailable: Supabase (NEXT_PUBLIC_SUPABASE_*) is not configured")
      throw new AppError("FINANCE_NOT_CONFIGURED", "Finance is not available right now", 503)
    }
    throw Errors.unauthorized()
  }

  const problems = financeConfigProblems()
  const links = parseFinanceAccountLinks(process.env.FINANCE_ACCOUNT_LINKS)
  if (problems.length > 0 || !links || !isFinanceDatabaseConfigured()) {
    console.warn(`[finance] unavailable: ${problems.join("; ")}`)
    throw new AppError("FINANCE_NOT_CONFIGURED", "Finance is not available right now", 503)
  }

  const financeUserId = resolveLuyraUserId(links, authed.user.id)
  if (!financeUserId) {
    console.warn(
      `[finance] no FINANCE_ACCOUNT_LINKS entry for H-Space user ${authed.user.id} — ` +
        "use this id on the left of the '='",
    )
    throw new AppError("FINANCE_NOT_LINKED", "No finance account is linked to this user", 403)
  }
  return { financeUserId, hspaceUserId: authed.user.id, db: authed.db }
}

/**
 * Like requireFinanceUserId, but also returns the linked Luyra user's profile
 * row (for its email address) — Luyra's `ensureAppUser()` equivalent. The row
 * must already exist: H-Space never creates finance users.
 */
export async function requireFinanceAppUser(req: Request): Promise<AppUser> {
  const financeUserId = await requireFinanceUserId(req)
  const user = await findUserById(financeUserId)
  if (!user) throw Errors.notFound("Finance account")
  return user
}
