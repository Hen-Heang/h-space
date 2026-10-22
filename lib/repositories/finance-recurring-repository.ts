import "server-only";
import { sql } from "@/lib/db";
import type { Currency, RecurringFrequency, RecurringRule, TransactionType } from "@/types/finance";

interface RecurringRow {
  id: string;
  user_id: string;
  type: string;
  description: string;
  currency: string;
  amount_krw: string;
  amount_usd: string | null;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  payment_method_id: string | null;
  payment_method_name: string | null;
  note: string | null;
  frequency: string;
  anchor_day: number;
  next_date: string;
  last_applied: string | null;
  is_active: boolean;
  created_at: string;
}

function toRule(row: RecurringRow): RecurringRule {
  return {
    id: row.id,
    type: row.type as TransactionType,
    description: row.description,
    currency: row.currency as Currency,
    amountKrw: Number(row.amount_krw),
    originalAmount: row.amount_usd !== null ? Number(row.amount_usd) : null,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    paymentMethodId: row.payment_method_id,
    paymentMethodName: row.payment_method_name,
    note: row.note,
    frequency: row.frequency as RecurringFrequency,
    anchorDay: row.anchor_day,
    nextDate: row.next_date,
    lastApplied: row.last_applied,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

const RULE_SELECT = `
  r.id, r.user_id, r.type, r.description, r.currency, r.amount_krw, r.amount_usd,
  r.category_id, c.name as category_name, c.icon as category_icon, c.color as category_color,
  r.payment_method_id, pm.name as payment_method_name, r.note, r.frequency, r.anchor_day,
  to_char(r.next_date, 'YYYY-MM-DD') as next_date, to_char(r.last_applied, 'YYYY-MM-DD') as last_applied,
  r.is_active, r.created_at
`;
const RULE_FROM = `
  from finance_recurring_transactions r
  left join finance_categories c on c.id = r.category_id
  left join finance_payment_methods pm on pm.id = r.payment_method_id
`;

/** A rule's stored fields, already resolved: KRW computed for a USD rule. */
export interface RecurringRuleWrite {
  type: TransactionType;
  description: string;
  currency: Currency;
  amountKrw: number;
  originalAmount: number | null;
  exchangeRate: number | null;
  categoryId: string | null;
  paymentMethodId: string | null;
  note: string | null;
  frequency: RecurringFrequency;
  anchorDay: number;
  nextDate: string;
  isActive: boolean;
}

export async function findRulesByUser(userId: string): Promise<RecurringRule[]> {
  const rows = (await sql.query(
    `select ${RULE_SELECT} ${RULE_FROM} where r.user_id = $1 order by r.is_active desc, r.next_date asc, r.created_at asc`,
    [userId]
  )) as RecurringRow[];
  return rows.map(toRule);
}

export async function findRuleById(id: string, userId: string): Promise<RecurringRule | null> {
  const rows = (await sql.query(`select ${RULE_SELECT} ${RULE_FROM} where r.id = $1 and r.user_id = $2`, [
    id,
    userId,
  ])) as RecurringRow[];
  return rows[0] ? toRule(rows[0]) : null;
}

export async function createRule(userId: string, input: RecurringRuleWrite): Promise<RecurringRule> {
  const rows = (await sql`
    insert into finance_recurring_transactions (
      user_id, type, description, currency, amount_krw, amount_usd, exchange_rate,
      category_id, payment_method_id, note, frequency, anchor_day, next_date, is_active
    )
    values (
      ${userId}, ${input.type}, ${input.description}, ${input.currency}, ${input.amountKrw},
      ${input.originalAmount}, ${input.exchangeRate}, ${input.categoryId}, ${input.paymentMethodId},
      ${input.note}, ${input.frequency}, ${input.anchorDay}, ${input.nextDate}, ${input.isActive}
    )
    returning id
  `) as { id: string }[];

  const created = await findRuleById(rows[0].id, userId);
  if (!created) throw new Error("Failed to load the recurring rule just created");
  return created;
}

export async function updateRule(id: string, userId: string, input: RecurringRuleWrite): Promise<RecurringRule | null> {
  const rows = (await sql`
    update finance_recurring_transactions set
      type = ${input.type},
      description = ${input.description},
      currency = ${input.currency},
      amount_krw = ${input.amountKrw},
      amount_usd = ${input.originalAmount},
      exchange_rate = ${input.exchangeRate},
      category_id = ${input.categoryId},
      payment_method_id = ${input.paymentMethodId},
      note = ${input.note},
      frequency = ${input.frequency},
      anchor_day = ${input.anchorDay},
      next_date = ${input.nextDate},
      is_active = ${input.isActive}
    where id = ${id} and user_id = ${userId}
    returning id
  `) as { id: string }[];

  if (!rows[0]) return null;
  return findRuleById(id, userId);
}

/** Transactions the rule already created keep existing (recurring_id → NULL, see 014). */
export async function deleteRule(id: string, userId: string): Promise<boolean> {
  const rows = (await sql`
    delete from finance_recurring_transactions where id = ${id} and user_id = ${userId} returning id
  `) as { id: string }[];
  return rows.length > 0;
}

/** Active rules due on or before `today`, for one user or (cron) for everyone. */
export async function findDueRules(today: string, userId?: string): Promise<(RecurringRule & { userId: string })[]> {
  const rows = (await sql.query(
    `select ${RULE_SELECT} ${RULE_FROM}
     where r.is_active and r.next_date <= $1 ${userId ? "and r.user_id = $2" : ""}
     order by r.user_id, r.next_date`,
    userId ? [today, userId] : [today]
  )) as RecurringRow[];
  return rows.map((row) => ({ ...toRule(row), userId: row.user_id }));
}

export interface OccurrenceAmounts {
  amountKrw: number;
  originalAmount: number | null;
  exchangeRate: number | null;
}

/**
 * Creates the rule's due occurrences and advances it, in one transaction.
 *
 * Two guards make this safe to run twice, concurrently, or after a crash:
 * each insert hits the unique (recurring_id, date) index with ON CONFLICT
 * DO NOTHING, so an occurrence can exist at most once; and next_date only
 * moves if it still holds the value this run read, so a slower overlapping
 * run can't drag it backwards. Returns the dates actually inserted.
 */
export async function applyOccurrences(
  rule: RecurringRule & { userId: string },
  dates: string[],
  newNextDate: string,
  amounts: OccurrenceAmounts
): Promise<string[]> {
  if (dates.length === 0) return [];

  const results = (await sql.transaction([
    ...dates.map(
      (date) => sql`
        insert into finance_transactions (
          user_id, recurring_id, date, type, category_id, description, amount_krw, currency,
          amount_usd, exchange_rate, payment_method_id, note
        )
        values (
          ${rule.userId}, ${rule.id}, ${date}, ${rule.type}, ${rule.categoryId}, ${rule.description},
          ${amounts.amountKrw}, ${rule.currency}, ${amounts.originalAmount}, ${amounts.exchangeRate},
          ${rule.paymentMethodId}, ${rule.note}
        )
        on conflict (recurring_id, date) where recurring_id is not null do nothing
        returning to_char(date, 'YYYY-MM-DD') as date
      `
    ),
    sql`
      update finance_recurring_transactions
      set next_date = ${newNextDate}, last_applied = ${dates[dates.length - 1]}
      where id = ${rule.id} and next_date = ${rule.nextDate}
    `,
  ])) as { date: string }[][];

  return results.slice(0, dates.length).flatMap((rows) => rows.map((row) => row.date));
}
