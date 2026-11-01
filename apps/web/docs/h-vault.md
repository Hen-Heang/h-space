# H-Vault — private account directory

_Implemented 2026-10-23 (demo). Rebuilt 2026-11-01 for the hspace-api backend
with the v2 key hierarchy (h-space-api `docs/vault-design.md`). Status: works
end to end against hspace-api behind `NEXT_PUBLIC_FEATURE_VAULT_LIVE`; stays
on the browser-local demo until the independent security review (design
§9–10) — **no real passwords before that**._

H-Vault answers "which account do I use for this service?". It organizes
accounts by category, supports several accounts per service (GitHub ·
Personal / Secondary), favorites, search, filters and sorting, and opens each
service's login page. Each account can also hold an **optional password**.
With hspace-api the **whole vault is end-to-end encrypted in the browser**
and synced to every device; the server stores ciphertext only.

## Where it lives

| Piece                          | Path                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| Route (authenticated shell)    | `app/(main)/vault/page.tsx` → `/vault`                                                        |
| Nav entry (My Apps workspace)  | `vaultItem` in `lib/navigation.ts`                                                            |
| Public catalog card (generic)  | `h-vault` in `lib/projects.ts`, rendered by `components/home/MyAppsSection.tsx` (also on `/`) |
| Domain types, rules, filtering | `lib/vault.ts` (+ `lib/vault.test.ts`)                                                        |
| Encryption (v2 key hierarchy)  | `lib/vault-crypto.ts` (+ `lib/vault-crypto.test.ts`)                                          |
| CSV import (e.g. Notion)       | `lib/vault-import.ts` (+ test), `components/vault/VaultImportDialog.tsx`                      |
| Unlock state (memory only)     | `lib/vault-session.ts`                                                                        |
| Fictional sample data          | `lib/vault-demo.ts` — `example.com` / `example.org` identifiers, no passwords                 |
| Data access                    | `lib/api/vault.ts` (+ test) — `vaultApi`, hspace-api + demo backends                          |
| Query hooks                    | `hooks/useVault.ts` (+ test)                                                                  |
| UI                             | `components/vault/*` — dashboard, setup/unlock/recovery, change password, form, details, …    |
| Content-Security-Policy        | `lib/csp.ts` (+ test), applied in `next.config.ts`                                            |
| Server (owner of the data)     | h-space-api `hub-api`, `/api/hub/vault` — tables `vault_keysets`, `vault_items` (Neon)        |
| E2E (signed-out surface)       | `tests/e2e/vault.e2e.ts`                                                                      |

The old Supabase design (`kori_vault_accounts`) was never applied and has
been removed; Supabase never holds vault data.

## How the encryption works (v2)

1. **Setup.** The user creates a master password (≥ 12 characters, typed
   twice). The browser makes a random 256-bit **vault key** and a random
   256-bit **recovery key**, and wraps the vault key twice with AES-256-GCM:
   under a key derived from the master password (PBKDF2-SHA256, 600,000
   iterations, random salt) and under one derived from the recovery key
   (HKDF-SHA256). Only the two wrapped keys and the public KDF settings are
   saved (the **keyset**). The recovery key is shown **once**, to print or
   write down; the dialog can't be closed until the user confirms it's saved.
2. **Unlock.** The master password unwraps the vault key; a wrong one fails
   AES-GCM's tag check. The vault key is imported **non-extractable** and
   held only in tab memory (`lib/vault-session.ts`): dropped on **Lock
   vault**, on reload, after **10 minutes** of inactivity, and on reset.
3. **Items.** Each account is serialized, padded to a multiple of 256 bytes,
   and encrypted under the vault key as one `v2.<iv>.<ciphertext>` envelope.
   Its password is a separate envelope inside it, so loading the list never
   puts plaintext passwords in memory. Every envelope's associated data binds
   it to the **user and the account id**: a server that swaps envelopes
   between rows or users makes decryption fail instead of showing the wrong
   password under an account. Ids are chosen in the browser before
   encrypting.
4. **Recovery.** Forgot the master password: the recovery key unwraps the
   vault key and the user picks a new master password. Nothing is lost.
5. **Change master password.** Unwrap with the old one, re-wrap with the new
   one, save the keyset. Instant, whatever the number of accounts; the
   recovery key keeps working.
6. **Reset.** Lost both: reset deletes the keyset and everything only it
   could read (hspace-api: every account; demo: saved passwords).
7. **Use.** _Copy password_ decrypts and copies, and the clipboard is cleared
   after 30 seconds. _Reveal_ shows it for 30 seconds or until the dialog
   closes. A saved password is never decrypted back into the edit form.

## Security controls

- **Server sees ciphertext only** (hspace-api): requests carry an id and an
  envelope, nothing readable (a request-capture test checks this). The
  server validates envelope shapes and rejects unknown fields.
- **MFA required:** hspace-api refuses vault calls from accounts without
  authenticator-app MFA (403, code 40301); the page then links to
  `/settings/security`.
- **Ownership on the server:** the user comes from the JWT; another user's
  item is 404. A key unlocked by one user is never used for another
  (`currentVaultKey`).
- **Unlock-gated list:** with hspace-api the list query only runs while
  unlocked, and the decrypted list is removed from the query cache the moment
  the vault locks.
- **Plaintext can't be written:** `pickInput` throws unless
  `passwordCiphertext` is a v2 envelope; `assertNoSecretFields` refuses a
  plain `password` field and PIN, token and recovery-code style fields.
- **Sync conflicts:** every save sends the version it was read at; a newer
  save from another device fails with 409 instead of being overwritten.
- **Content-Security-Policy** (`lib/csp.ts`): `connect-src` limits where the
  page can send data to the services it uses; the only third-party script is
  Google sign-in; no framing, plugins, or foreign form posts. Inline scripts
  are still allowed (Next.js bootstrap) until nonces are added.
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

### Remaining risks

- **A compromised page means a compromised vault while unlocked.** Decryption
  happens in the browser, so an XSS bug or a malicious npm dependency running
  in the page could read the vault during an unlocked session, or capture the
  master password as it's typed. The CSP narrows what such code can do; the
  10-minute auto-lock limits the window. Keep dependencies lean and audited.
- **A weak master password.** Leaked ciphertext can be attacked offline.
  PBKDF2 slows guessing, but a short or reused master password is still weak.
- **The recovery key is as powerful as the master password.** Anyone holding
  it can open the vault. Keep it offline.
- **No autofill, breach alerts or sharing.** A dedicated password manager
  provides these features.
- **Clipboard:** other apps can read the clipboard during the 30-second
  window. The wipe is unconditional, so it may also clear something copied
  afterwards.

## Demo mode vs live

`NEXT_PUBLIC_FEATURE_VAULT_LIVE` (`lib/feature-flags.ts`):

- **unset / not `"true"` (default):** the demo backend keeps fictional
  accounts in this browser's localStorage (`hengo-vault-demo-accounts`, keyset
  in `hengo-vault-demo-keyset`). The server is never called. The list is
  readable without unlocking (it's sample data); saved passwords use the same
  v2 keyset and envelopes. "Restore sample data" resets the accounts.
- **`"true"`:** the hspace-api backend (`/api/hub/vault` on
  `NEXT_PUBLIC_HSPACE_API_URL`, defaulting to the auth API's URL). The list
  appears only after unlocking.

### Going live (needs the maintainer's approval)

1. Independent security review of the design and this code (h-space-api
   `docs/vault-design.md` §9); fix findings.
2. Deploy hub-api next to security-api (Caddy routes `/api/hub/*` to it).
3. Test end to end with fictional entries, including a restore drill.
4. Set `NEXT_PUBLIC_FEATURE_VAULT_LIVE=true` in Vercel and redeploy.

Demo data stays in its browser and isn't migrated.

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

- Live use waits on the security review (above).
- Rotating the recovery key (a new one, replacing the old wrap) isn't in the
  UI yet.
- CSP nonces instead of `'unsafe-inline'` for scripts.
- No export (import is CSV only).
- Search is client-side, which is fine at ~100 rows.
