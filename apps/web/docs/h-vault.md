# H-Vault — private account directory

_Implemented 2026-10-23. Encrypted passwords added the same day (maintainer's
decision). Status: UI complete on a browser-local demo adapter; live
persistence pending approval of the database migration._

H-Vault answers "which account do I use for this service?". It organizes
accounts by category, supports several accounts per service (GitHub ·
Personal / Secondary), favorites, search, filters and sorting, and opens each
service's login page. Each account can also hold an **optional password,
end-to-end encrypted in the browser**.

## Where it lives

| Piece                          | Path                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| Route (authenticated shell)    | `app/(main)/vault/page.tsx` → `/vault`                                                        |
| Nav entry (My Apps workspace)  | `vaultItem` in `lib/navigation.ts`                                                            |
| Public catalog card (generic)  | `h-vault` in `lib/projects.ts`, rendered by `components/home/MyAppsSection.tsx` (also on `/`) |
| Domain types, rules, filtering | `lib/vault.ts` (+ `lib/vault.test.ts`)                                                        |
| Password encryption            | `lib/vault-crypto.ts` (+ `lib/vault-crypto.test.ts`)                                          |
| CSV import (e.g. Notion)       | `lib/vault-import.ts` (+ test), `components/vault/VaultImportDialog.tsx`                      |
| Unlock state (memory only)     | `lib/vault-session.ts`                                                                        |
| Fictional sample data          | `lib/vault-demo.ts` — `example.com` / `example.org` identifiers, no passwords                 |
| Data access                    | `lib/api/vault.ts` (+ test) — `vaultApi`, Supabase + demo adapters                            |
| Query hooks                    | `hooks/useVault.ts` (+ test)                                                                  |
| UI                             | `components/vault/*` — dashboard, toolbar, card, form, details, delete, unlock dialogs        |
| Migration (not applied)        | `supabase/migrations/20261023000000_vault_accounts.sql`                                       |
| RLS checks (local/branch only) | `supabase/tests/vault_accounts_rls.sql`                                                       |
| E2E (signed-out surface)       | `tests/e2e/vault.e2e.ts`                                                                      |

## Data model — `kori_vault_accounts`

`id`, `user_id` (defaults to `auth.uid()`), `service_name` (1–120),
`account_label` (≤ 80), `login_identifier` (≤ 254), `website_url` (≤ 2000,
must start `https://`), `category` (free text ≤ 40, default `other`), `tags`
(≤ 20), `is_favorite`, `status` (`active` · `needs_review` · `inactive`),
**`password_ciphertext`** (nullable, encrypted envelope only), `created_at`,
`updated_at` (set by the app, house style).

There is still no PIN, token, recovery-code, API-key, TOTP or private-key
column, and no free-text notes field, because notes are where secrets leak.

## How password encryption works

1. **Master password.** The first time a password is saved, the user creates
   a master password (at least 12 characters, typed twice). It is **never
   stored or sent anywhere**: not to Supabase, not to localStorage, not to
   logs.
2. **Key derivation.** PBKDF2-SHA256 with 600,000 iterations (OWASP's
   recommendation) and a random 16-byte salt produce a non-extractable
   AES-256-GCM key, using the browser's Web Crypto API (no dependency).
3. **Encryption.** Each password is encrypted with a fresh 12-byte IV. Only
   the envelope `v1.<salt>.<iv>.<ciphertext+tag>` (base64) leaves the form.
   All of a user's envelopes share one salt, so one unlock covers them all.
4. **Unlock.** Later, the master password is proven by decrypting an existing
   envelope (AES-GCM's auth tag fails on a wrong password), so a typo can't
   start encrypting under a different key. The derived key lives only in tab
   memory (`lib/vault-session.ts`). It is dropped on **Lock passwords**, on
   reload, and after **10 minutes** of inactivity.
5. **Use.** _Copy password_ decrypts in the browser and copies, and the
   clipboard is cleared after 30 seconds. _Reveal_ (in the details dialog)
   shows the password for 30 seconds or until the dialog closes. A saved
   password is never decrypted back into the edit form: typing a new one
   replaces it, and "Remove saved password" deletes it.

**There is no recovery.** If the master password is forgotten, nobody can
decrypt the saved passwords, including the maintainer. The unlock dialog
offers a destructive reset: after confirmation, it clears all saved encrypted
passwords and lets the user create a new master password. Account details
(service, username, link) are unaffected. The account passwords themselves
must be reset on each service's website.

## Security controls

- **End-to-end encryption:** the database, Supabase staff and dashboard, the
  service role, backups, and anyone holding a leaked row only ever see
  ciphertext.
- **Plaintext can't be written:** `toWritableRow` throws unless
  `passwordCiphertext` is a valid envelope, and the database's check
  constraint rejects anything else too. `assertNoSecretFields` still refuses
  a plain `password` field and PIN, token and recovery-code style fields.
- **RLS:** four owner-scoped policies (select/insert/update/delete) using
  `(select auth.uid()) = user_id`. `anon` has no privileges.
- **Ownership can't move:** `authenticated` gets `UPDATE` only on the account
  columns, so `id`, `user_id` and `created_at` aren't updatable. On insert,
  `user_id` comes from the session (`requireUserId()`), never from input.
- **Links:** only `https://` URLs with a dotted hostname and no embedded
  credentials are accepted. They are re-checked at render time and open with
  `rel="noopener noreferrer"`.
- **Platform logos without third parties:** card logos come from the bundled
  `simple-icons` package (CC0) via `lib/vault-brands.ts`, matched by service
  name, then website domain. They are inline SVG, so nothing is fetched and the
  list of services never leaks. Brands that simple-icons doesn't carry (for
  example OpenAI, Coupang, Canva) get a brand-colored badge; banks get a short
  label (KB, ABA, PPC, with approximate colors). Microsoft and LinkedIn are
  simple geometric marks drawn in `lib/vault-brands.ts`. Unknown services keep
  the category-tinted letter.
- **Public pages:** the My Apps card is static copy and never reads account
  data. A test asserts this.

### Remaining risks (accepted by the maintainer)

- **A compromised page means compromised passwords while unlocked.** Because
  decryption happens in the browser, an XSS bug or a malicious npm dependency
  running in the page could read passwords during an unlocked session, or
  capture the master password as it's typed. Encryption protects the data at
  rest and on the server, not a compromised client. Keep dependencies lean
  and audited; the 10-minute auto-lock limits the window.
- **A weak master password.** Leaked ciphertext can be attacked offline.
  PBKDF2 slows guessing, but a short or reused master password is still weak.
  Use a long, unique passphrase.
- **No autofill, breach alerts, 2FA or sharing.** A dedicated password manager
  provides these features.
- **Clipboard:** other apps can read the clipboard during the 30-second
  window. The wipe is unconditional, so it may also clear something copied
  afterwards.

## Demo mode vs live

`NEXT_PUBLIC_FEATURE_VAULT_LIVE` (`lib/feature-flags.ts`):

- **unset / not `"true"` (default):** `demoVaultAdapter` keeps accounts in this
  browser's localStorage under `hengo-vault-demo-accounts`. Supabase is never
  called. Passwords saved in demo mode are encrypted the same way, so only
  envelopes are written to localStorage. "Restore sample data" resets it.
- **`"true"`:** `supabaseVaultAdapter` reads and writes `kori_vault_accounts`.
  Enable it **only after** the migration is applied.

### Going live (needs the maintainer's approval)

1. Review `supabase/migrations/20261023000000_vault_accounts.sql`.
2. Run `supabase/tests/vault_accounts_rls.sql` against a local stack or a
   Supabase branch (it is rolled back and uses fictional users). It should end
   with `ALL PASSED`.
3. Apply the migration to the shared project (it only creates the new table).
4. Set `NEXT_PUBLIC_FEATURE_VAULT_LIVE=true` in `.env.local` and in Vercel, then
   redeploy.

Passwords added in demo mode stay in that browser and are not migrated to the
live table. Re-enter them after going live.

## Importing from Notion (CSV, in the browser)

**Import CSV** on `/vault` (`components/vault/VaultImportDialog.tsx`, parsing
and mapping in `lib/vault-import.ts`). No AI tool or server ever sees the
file: it is read in the browser, every row is reviewed, and passwords are
encrypted with the master password before anything is saved.

1. In Notion: open the database → **•••** → **Export** → **Markdown & CSV**,
   then unzip the download.
2. In H-Vault: **Import CSV** → choose the `.csv` file.
3. Review the rows. Rows that match an existing account (same service +
   username, case-insensitive) or an earlier row are flagged and unselected.
4. Click **Import N accounts**, then unlock (or create) the master password
   if any selected row has a password.
5. Delete the CSV file afterwards (it contains plain passwords). Once the
   import is verified, remove the Password column from Notion.

| CSV column (case-insensitive aliases)       | H-Vault                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| Service / Name / Platform (else 1st column) | `service_name`                                              |
| Username / Email / Login / ID               | `login_identifier`                                          |
| Label / Type / Profile                      | `account_label`                                             |
| Website / URL / Link                        | `website_url`, only if it's a safe https:// link            |
| Category                                    | mapped by keyword to the ten built-ins, otherwise Other     |
| Status                                      | mapped to active / needs_review / inactive (default active) |
| Password                                    | encrypted in the browser → `password_ciphertext`            |
| Notes, Last Updated, Next Rotation, others  | **not imported** (listed as "Not imported" during review)   |

Every imported account is tagged `#imported`. Limits: 1 MB and 500 rows per
file. Import runs row by row, so a failed row is reported without losing the
others.

## Known gaps / next steps

- Live persistence waits on migration approval.
- Changing the master password isn't supported yet (it would mean
  re-encrypting every envelope).
- No export (import is CSV only).
- Search is client-side, which is fine at ~100 rows.
- Possible later additions: a password generator, a "password last changed"
  date, custom categories, `?account=` deep links.
