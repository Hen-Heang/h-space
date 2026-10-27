import "server-only";
import type { User } from "@supabase/supabase-js";
import { getCurrentSupabaseUser } from "@/lib/auth/current-user";
import { Errors } from "@/lib/errors";
import { createUser, findUserById } from "@/lib/repositories/user-repository";
import type { AppUser } from "@/types/user";

function metadataString(user: User, key: string): string | null {
  const value = user.user_metadata?.[key];
  return typeof value === "string" ? value : null;
}

// Ids this process has already confirmed (or created) a `users` row for.
//
// The mirror row is written once and never deleted in normal operation, so
// re-checking it costs a full Neon round trip to learn nothing. Neon lives in
// us-east-2 while the app runs in icn1 (see vercel.json), which makes that
// round trip ~200ms — several hundred times the ~0.1ms Postgres spends on the
// lookup itself. Remembering the answer per process skips the hop on every
// request after the first that a warm instance serves.
//
// Deliberately process-local: no cross-instance cache to invalidate, and a
// cold start simply pays for one lookup again. Bounded so a long-lived
// instance can't grow it without limit.
const ensuredUserIds = new Set<string>();
const ENSURED_LIMIT = 1000;

function remember(id: string): void {
  if (ensuredUserIds.size >= ENSURED_LIMIT) ensuredUserIds.clear();
  ensuredUserIds.add(id);
}

/** Forget a mirrored user, so the next call re-checks Neon. Call this if a
 * `users` row is ever deleted while the process stays alive. */
export function forgetEnsuredAppUser(id: string): void {
  ensuredUserIds.delete(id);
}

async function requireSupabaseUser(): Promise<User> {
  const supabaseUser = await getCurrentSupabaseUser();
  if (!supabaseUser) {
    throw Errors.unauthorized();
  }
  return supabaseUser;
}

async function mirrorUser(supabaseUser: User): Promise<AppUser> {
  const existing = await findUserById(supabaseUser.id);
  if (existing) {
    remember(existing.id);
    return existing;
  }

  const created = await createUser({
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    displayName: metadataString(supabaseUser, "display_name") ?? metadataString(supabaseUser, "full_name"),
    avatarUrl: metadataString(supabaseUser, "avatar_url"),
  });
  remember(created.id);
  return created;
}

// Mirrors the authenticated Supabase user into Neon's `users` table, using
// the Supabase JWT's `sub` claim (user.id) as the shared primary key. Safe to
// call on every request that needs app data — it's a no-op after the first.
//
// Always reads the row, so the returned profile fields are current. Prefer
// `ensureAppUserId` when the caller only needs the id.
export async function ensureAppUser(): Promise<AppUser> {
  return mirrorUser(await requireSupabaseUser());
}

// Id-only variant for the routes that just need a `user_id` to query by.
//
// `users.id` *is* the Supabase `sub` claim, so the id is already known from the
// verified session — the `users` read only proves the mirror row exists (which
// the foreign keys on tasks, goals and finance tables require). Once this
// process has established that, the id can be returned straight from the
// session and the round trip disappears.
export async function ensureAppUserId(): Promise<string> {
  const supabaseUser = await requireSupabaseUser();
  if (ensuredUserIds.has(supabaseUser.id)) {
    return supabaseUser.id;
  }
  return (await mirrorUser(supabaseUser)).id;
}

// For pages that need both the profile and the user's data. The session is
// verified up front (same `getUser()` check as everywhere else), then the id —
// which *is* the verified `sub` — is handed back immediately so read-only data
// queries can run in parallel with the `users` mirror read instead of after it.
// Only use the id for reads here: writes still need the mirror row to exist,
// so await `appUser` first when writing.
export async function requireAppUserSession(): Promise<{ userId: string; appUser: Promise<AppUser> }> {
  const supabaseUser = await requireSupabaseUser();
  return { userId: supabaseUser.id, appUser: mirrorUser(supabaseUser) };
}
