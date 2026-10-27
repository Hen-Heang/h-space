# Architecture

## Current

```
Browser
   |
   v
Next.js
   |
   +---- Supabase Auth (login, session, identity)
   |
   +---- Next.js Route Handlers (/api/*)
                 |
                 v
             Neon Postgres
```

Supabase provides session management, login/logout, and identity (JWT
`claims.sub`). Finance records and the `users` mirror table live in Luyra's
Neon database. H-Space and Luyra use independent browser sessions. Luyra's
paused Hengo routes remain in source, but `proxy.ts` redirects those routes to
`/finance`; they are not an active duplicate workspace.

The Money Flow finance import is already recorded as completed in
[APP-MIGRATION.md](./APP-MIGRATION.md). That historical database migration
must not be repeated.

## Request flow

```
React component
    v
lib/api/*.ts        (fetch wrapper)
    v
app/api/*/route.ts  (Next.js Route Handler — validates, checks auth)
    v
lib/services/*.ts   (business logic)
    v
lib/repositories/*.ts (SQL, snake_case <-> camelCase mapping)
    v
Neon
```

Components never import a repository or `lib/db` directly. This boundary is
what makes the Phase 4 backend swap a contained change instead of a rewrite.

## Identity

Supabase's authenticated user id (JWT `claims.sub`) is the canonical user
identifier everywhere. `ensureAppUser()` (`lib/auth/ensure-app-user.ts`)
mirrors that id and profile fields into Neon's `users` table on first use.
Route handlers always derive `user_id` from the authenticated Supabase
session server-side — a `user_id` sent in a request body is never trusted.
Every task/goal query filters by it, and every update/delete uses
`where id = ? and user_id = ?`.

## Future (Phase 4)

```
Browser
   |
Next.js
   |
Spring Boot REST API
   |
Neon Postgres
```

`app/api/*/route.ts` is replaced by Spring Boot controllers; `lib/services`
and `lib/repositories` become their Java equivalents. `lib/api/*.ts` changes
its base URL (and, later, drops the Next.js proxy hop entirely) but keeps the
same function signatures, so components and `lib/validation` DTOs are
unaffected.
