import "server-only";
import { sql } from "@/lib/db";

export async function findRecentRate(
  baseCurrency: string,
  targetCurrency: string,
  cacheMinutes: number
): Promise<{ rate: number; fetchedAt: string } | null> {
  const rows = (await sql`
    select rate, fetched_at from finance_exchange_rates
    where base_currency = ${baseCurrency} and target_currency = ${targetCurrency}
      and fetched_at >= now() - (${cacheMinutes} * interval '1 minute')
    order by fetched_at desc
    limit 1
  `) as { rate: string; fetched_at: string }[];

  return rows[0] ? { rate: Number(rows[0].rate), fetchedAt: rows[0].fetched_at } : null;
}

export async function insertRate(baseCurrency: string, targetCurrency: string, rate: number, fetchedAt: string): Promise<void> {
  await sql`
    insert into finance_exchange_rates (base_currency, target_currency, rate, fetched_at)
    values (${baseCurrency}, ${targetCurrency}, ${rate}, ${fetchedAt})
  `;
}

// The last rate recorded on or before `date` (YYYY-MM-DD, Asia/Seoul) — what a
// back-dated entry should be converted at. Rates are kept indefinitely, so this
// reaches back as far as Luyra has been fetching them.
export async function findRateOnOrBefore(
  baseCurrency: string,
  targetCurrency: string,
  date: string
): Promise<{ rate: number; fetchedAt: string } | null> {
  const rows = (await sql`
    select rate, fetched_at from finance_exchange_rates
    where base_currency = ${baseCurrency} and target_currency = ${targetCurrency}
      and fetched_at < ((${date}::date + 1)::timestamp at time zone 'Asia/Seoul')
    order by fetched_at desc
    limit 1
  `) as { rate: string; fetched_at: string }[];

  return rows[0] ? { rate: Number(rows[0].rate), fetchedAt: rows[0].fetched_at } : null;
}

// Most recent stored rate regardless of age — the stale fallback used when the
// live provider is slow or unavailable.
export async function findLatestRate(
  baseCurrency: string,
  targetCurrency: string
): Promise<{ rate: number; fetchedAt: string } | null> {
  const rows = (await sql`
    select rate, fetched_at from finance_exchange_rates
    where base_currency = ${baseCurrency} and target_currency = ${targetCurrency}
    order by fetched_at desc
    limit 1
  `) as { rate: string; fetched_at: string }[];

  return rows[0] ? { rate: Number(rows[0].rate), fetchedAt: rows[0].fetched_at } : null;
}
