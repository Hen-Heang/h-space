import "server-only";
import { sql } from "@/lib/db";
import type { SavingsContribution, SavingsGoal, SavingsGoalPurpose } from "@/types/finance";
import type { CreateSavingsGoalInput, UpdateSavingsGoalInput } from "@/lib/validation/finance";

interface SavingsGoalRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  target_usd: string;
  current_usd: string;
  deadline: string | null;
  note: string | null;
  purpose: string | null;
  created_at: string;
  updated_at: string;
}

function toSavingsGoal(row: SavingsGoalRow): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    targetUsd: Number(row.target_usd),
    currentUsd: Number(row.current_usd),
    deadline: row.deadline,
    note: row.note,
    purpose: row.purpose as SavingsGoalPurpose | null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SAVINGS_COLUMNS = `id, name, icon, color, target_usd, current_usd, to_char(deadline, 'YYYY-MM-DD') as deadline, note, purpose, created_at, updated_at`;

export async function findSavingsGoalsByUser(userId: string): Promise<SavingsGoal[]> {
  const rows = (await sql`
    select ${sql.unsafe(SAVINGS_COLUMNS)} from finance_savings_goals
    where user_id = ${userId}
    order by created_at desc
  `) as SavingsGoalRow[];

  return rows.map(toSavingsGoal);
}

export async function findSavingsGoalById(id: string, userId: string): Promise<SavingsGoal | null> {
  const rows = (await sql`
    select ${sql.unsafe(SAVINGS_COLUMNS)} from finance_savings_goals
    where id = ${id} and user_id = ${userId}
  `) as SavingsGoalRow[];

  return rows[0] ? toSavingsGoal(rows[0]) : null;
}

export async function createSavingsGoal(userId: string, input: CreateSavingsGoalInput): Promise<SavingsGoal> {
  const rows = (await sql`
    insert into finance_savings_goals (user_id, name, icon, color, target_usd, current_usd, deadline, note, purpose)
    values (
      ${userId}, ${input.name}, ${input.icon}, ${input.color},
      ${input.targetUsd}, ${input.currentUsd}, ${input.deadline ?? null}, ${input.note ?? null}, ${input.purpose ?? null}
    )
    returning ${sql.unsafe(SAVINGS_COLUMNS)}
  `) as SavingsGoalRow[];

  return toSavingsGoal(rows[0]);
}

export async function updateSavingsGoal(
  id: string,
  userId: string,
  input: UpdateSavingsGoalInput
): Promise<SavingsGoal | null> {
  const sets: string[] = [];
  const params: unknown[] = [id, userId];
  const set = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.name !== undefined) set("name", input.name);
  if (input.icon !== undefined) set("icon", input.icon);
  if (input.color !== undefined) set("color", input.color);
  if (input.targetUsd !== undefined) set("target_usd", input.targetUsd);
  if (input.deadline !== undefined) set("deadline", input.deadline);
  if (input.note !== undefined) set("note", input.note);
  if (input.purpose !== undefined) set("purpose", input.purpose);
  sets.push("updated_at = now()");

  const rows = (await sql.query(
    `update finance_savings_goals set ${sets.join(", ")}
     where id = $1 and user_id = $2
     returning ${SAVINGS_COLUMNS}`,
    params
  )) as SavingsGoalRow[];

  return rows[0] ? toSavingsGoal(rows[0]) : null;
}

export async function deleteSavingsGoal(id: string, userId: string): Promise<boolean> {
  const rows = (await sql`
    delete from finance_savings_goals where id = ${id} and user_id = ${userId} returning id
  `) as { id: string }[];

  return rows.length > 0;
}

function toContribution(row: {
  id: string;
  goal_id: string;
  amount_usd: string;
  contribution_month: string;
  created_at: string;
}): SavingsContribution {
  return {
    id: row.id,
    goalId: row.goal_id,
    amountUsd: Number(row.amount_usd),
    contributionMonth: row.contribution_month,
    createdAt: row.created_at,
  };
}

export async function findContributionsByGoal(goalId: string, userId: string): Promise<SavingsContribution[]> {
  const rows = (await sql`
    select id, goal_id, amount_usd, contribution_month, created_at from finance_savings_contributions
    where goal_id = ${goalId} and user_id = ${userId}
    order by created_at desc
  `) as { id: string; goal_id: string; amount_usd: string; contribution_month: string; created_at: string }[];

  return rows.map(toContribution);
}

// Across every goal, unfiltered by month — a personal finance app's full
// contribution history is small enough to hold in memory (same reasoning as
// findAllTransactionsForExport). Callers filter to a specific month with
// lib/finance/savings-contributions.ts's sumContributionsForMonth rather
// than adding a date-range query here, so that month-scoping logic stays
// pure, unit-tested, and identical everywhere it's used.
export async function findContributionsForUser(userId: string): Promise<{ amountUsd: number; contributionMonth: string }[]> {
  const rows = (await sql`
    select amount_usd, contribution_month from finance_savings_contributions where user_id = ${userId}
  `) as { amount_usd: string; contribution_month: string }[];

  return rows.map((row) => ({ amountUsd: Number(row.amount_usd), contributionMonth: row.contribution_month }));
}

// Records the contribution and adds it to the goal's running total in one
// call — callers never update current_usd directly.
export async function addContribution(goalId: string, userId: string, amountUsd: number): Promise<SavingsContribution> {
  const month = new Date().toISOString().slice(0, 7);
  const rows = (await sql`
    insert into finance_savings_contributions (goal_id, user_id, amount_usd, contribution_month, source)
    values (${goalId}, ${userId}, ${amountUsd}, ${month}, 'manual')
    returning id, goal_id, amount_usd, contribution_month, created_at
  `) as { id: string; goal_id: string; amount_usd: string; contribution_month: string; created_at: string }[];

  await sql`
    update finance_savings_goals set current_usd = current_usd + ${amountUsd}, updated_at = now()
    where id = ${goalId} and user_id = ${userId}
  `;

  return toContribution(rows[0]);
}
