# Vault rule (H-Vault, browser side)

Full detail: `apps/web/docs/h-vault.md`, and h-space-api `docs/vault-design.md`.
Read both before touching `apps/web/lib/vault-*.ts`, `lib/api/vault.ts`,
`hooks/useVault.ts`, `components/vault/*`, `app/(main)/vault/*` or `lib/csp.ts`.

- H-Vault holds **real** credentials in production (since 2026-11-01) and the
  independent security review is **still pending**. Until it's done: no new
  secret fields (PIN, token, recovery code, notes), no sharing, no export, and
  never describe it as "zero-knowledge" in code, docs or UI copy.
- Encryption happens **only in the browser** (`lib/vault-crypto.ts`, v2
  envelopes). Only `v2.` ciphertext may leave the browser. Never add a
  plaintext path to hub-api, the AI routes, Supabase or any other service.
- Never persist the master password, recovery key or vault key — not in
  `localStorage`, `sessionStorage`, IndexedDB, cookies, URLs or query
  caches. The unlocked key stays non-extractable and in memory only
  (`lib/vault-session.ts`).
- Never log or report vault data: no `console.*` of items, inputs or keys,
  and nothing vault-related in Sentry breadcrumbs/contexts, analytics, toasts
  with secret text, or error messages. Scrub before reporting an error.
- Never send vault content (even decrypted service names) to `app/api/ai/*`
  or any LLM prompt.
- `lib/csp.ts` is part of the vault's protection: keep `connect-src` tight and
  don't add `unsafe-eval` or broad wildcards when adding a service.
- Vault requires an MFA-enabled h-space-api account; don't add a bypass, even
  for demos or tests. Tests use synthetic data and synthetic master passwords
  only — never a real export or real account.
