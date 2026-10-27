import "server-only";
import { sql } from "@/lib/db";
import type { Category, LookupUsage, PaymentMethod, SpendingClass } from "@/types/finance";
import type {
  CreateCategoryInput,
  CreatePaymentMethodInput,
  UpdateCategoryInput,
  UpdatePaymentMethodInput,
} from "@/lib/validation/finance";

interface CategoryRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: string;
  spending_class: string | null;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type as Category["type"],
    spendingClass: row.spending_class as SpendingClass | null,
  };
}

const CATEGORY_COLUMNS = `id, name, icon, color, type, spending_class`;

export async function findCategoriesByUser(userId: string): Promise<Category[]> {
  const rows = (await sql`
    select id, name, icon, color, type, spending_class from finance_categories
    where user_id = ${userId}
    order by name asc
  `) as CategoryRow[];

  return rows.map(toCategory);
}

export async function findCategoryById(id: string, userId: string): Promise<Category | null> {
  const rows = (await sql`
    select id, name, icon, color, type, spending_class from finance_categories
    where id = ${id} and user_id = ${userId}
  `) as CategoryRow[];

  return rows[0] ? toCategory(rows[0]) : null;
}

// Case-insensitive so "Coffee" and "coffee" can't both exist — the picker
// shows only the name, so near-duplicates are indistinguishable in the UI.
// `excludeId` lets a rename keep its own name.
export async function findCategoryByName(userId: string, name: string, excludeId?: string): Promise<Category | null> {
  const rows = (await sql`
    select id, name, icon, color, type, spending_class from finance_categories
    where user_id = ${userId}
      and lower(name) = lower(${name})
      and (${excludeId ?? null}::uuid is null or id <> ${excludeId ?? null}::uuid)
    limit 1
  `) as CategoryRow[];

  return rows[0] ? toCategory(rows[0]) : null;
}

export async function createCategory(userId: string, input: CreateCategoryInput): Promise<Category> {
  const rows = (await sql`
    insert into finance_categories (user_id, name, icon, color, type, spending_class)
    values (${userId}, ${input.name}, ${input.icon}, ${input.color}, ${input.type}, ${input.spendingClass ?? null})
    returning id, name, icon, color, type, spending_class
  `) as CategoryRow[];

  return toCategory(rows[0]);
}

export async function updateCategory(id: string, userId: string, input: UpdateCategoryInput): Promise<Category | null> {
  const sets: string[] = [];
  const params: unknown[] = [id, userId];
  const set = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.name !== undefined) set("name", input.name);
  if (input.icon !== undefined) set("icon", input.icon);
  if (input.color !== undefined) set("color", input.color);
  if (input.type !== undefined) set("type", input.type);
  if (input.spendingClass !== undefined) set("spending_class", input.spendingClass);

  if (sets.length === 0) return findCategoryById(id, userId);

  const rows = (await sql.query(
    `update finance_categories set ${sets.join(", ")}
     where id = $1 and user_id = $2
     returning ${CATEGORY_COLUMNS}`,
    params
  )) as CategoryRow[];

  return rows[0] ? toCategory(rows[0]) : null;
}

export async function deleteCategory(id: string, userId: string): Promise<boolean> {
  const rows = (await sql`
    delete from finance_categories where id = ${id} and user_id = ${userId} returning id
  `) as { id: string }[];

  return rows.length > 0;
}

interface UsageRow {
  transactions: string;
  budgets: string;
  templates: string;
  recurring: string;
}

function toUsage(row: UsageRow): LookupUsage {
  const transactions = Number(row.transactions);
  const budgets = Number(row.budgets);
  const templates = Number(row.templates);
  const recurring = Number(row.recurring);
  return { transactions, budgets, templates, recurring, total: transactions + budgets + templates + recurring };
}

// Every table whose foreign key points at finance_categories. None of them
// declare ON DELETE, so a referenced row makes the delete fail at the database
// with a raw constraint error — counting first turns that into a clear 409.
// finance_recurring_transactions counts too: a recurring rule that still files
// into this category would otherwise keep creating rows that point at it.
export async function countCategoryUsage(id: string, userId: string): Promise<LookupUsage> {
  const rows = (await sql`
    select
      (select count(*) from finance_transactions where user_id = ${userId} and category_id = ${id}) as transactions,
      (select count(*) from finance_budgets where user_id = ${userId} and category_id = ${id}) as budgets,
      (select count(*) from finance_transaction_templates where user_id = ${userId} and category_id = ${id}) as templates,
      (select count(*) from finance_recurring_transactions where user_id = ${userId} and category_id = ${id}) as recurring
  `) as UsageRow[];

  return toUsage(rows[0]);
}

export async function findPaymentMethodsByUser(userId: string): Promise<PaymentMethod[]> {
  const rows = (await sql`
    select id, name, icon from finance_payment_methods
    where user_id = ${userId}
    order by name asc
  `) as PaymentMethod[];

  return rows;
}

export async function findPaymentMethodById(id: string, userId: string): Promise<PaymentMethod | null> {
  const rows = (await sql`
    select id, name, icon from finance_payment_methods
    where id = ${id} and user_id = ${userId}
  `) as PaymentMethod[];

  return rows[0] ?? null;
}

export async function findPaymentMethodByName(
  userId: string,
  name: string,
  excludeId?: string
): Promise<PaymentMethod | null> {
  const rows = (await sql`
    select id, name, icon from finance_payment_methods
    where user_id = ${userId}
      and lower(name) = lower(${name})
      and (${excludeId ?? null}::uuid is null or id <> ${excludeId ?? null}::uuid)
    limit 1
  `) as PaymentMethod[];

  return rows[0] ?? null;
}

export async function createPaymentMethod(userId: string, input: CreatePaymentMethodInput): Promise<PaymentMethod> {
  const rows = (await sql`
    insert into finance_payment_methods (user_id, name, icon)
    values (${userId}, ${input.name}, ${input.icon})
    returning id, name, icon
  `) as PaymentMethod[];

  return rows[0];
}

export async function updatePaymentMethod(
  id: string,
  userId: string,
  input: UpdatePaymentMethodInput
): Promise<PaymentMethod | null> {
  const sets: string[] = [];
  const params: unknown[] = [id, userId];
  const set = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.name !== undefined) set("name", input.name);
  if (input.icon !== undefined) set("icon", input.icon);

  if (sets.length === 0) return findPaymentMethodById(id, userId);

  const rows = (await sql.query(
    `update finance_payment_methods set ${sets.join(", ")}
     where id = $1 and user_id = $2
     returning id, name, icon`,
    params
  )) as PaymentMethod[];

  return rows[0] ?? null;
}

export async function deletePaymentMethod(id: string, userId: string): Promise<boolean> {
  const rows = (await sql`
    delete from finance_payment_methods where id = ${id} and user_id = ${userId} returning id
  `) as { id: string }[];

  return rows.length > 0;
}

// finance_budgets has no payment_method_id, so that count is always 0 here —
// kept in the shared shape so both entities report usage the same way.
export async function countPaymentMethodUsage(id: string, userId: string): Promise<LookupUsage> {
  const rows = (await sql`
    select
      (select count(*) from finance_transactions where user_id = ${userId} and payment_method_id = ${id}) as transactions,
      0 as budgets,
      (select count(*) from finance_transaction_templates where user_id = ${userId} and payment_method_id = ${id}) as templates,
      (select count(*) from finance_recurring_transactions where user_id = ${userId} and payment_method_id = ${id}) as recurring
  `) as UsageRow[];

  return toUsage(rows[0]);
}
