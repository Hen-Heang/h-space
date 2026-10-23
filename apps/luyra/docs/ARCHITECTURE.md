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

For native Luyra domains, Supabase provides session management, login/logout,
and identity (JWT `claims.sub`). Tasks, goals, and the `users` mirror table live
in Neon.

That boundary applies to native Luyra domains. Migrated product domains keep
their existing stores during the test migration: Hengo Learning uses the
primary Supabase project and Money Flow Finance uses its own Supabase project.
See [APP-MIGRATION.md](./APP-MIGRATION.md) for the session and data boundaries.

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
