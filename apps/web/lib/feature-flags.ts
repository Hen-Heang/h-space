// Minimal, single-purpose feature-flag helper — env-driven, no runtime
// toggle/admin override. Add another `isXEnabled()` export here if a second
// flag is ever needed; don't generalize into a registry until there's a
// second real case.

/**
 * The Integrations settings section (/settings/integrations) and its Google
 * Calendar card. Off by default until Plan ships.
 *
 * The card's whole value proposition is showing your real calendar beside
 * Hengo tasks — but Tasks and Calendar live in the Plan section, and V2's
 * five-item nav had no entry for it. Asking for third-party calendar access
 * to populate a page with no front door is a bad trade, so the section is
 * hidden rather than removed. Plan now has a nav entry (the hub nav's Goals
 * tab and desktop sidebar section, 2026-10-22), so turning this on is now an
 * open product decision rather than blocked.
 *
 * Hiding never strands an existing connection: the page still renders for a
 * learner who is already connected, so "Disconnect" is always reachable.
 */
export const isCalendarIntegrationsEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_FEATURE_INTEGRATIONS === "true"

/**
 * H-Vault synced through hspace-api (`/api/hub/vault`, docs/h-vault.md). Off
 * by default: until the independent security review of the vault design
 * (h-space-api docs/vault-design.md §9) is done and hub-api is deployed,
 * `/vault` runs on the browser-local demo backend with fictional data.
 */
export const isVaultLiveEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_FEATURE_VAULT_LIVE === "true"

/**
 * Quick Capture Inbox reads and writes hspace-api (Spring) instead of
 * Supabase's `kori_inbox_items` — the first area moved off Supabase
 * (h-space-api docs/spring-migration-plan.md, Phase 1). Off by default; turn
 * on only after the inbox rows have been copied across. Turning it back off
 * is the rollback: the copy leaves the Supabase table untouched.
 *
 * While on, new reminders can't be set on inbox items: the reminder
 * dispatcher only checks `kori_inbox_items`, so it would cancel them
 * (remindersApi.create refuses; existing reminders stay manageable, and
 * deleting an item cancels its reminders).
 */
export const isSpringInboxEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_DATA_SOURCE_INBOX === "spring"
