import "server-only"

import { vaultSql } from "@/lib/server/vault/db"
import { vaultErrors } from "@/lib/server/vault/http"
import {
  MAX_ITEMS_PER_USER,
  type ItemCreateInput,
  type ItemUpdateInput,
  type KeysetInput,
} from "@/lib/server/vault/validation"

// H-Vault storage over Neon, a port of hub-api's VaultServiceImpl onto the
// same tables (h-space-api hub-api db/hub-migration V1__vault.sql). The rules
// are unchanged:
//   - every query is scoped by the verified user id (requireVaultUser);
//     another user's item is "not found", never "forbidden";
//   - writes carry the version they were read at; a newer save elsewhere is
//     a 409, never an overwrite;
//   - item ids are unique across all users, and a clash gets the same answer
//     whoever owns the other row, so ids can't probe other vaults;
//   - a new keyset can't be created over existing items (they'd be
//     unreadable) — only reset removes both;
//   - each change writes its audit_logs row in the same statement
//     (a data-modifying CTE), with ids only — never ciphertext.
// The server stores and returns ciphertext; it never decrypts anything.

export interface KeysetRecord {
  kdf: string
  kdfIterations: number
  kdfSalt: string
  wrappedKey: string
  recoveryWrappedKey: string
  createdAt: string
  updatedAt: string
  version: number
}

export interface ItemRecord {
  id: string
  payloadCiphertext: string
  createdAt: string
  updatedAt: string
  version: number
}

type Row = Record<string, unknown>

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString()
}

function toKeyset(row: Row): KeysetRecord {
  return {
    kdf: String(row.kdf),
    kdfIterations: Number(row.kdf_iterations),
    kdfSalt: String(row.kdf_salt),
    wrappedKey: String(row.wrapped_key),
    recoveryWrappedKey: String(row.recovery_wrapped_key),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    version: Number(row.version),
  }
}

function toItem(row: Row): ItemRecord {
  return {
    id: String(row.id),
    payloadCiphertext: String(row.payload_ciphertext),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    version: Number(row.version),
  }
}

const CHANGED_ELSEWHERE = "The vault was changed on another device. Reload and try again."

/**
 * Keyset replacements plus resets allowed per user per rolling hour. Counted
 * from this user's own audit_logs rows inside the same statement as the
 * write, so Vercel's separate function instances share the limit with no
 * extra store. Two requests at the very same instant could both pass the
 * count; that's an accepted edge for a cap this size. Needs `vault_app` to
 * read audit_logs (user_id, event_type, created_at) — docs/SPRING_EXIT_PLAN.md.
 */
export const MAX_DESTRUCTIVE_PER_HOUR = 5

export async function getKeyset(userId: string): Promise<KeysetRecord> {
  const sql = vaultSql()
  const rows = (await sql`
    select kdf, kdf_iterations, kdf_salt, wrapped_key, recovery_wrapped_key,
           created_at, updated_at, version
    from vault_keysets
    where user_id = ${userId}::uuid
  `) as Row[]
  if (rows.length === 0) throw vaultErrors.notFound("Vault keyset")
  return toKeyset(rows[0])
}

export async function saveKeyset(userId: string, input: KeysetInput): Promise<KeysetRecord> {
  const sql = vaultSql()

  if (input.version === undefined) {
    // Create. Refused when a keyset already exists (another device got there
    // first) or when items remain from an earlier keyset.
    const rows = (await sql`
      with inserted as (
        insert into vault_keysets
          (user_id, kdf, kdf_iterations, kdf_salt, wrapped_key, recovery_wrapped_key,
           created_at, updated_at, version)
        select ${userId}::uuid, ${input.kdf}::text, ${input.kdfIterations}::int,
               ${input.kdfSalt}::text, ${input.wrappedKey}::text,
               ${input.recoveryWrappedKey}::text, now(), now(), 0
        where not exists (select 1 from vault_items where user_id = ${userId}::uuid)
        on conflict (user_id) do nothing
        returning *
      ), audit as (
        insert into audit_logs (id, event_type, user_id, created_at)
        select gen_random_uuid(), 'VAULT_KEYSET_CREATED', user_id, now() from inserted
      )
      select * from inserted
    `) as Row[]
    if (rows.length > 0) return toKeyset(rows[0])

    const state = (await sql`
      select exists (select 1 from vault_keysets where user_id = ${userId}::uuid) as has_keyset
    `) as Row[]
    if (state[0]?.has_keyset) throw vaultErrors.conflict(CHANGED_ELSEWHERE)
    throw vaultErrors.conflict("Reset the vault before creating a new one.")
  }

  // Replace (change master password, recovery): only from the version read,
  // and only while under the hourly cap.
  const rows = (await sql`
    with updated as (
      update vault_keysets
      set kdf = ${input.kdf},
          kdf_iterations = ${input.kdfIterations},
          kdf_salt = ${input.kdfSalt},
          wrapped_key = ${input.wrappedKey},
          recovery_wrapped_key = ${input.recoveryWrappedKey},
          updated_at = now(),
          version = version + 1
      where user_id = ${userId}::uuid and version = ${input.version}::bigint
        and (select count(*) from audit_logs
             where user_id = ${userId}::uuid
               and event_type in ('VAULT_KEYSET_CHANGED', 'VAULT_RESET')
               and created_at > now() - interval '1 hour') < ${MAX_DESTRUCTIVE_PER_HOUR}
      returning *
    ), audit as (
      insert into audit_logs (id, event_type, user_id, created_at)
      select gen_random_uuid(), 'VAULT_KEYSET_CHANGED', user_id, now() from updated
    )
    select * from updated
  `) as Row[]
  if (rows.length > 0) return toKeyset(rows[0])

  const state = (await sql`
    select exists (select 1 from vault_keysets where user_id = ${userId}::uuid) as has_keyset,
           (select count(*) from audit_logs
            where user_id = ${userId}::uuid
              and event_type in ('VAULT_KEYSET_CHANGED', 'VAULT_RESET')
              and created_at > now() - interval '1 hour')::int as recent
  `) as Row[]
  if (!state[0]?.has_keyset) {
    throw vaultErrors.conflict("Vault isn't set up yet; create it without a version.")
  }
  if (Number(state[0]?.recent ?? 0) >= MAX_DESTRUCTIVE_PER_HOUR) throw vaultErrors.rateLimited()
  throw vaultErrors.conflict(CHANGED_ELSEWHERE)
}

/**
 * Deletes every item and the keyset in one statement; returns how many items
 * went. Under the hourly cap only — otherwise nothing is deleted or audited
 * and it throws 429.
 */
export async function resetVault(userId: string): Promise<number> {
  const sql = vaultSql()
  const rows = (await sql`
    with allowed as (
      select (select count(*) from audit_logs
              where user_id = ${userId}::uuid
                and event_type in ('VAULT_KEYSET_CHANGED', 'VAULT_RESET')
                and created_at > now() - interval '1 hour') < ${MAX_DESTRUCTIVE_PER_HOUR} as ok
    ), deleted_items as (
      delete from vault_items
      where user_id = ${userId}::uuid and (select ok from allowed)
      returning id
    ), deleted_keyset as (
      delete from vault_keysets
      where user_id = ${userId}::uuid and (select ok from allowed)
      returning user_id
    ), audit as (
      insert into audit_logs (id, event_type, user_id, details, created_at)
      select gen_random_uuid(), 'VAULT_RESET', ${userId}::uuid,
             'items=' || (select count(*) from deleted_items), now()
      where (select ok from allowed)
    )
    select (select ok from allowed) as allowed,
           (select count(*) from deleted_items)::int as items
  `) as Row[]
  if (rows[0]?.allowed === false) throw vaultErrors.rateLimited()
  return Number(rows[0]?.items ?? 0)
}

export async function listItems(userId: string): Promise<ItemRecord[]> {
  const sql = vaultSql()
  const rows = (await sql`
    select id, payload_ciphertext, created_at, updated_at, version
    from vault_items
    where user_id = ${userId}::uuid
    order by updated_at desc
  `) as Row[]
  return rows.map(toItem)
}

export async function createItem(userId: string, input: ItemCreateInput): Promise<ItemRecord> {
  const sql = vaultSql()
  const rows = (await sql`
    with inserted as (
      insert into vault_items (id, user_id, payload_ciphertext, created_at, updated_at, version)
      select ${input.id}::uuid, ${userId}::uuid, ${input.payloadCiphertext}::text, now(), now(), 0
      where exists (select 1 from vault_keysets where user_id = ${userId}::uuid)
        and (select count(*) from vault_items where user_id = ${userId}::uuid) < ${MAX_ITEMS_PER_USER}
      on conflict (id) do nothing
      returning *
    ), audit as (
      insert into audit_logs (id, event_type, user_id, details, created_at)
      select gen_random_uuid(), 'VAULT_ITEM_CREATED', user_id, 'item=' || id, now() from inserted
    )
    select * from inserted
  `) as Row[]
  if (rows.length > 0) return toItem(rows[0])

  const state = (await sql`
    select exists (select 1 from vault_keysets where user_id = ${userId}::uuid) as has_keyset,
           (select count(*) from vault_items where user_id = ${userId}::uuid)::int as items
  `) as Row[]
  if (!state[0]?.has_keyset) throw vaultErrors.conflict("Set up the vault before adding items.")
  if (Number(state[0]?.items ?? 0) >= MAX_ITEMS_PER_USER) {
    throw vaultErrors.conflict(`The vault is full (${MAX_ITEMS_PER_USER} items).`)
  }
  // Same answer whether the existing id is this user's or someone else's.
  throw vaultErrors.conflict("An item with this id already exists.")
}

export async function updateItem(
  userId: string,
  itemId: string,
  input: ItemUpdateInput,
): Promise<ItemRecord> {
  const sql = vaultSql()
  const rows = (await sql`
    with updated as (
      update vault_items
      set payload_ciphertext = ${input.payloadCiphertext},
          updated_at = now(),
          version = version + 1
      where id = ${itemId}::uuid and user_id = ${userId}::uuid and version = ${input.version}::bigint
      returning *
    ), audit as (
      insert into audit_logs (id, event_type, user_id, details, created_at)
      select gen_random_uuid(), 'VAULT_ITEM_UPDATED', user_id, 'item=' || id, now() from updated
    )
    select * from updated
  `) as Row[]
  if (rows.length > 0) return toItem(rows[0])

  const state = (await sql`
    select exists (
      select 1 from vault_items where id = ${itemId}::uuid and user_id = ${userId}::uuid
    ) as owned
  `) as Row[]
  if (!state[0]?.owned) throw vaultErrors.notFound("Vault item")
  throw vaultErrors.conflict("This item was changed on another device. Reload and try again.")
}

export async function deleteItem(userId: string, itemId: string): Promise<void> {
  const sql = vaultSql()
  const rows = (await sql`
    with deleted as (
      delete from vault_items where id = ${itemId}::uuid and user_id = ${userId}::uuid
      returning id, user_id
    ), audit as (
      insert into audit_logs (id, event_type, user_id, details, created_at)
      select gen_random_uuid(), 'VAULT_ITEM_DELETED', user_id, 'item=' || id, now() from deleted
    )
    select id from deleted
  `) as Row[]
  if (rows.length === 0) throw vaultErrors.notFound("Vault item")
}
