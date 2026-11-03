# Security rule

- Treat request input, file paths, database identifiers, and external responses as untrusted.
- Use the project's existing authentication and authorization boundaries.
- Do not read secret files or copy secret values into logs, prompts, context, or code.
- Use parameterized database access and preserve ownership predicates.
- Flag a security concern with its file and consequence; do not silently weaken a guard.

## This project

- Anything prefixed `NEXT_PUBLIC_` ships to the browser. Server secrets
  (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY`, model overrides) must never get
  that prefix or be imported from client components.
- The service-role key is used in exactly one place,
  `apps/web/lib/server/google-calendar-store.ts`, for a documented reason.
  Don't add a second use; new server code goes through `requireUser`'s
  RLS-scoped client.
- The client-side route guard is UX, not security. Authorization lives in
  Supabase RLS, h-space-api, and server-side checks in `app/api/*`.
- Supabase is the **live database shared with Orbit**. Never apply,
  reset or repair migrations, or run SQL against it, without the user's
  explicit go-ahead for that specific change.
- User content fed to a model goes in a `<user_data>` block and is treated
  as data, never instructions.
- H-Vault has its own rule: [vault](vault.md).
