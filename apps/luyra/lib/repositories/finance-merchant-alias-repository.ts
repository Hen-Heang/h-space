import "server-only";
import { sql } from "@/lib/db";
import type { MerchantAlias, MerchantExpense } from "@/lib/finance/merchant-names";

// finance_transaction_description_aliases (004_finance.sql): one row per
// merged variant, mapping its normalized key to the confirmed canonical name.
// Transactions are never rewritten; grouping resolves keys through this table.

export interface StoredMerchantAlias extends MerchantAlias {
  /** The spelling recorded for this variant when it was merged. */
  variantDescription: string;
}

export async function findMerchantAliases(userId: string): Promise<StoredMerchantAlias[]> {
  const rows = (await sql`
    select normalized_key, canonical_description, variant_description
    from finance_transaction_description_aliases
    where user_id = ${userId}
    order by canonical_description, normalized_key
  `) as { normalized_key: string; canonical_description: string; variant_description: string }[];
  return rows.map((row) => ({
    normalizedKey: row.normalized_key,
    canonicalDescription: row.canonical_description,
    variantDescription: row.variant_description,
  }));
}

/**
 * Points every given key at `canonical`, replacing any earlier merge those
 * keys were part of. The table has no unique constraint, so this deletes and
 * inserts in one transaction rather than relying on ON CONFLICT.
 */
export async function saveMerchantMerge(
  userId: string,
  canonical: string,
  members: { normalizedKey: string; sample: string }[]
): Promise<void> {
  const keys = members.map((member) => member.normalizedKey);
  await sql.transaction([
    sql`
      delete from finance_transaction_description_aliases
      where user_id = ${userId} and normalized_key = any(${keys}::text[])
    `,
    ...members.map(
      (member) => sql`
        insert into finance_transaction_description_aliases (user_id, canonical_description, variant_description, normalized_key)
        values (${userId}, ${canonical}, ${member.sample}, ${member.normalizedKey})
      `
    ),
  ]);
}

/** Undoes a merge: its variants go back to being grouped on their own. */
export async function deleteMerchantMerge(userId: string, canonical: string): Promise<number> {
  const rows = (await sql`
    delete from finance_transaction_description_aliases
    where user_id = ${userId} and canonical_description = ${canonical}
    returning id
  `) as { id: string }[];
  return rows.length;
}

/** Expenses since `since`, newest first — the input to merchant grouping and suggestions. */
export async function findExpensesSince(userId: string, since: string): Promise<MerchantExpense[]> {
  const rows = (await sql`
    select description, category_id, to_char(date, 'YYYY-MM-DD') as date, amount_krw
    from finance_transactions
    where user_id = ${userId} and type = 'expense' and date >= ${since}
      and description is not null and trim(description) <> ''
    order by date desc, created_at desc
  `) as { description: string; category_id: string | null; date: string; amount_krw: string }[];
  return rows.map((row) => ({
    description: row.description,
    categoryId: row.category_id,
    date: row.date,
    amountKrw: Number(row.amount_krw),
  }));
}
