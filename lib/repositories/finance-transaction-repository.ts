import "server-only";
import { sql } from "@/lib/db";
import type { CategoryAmount, Currency, PaymentMethodAmount, SpendingClass, Transaction, TransactionType } from "@/types/finance";
import type { TransactionSort } from "@/lib/validation/finance";

interface TransactionRow {
  id: string;
  date: string;
  type: string;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  description: string;
  amount_krw: string;
  currency: string;
  amount_usd: string | null;
  exchange_rate: string | null;
  payment_method_id: string | null;
  payment_method_name: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    type: row.type as TransactionType,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    description: row.description,
    amountKrw: Number(row.amount_krw),
    currency: row.currency as Currency,
    originalAmount: row.amount_usd !== null ? Number(row.amount_usd) : null,
    exchangeRate: row.exchange_rate !== null ? Number(row.exchange_rate) : null,
    paymentMethodId: row.payment_method_id,
    paymentMethodName: row.payment_method_name,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// This resolved shape is what the repository writes — the canonical amountKrw
// (and, for a USD entry, originalAmount/exchangeRate) are computed once in
// finance-transaction-service.ts, never here and never trusted from the client.
export interface ResolvedTransactionInput {
  date: string;
  type: TransactionType;
  categoryId?: string | null;
  description: string;
  amountKrw: number;
  currency: Currency;
  originalAmount: number | null;
  exchangeRate: number | null;
  paymentMethodId?: string | null;
  note?: string | null;
}

// date is cast to text explicitly, same reasoning as goals.target_date: the
// driver would otherwise parse it into a JS Date and re-encode it as a UTC
// instant, shifting the calendar date outside UTC.
const TRANSACTION_SELECT = `
  t.id, to_char(t.date, 'YYYY-MM-DD') as date, t.type, t.category_id,
  c.name as category_name, c.icon as category_icon, c.color as category_color,
  t.description, t.amount_krw, t.currency, t.amount_usd, t.exchange_rate,
  t.payment_method_id, pm.name as payment_method_name, t.note,
  t.created_at, t.updated_at
`;
const TRANSACTION_FROM = `
  from finance_transactions t
  left join finance_categories c on c.id = t.category_id
  left join finance_payment_methods pm on pm.id = t.payment_method_id
`;

const PAGE_SIZE = 20;

const SORT_CLAUSES: Record<TransactionSort, string> = {
  date_desc: "t.date desc, t.created_at desc",
  date_asc: "t.date asc, t.created_at asc",
  amount_desc: "t.amount_krw desc, t.date desc",
  amount_asc: "t.amount_krw asc, t.date desc",
};

export interface TransactionQuery {
  start: string;
  end: string;
  type?: TransactionType;
  categoryId?: string;
  paymentMethodId?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  sort?: TransactionSort;
  page: number;
}

export async function findTransactionsByUser(
  userId: string,
  query: TransactionQuery
): Promise<{ transactions: Transaction[]; hasMore: boolean }> {
  const conditions = ["t.user_id = $1", "t.date >= $2", "t.date < $3"];
  const params: unknown[] = [userId, query.start, query.end];

  if (query.type) {
    params.push(query.type);
    conditions.push(`t.type = $${params.length}`);
  }
  if (query.categoryId) {
    params.push(query.categoryId);
    conditions.push(`t.category_id = $${params.length}`);
  }
  if (query.paymentMethodId) {
    params.push(query.paymentMethodId);
    conditions.push(`t.payment_method_id = $${params.length}`);
  }
  if (query.amountMin !== undefined) {
    params.push(query.amountMin);
    conditions.push(`t.amount_krw >= $${params.length}`);
  }
  if (query.amountMax !== undefined) {
    params.push(query.amountMax);
    conditions.push(`t.amount_krw <= $${params.length}`);
  }
  if (query.search) {
    params.push(`%${query.search}%`);
    conditions.push(`t.description ilike $${params.length}`);
  }

  const orderBy = SORT_CLAUSES[query.sort ?? "date_desc"];
  params.push(PAGE_SIZE + 1, query.page * PAGE_SIZE);

  const rows = (await sql.query(
    `select ${TRANSACTION_SELECT} ${TRANSACTION_FROM}
     where ${conditions.join(" and ")}
     order by ${orderBy}
     limit $${params.length - 1} offset $${params.length}`,
    params
  )) as TransactionRow[];

  const hasMore = rows.length > PAGE_SIZE;
  return { transactions: rows.slice(0, PAGE_SIZE).map(toTransaction), hasMore };
}

export async function findTransactionById(id: string, userId: string): Promise<Transaction | null> {
  const rows = (await sql`
    select ${sql.unsafe(TRANSACTION_SELECT)} ${sql.unsafe(TRANSACTION_FROM)}
    where t.id = ${id} and t.user_id = ${userId}
  `) as TransactionRow[];

  return rows[0] ? toTransaction(rows[0]) : null;
}

export async function findRecentTransactionsByUser(
  userId: string,
  start: string,
  end: string,
  limit = 6
): Promise<Transaction[]> {
  const rows = (await sql.query(
    `select ${TRANSACTION_SELECT} ${TRANSACTION_FROM}
     where t.user_id = $1 and t.date >= $2 and t.date < $3
     order by t.date desc, t.created_at desc
     limit $4`,
    [userId, start, end, limit]
  )) as TransactionRow[];

  return rows.map(toTransaction);
}

// Unbounded, all-time fetch for data export — a personal finance app's full
// transaction history is small enough to hold in memory in one response.
export async function findAllTransactionsForExport(userId: string): Promise<Transaction[]> {
  const rows = (await sql`
    select ${sql.unsafe(TRANSACTION_SELECT)} ${sql.unsafe(TRANSACTION_FROM)}
    where t.user_id = ${userId}
    order by t.date desc, t.created_at desc
  `) as TransactionRow[];

  return rows.map(toTransaction);
}

export async function createTransaction(userId: string, input: ResolvedTransactionInput): Promise<Transaction> {
  const rows = (await sql`
    insert into finance_transactions (
      user_id, date, type, category_id, description, amount_krw, currency, amount_usd, exchange_rate,
      payment_method_id, note
    )
    values (
      ${userId}, ${input.date}, ${input.type}, ${input.categoryId ?? null},
      ${input.description}, ${input.amountKrw}, ${input.currency}, ${input.originalAmount}, ${input.exchangeRate},
      ${input.paymentMethodId ?? null}, ${input.note ?? null}
    )
    returning id
  `) as { id: string }[];

  const created = await findTransactionById(rows[0].id, userId);
  if (!created) throw new Error("Failed to load the transaction just created");
  return created;
}

export async function updateTransaction(
  id: string,
  userId: string,
  input: ResolvedTransactionInput
): Promise<Transaction | null> {
  const rows = (await sql`
    update finance_transactions set
      date = ${input.date},
      type = ${input.type},
      category_id = ${input.categoryId ?? null},
      description = ${input.description},
      amount_krw = ${input.amountKrw},
      currency = ${input.currency},
      amount_usd = ${input.originalAmount},
      exchange_rate = ${input.exchangeRate},
      payment_method_id = ${input.paymentMethodId ?? null},
      note = ${input.note ?? null},
      updated_at = now()
    where id = ${id} and user_id = ${userId}
    returning id
  `) as { id: string }[];

  if (!rows[0]) return null;
  return findTransactionById(id, userId);
}

export async function deleteTransaction(id: string, userId: string): Promise<boolean> {
  const rows = (await sql`
    delete from finance_transactions where id = ${id} and user_id = ${userId} returning id
  `) as { id: string }[];

  return rows.length > 0;
}

// Bulk actions. Every statement is scoped by user_id, so ids belonging to
// someone else (or already gone) are simply not matched; the returned count
// is what actually changed.

export async function findTransactionTypesByIds(userId: string, ids: string[]): Promise<TransactionType[]> {
  const rows = (await sql`
    select distinct type from finance_transactions where user_id = ${userId} and id = any(${ids}::uuid[])
  `) as { type: string }[];
  return rows.map((row) => row.type as TransactionType);
}

export async function deleteTransactionsByIds(userId: string, ids: string[]): Promise<number> {
  const rows = (await sql`
    delete from finance_transactions where user_id = ${userId} and id = any(${ids}::uuid[]) returning id
  `) as { id: string }[];
  return rows.length;
}

export async function setCategoryForTransactions(userId: string, ids: string[], categoryId: string | null): Promise<number> {
  const rows = (await sql`
    update finance_transactions set category_id = ${categoryId}, updated_at = now()
    where user_id = ${userId} and id = any(${ids}::uuid[])
    returning id
  `) as { id: string }[];
  return rows.length;
}

export interface DescriptionSuggestionRow {
  description: string;
  type: TransactionType;
  categoryId: string | null;
  paymentMethodId: string | null;
  uses: number;
}

/**
 * Past descriptions containing `query`, for autocomplete, ranked by how often
 * each was used with a prefix match counting triple: near-ties go to what
 * starts with the typed text, but a habit used 24 times still beats a one-off
 * that merely starts with the same letter. Recency breaks ties. The category
 * and payment method come from the most recent use. Only the last year
 * counts, so old one-offs don't crowd out current habits.
 */
export async function findDescriptionSuggestions(
  userId: string,
  query: string,
  type: TransactionType | undefined,
  limit: number
): Promise<DescriptionSuggestionRow[]> {
  const escaped = query.replace(/[\\%_]/g, (char) => `\\${char}`);
  const rows = (await sql`
    select description,
      (array_agg(type order by date desc, created_at desc))[1] as type,
      (array_agg(category_id order by date desc, created_at desc))[1] as category_id,
      (array_agg(payment_method_id order by date desc, created_at desc))[1] as payment_method_id,
      count(*)::int as uses
    from finance_transactions
    where user_id = ${userId}
      and description ilike ${`%${escaped}%`}
      and (${type ?? null}::text is null or type = ${type ?? null})
      and date >= current_date - 365
    group by description
    order by count(*) * (case when bool_or(description ilike ${`${escaped}%`}) then 3 else 1 end) desc,
      max(date) desc
    limit ${limit}
  `) as { description: string; type: string; category_id: string | null; payment_method_id: string | null; uses: number }[];

  return rows.map((row) => ({
    description: row.description,
    type: row.type as TransactionType,
    categoryId: row.category_id,
    paymentMethodId: row.payment_method_id,
    uses: row.uses,
  }));
}

export async function sumTotalsForRange(
  userId: string,
  start: string,
  end: string
): Promise<{
  incomeKrw: number;
  expenseKrw: number;
  count: number;
  incomeCount: number;
  expenseCount: number;
}> {
  const rows = (await sql`
    select
      coalesce(sum(amount_krw) filter (where type = 'income'), 0) as income_krw,
      coalesce(sum(amount_krw) filter (where type = 'expense'), 0) as expense_krw,
      count(*)::int as count,
      count(*) filter (where type = 'income')::int as income_count,
      count(*) filter (where type = 'expense')::int as expense_count
    from finance_transactions
    where user_id = ${userId} and date >= ${start} and date < ${end}
  `) as {
    income_krw: string;
    expense_krw: string;
    count: number;
    income_count: number;
    expense_count: number;
  }[];

  const row = rows[0];
  return {
    incomeKrw: Number(row.income_krw),
    expenseKrw: Number(row.expense_krw),
    count: row.count,
    incomeCount: row.income_count,
    expenseCount: row.expense_count,
  };
}

export async function sumExpenseByCategoryForRange(userId: string, start: string, end: string): Promise<CategoryAmount[]> {
  const rows = (await sql`
    select t.category_id, coalesce(c.name, 'Uncategorized') as category_name,
      c.icon as category_icon, c.color as category_color, c.spending_class,
      sum(t.amount_krw)::numeric as amount_krw
    from finance_transactions t
    left join finance_categories c on c.id = t.category_id
    where t.user_id = ${userId} and t.type = 'expense' and t.date >= ${start} and t.date < ${end}
    group by t.category_id, c.name, c.icon, c.color, c.spending_class
    order by amount_krw desc
  `) as {
    category_id: string | null;
    category_name: string;
    category_icon: string | null;
    category_color: string | null;
    spending_class: string | null;
    amount_krw: string;
  }[];

  return rows.map((r) => ({
    categoryId: r.category_id,
    categoryName: r.category_name,
    categoryIcon: r.category_icon,
    categoryColor: r.category_color,
    spendingClass: r.spending_class as SpendingClass | null,
    amountKrw: Number(r.amount_krw),
  }));
}

export async function sumExpenseByPaymentMethodForRange(
  userId: string,
  start: string,
  end: string
): Promise<PaymentMethodAmount[]> {
  const rows = (await sql`
    select t.payment_method_id, coalesce(pm.name, 'No payment method') as payment_method_name,
      sum(t.amount_krw)::numeric as amount_krw
    from finance_transactions t
    left join finance_payment_methods pm on pm.id = t.payment_method_id
    where t.user_id = ${userId} and t.type = 'expense' and t.date >= ${start} and t.date < ${end}
    group by t.payment_method_id, pm.name
    order by amount_krw desc
  `) as { payment_method_id: string | null; payment_method_name: string; amount_krw: string }[];

  return rows.map((r) => ({
    paymentMethodId: r.payment_method_id,
    paymentMethodName: r.payment_method_name,
    amountKrw: Number(r.amount_krw),
  }));
}

export async function sumByDayForRange(
  userId: string,
  start: string,
  end: string
): Promise<{ date: string; incomeKrw: number; expenseKrw: number }[]> {
  const rows = (await sql`
    select to_char(date, 'YYYY-MM-DD') as date,
      coalesce(sum(amount_krw) filter (where type = 'income'), 0)::numeric as income_krw,
      coalesce(sum(amount_krw) filter (where type = 'expense'), 0)::numeric as expense_krw
    from finance_transactions
    where user_id = ${userId} and date >= ${start} and date < ${end}
    group by date
    order by date
  `) as { date: string; income_krw: string; expense_krw: string }[];

  return rows.map((row) => ({ date: row.date, incomeKrw: Number(row.income_krw), expenseKrw: Number(row.expense_krw) }));
}

export async function sumExpenseByDayForRange(
  userId: string,
  start: string,
  end: string
): Promise<{ date: string; amountKrw: number }[]> {
  const rows = (await sql`
    select to_char(date, 'YYYY-MM-DD') as date, sum(amount_krw)::numeric as amount_krw
    from finance_transactions
    where user_id = ${userId} and type = 'expense' and date >= ${start} and date < ${end}
    group by date
    order by date
  `) as { date: string; amount_krw: string }[];

  return rows.map((row) => ({ date: row.date, amountKrw: Number(row.amount_krw) }));
}

// Recurring-expense grouping for subscription detection lives in
// lib/finance/merchant-names.ts, over findExpensesSince — it needs the
// user's merchant merges, which plain SQL grouping can't apply.
