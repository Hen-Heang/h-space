import "server-only";
import { sql } from "@/lib/db";
import type { Budget } from "@/types/finance";

export async function findBudgetsByUser(userId: string): Promise<Budget[]> {
  const rows = (await sql`
    select b.category_id, c.name as category_name, c.icon as category_icon,
      c.color as category_color, b.amount_krw
    from finance_budgets b
    join finance_categories c on c.id = b.category_id
    where b.user_id = ${userId}
  `) as {
    category_id: string;
    category_name: string;
    category_icon: string | null;
    category_color: string | null;
    amount_krw: string;
  }[];

  return rows.map((r) => ({
    categoryId: r.category_id,
    categoryName: r.category_name,
    categoryIcon: r.category_icon,
    categoryColor: r.category_color,
    amountKrw: Number(r.amount_krw),
  }));
}

// No unique(user_id, category_id) constraint is declared in
// db/migrations/004_finance.sql, so this checks-then-writes instead of
// relying on `on conflict` (which would error without a matching constraint).
export async function upsertBudget(userId: string, categoryId: string, amountKrw: number): Promise<void> {
  const existing = (await sql`
    select id from finance_budgets where user_id = ${userId} and category_id = ${categoryId}
  `) as { id: string }[];

  if (existing.length > 0) {
    await sql`
      update finance_budgets set amount_krw = ${amountKrw}, updated_at = now()
      where user_id = ${userId} and category_id = ${categoryId}
    `;
  } else {
    await sql`
      insert into finance_budgets (user_id, category_id, amount_krw)
      values (${userId}, ${categoryId}, ${amountKrw})
    `;
  }
}

// Several budgets in one transaction, so applying a reviewed plan either
// lands completely or not at all. Same update-then-insert shape as
// upsertBudget above, for the same missing-constraint reason.
export async function upsertBudgets(
  userId: string,
  entries: { categoryId: string; amountKrw: number }[]
): Promise<void> {
  if (entries.length === 0) return;

  await sql.transaction(
    entries.flatMap(({ categoryId, amountKrw }) => [
      sql`
        update finance_budgets set amount_krw = ${amountKrw}, updated_at = now()
        where user_id = ${userId} and category_id = ${categoryId}
      `,
      sql`
        insert into finance_budgets (user_id, category_id, amount_krw)
        select ${userId}, ${categoryId}, ${amountKrw}
        where not exists (
          select 1 from finance_budgets where user_id = ${userId} and category_id = ${categoryId}
        )
      `,
    ])
  );
}

export async function deleteBudget(userId: string, categoryId: string): Promise<void> {
  await sql`delete from finance_budgets where user_id = ${userId} and category_id = ${categoryId}`;
}

export interface BudgetAlertState {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  amountKrw: number;
  /** YYYY-MM the stored level belongs to; null before the first ever alert. */
  alertMonth: string | null;
  /** 0 none, 1 watch, 2 near limit, 3 exceeded. */
  alertLevel: number;
}

// alert_month and alert_level shipped in 004_finance.sql with no code reading
// them. They are what stops a daily sweep from re-sending the same warning:
// the level already announced this month is remembered per budget.
export async function findBudgetAlertState(userId: string): Promise<BudgetAlertState[]> {
  const rows = (await sql`
    select b.id, b.category_id, c.name as category_name, c.icon as category_icon,
      b.amount_krw, b.alert_month, b.alert_level
    from finance_budgets b
    join finance_categories c on c.id = b.category_id
    where b.user_id = ${userId} and b.amount_krw > 0
  `) as {
    id: string;
    category_id: string;
    category_name: string;
    category_icon: string | null;
    amount_krw: string;
    alert_month: string | null;
    alert_level: number;
  }[];

  return rows.map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    amountKrw: Number(row.amount_krw),
    alertMonth: row.alert_month,
    alertLevel: row.alert_level,
  }));
}

export async function updateBudgetAlertState(id: string, month: string, level: number): Promise<void> {
  await sql`
    update finance_budgets
    set alert_month = ${month}, alert_level = ${level}, updated_at = now()
    where id = ${id}
  `;
}
