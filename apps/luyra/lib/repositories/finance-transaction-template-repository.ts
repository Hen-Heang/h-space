import "server-only";
import { sql } from "@/lib/db";
import type { TransactionTemplate, TransactionType } from "@/types/finance";
import type { CreateTransactionTemplateInput } from "@/lib/validation/finance";

interface TemplateRow {
  id: string;
  type: string;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  description: string;
  amount_krw: string;
  payment_method_id: string | null;
  payment_method_name: string | null;
  note: string | null;
  created_at: string;
}

function toTemplate(row: TemplateRow): TransactionTemplate {
  return {
    id: row.id,
    type: row.type as TransactionType,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    description: row.description,
    amountKrw: Number(row.amount_krw),
    paymentMethodId: row.payment_method_id,
    paymentMethodName: row.payment_method_name,
    note: row.note,
    createdAt: row.created_at,
  };
}

const TEMPLATE_SELECT = `
  t.id, t.type, t.category_id,
  c.name as category_name, c.icon as category_icon, c.color as category_color,
  t.description, t.amount_krw,
  t.payment_method_id, pm.name as payment_method_name, t.note, t.created_at
`;
const TEMPLATE_FROM = `
  from finance_transaction_templates t
  left join finance_categories c on c.id = t.category_id
  left join finance_payment_methods pm on pm.id = t.payment_method_id
`;

export async function findTemplatesByUser(userId: string): Promise<TransactionTemplate[]> {
  const rows = (await sql`
    select ${sql.unsafe(TEMPLATE_SELECT)} ${sql.unsafe(TEMPLATE_FROM)}
    where t.user_id = ${userId}
    order by t.created_at desc
  `) as TemplateRow[];

  return rows.map(toTemplate);
}

export async function countTemplatesByUser(userId: string): Promise<number> {
  const rows = (await sql`
    select count(*)::int as count from finance_transaction_templates where user_id = ${userId}
  `) as { count: number }[];

  return rows[0].count;
}

export async function createTemplate(userId: string, input: CreateTransactionTemplateInput): Promise<TransactionTemplate> {
  const rows = (await sql`
    insert into finance_transaction_templates (user_id, type, description, amount_krw, category_id, payment_method_id, note)
    values (
      ${userId}, ${input.type}, ${input.description}, ${input.amountKrw},
      ${input.categoryId ?? null}, ${input.paymentMethodId ?? null}, ${input.note ?? null}
    )
    returning id
  `) as { id: string }[];

  const created = (await sql`
    select ${sql.unsafe(TEMPLATE_SELECT)} ${sql.unsafe(TEMPLATE_FROM)} where t.id = ${rows[0].id}
  `) as TemplateRow[];

  return toTemplate(created[0]);
}

export async function deleteTemplate(id: string, userId: string): Promise<boolean> {
  const rows = (await sql`
    delete from finance_transaction_templates where id = ${id} and user_id = ${userId} returning id
  `) as { id: string }[];

  return rows.length > 0;
}
