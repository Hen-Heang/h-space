import "server-only";
import { sql } from "@/lib/db";
import type { Goal } from "@/types/goal";
import type { CreateGoalInput, GoalFilters, UpdateGoalInput } from "@/lib/validation/goal";

interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  target_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
}

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as Goal["category"],
    status: row.status as Goal["status"],
    targetDate: row.target_date,
    progress: row.progress,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// target_date is cast to text explicitly: the driver parses `date` columns
// into JS Date objects (same as timestamps), and serializing that through
// NextResponse.json() re-encodes it as a UTC instant via toISOString() —
// shifting the calendar date whenever the server's local timezone isn't UTC.
const GOAL_COLUMNS = `id, title, description, category, status, to_char(target_date, 'YYYY-MM-DD') as target_date, progress, created_at, updated_at`;
const GOAL_ORDER = `case when target_date is null then 1 else 0 end, target_date asc, created_at desc`;

export async function findGoalsByUser(userId: string, filters: GoalFilters): Promise<Goal[]> {
  const conditions = ["user_id = $1"];
  const params: string[] = [userId];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }

  if (filters.category) {
    params.push(filters.category);
    conditions.push(`category = $${params.length}`);
  }

  const rows = (await sql.query(
    `select ${GOAL_COLUMNS} from goals
     where ${conditions.join(" and ")}
     order by ${GOAL_ORDER}`,
    params
  )) as GoalRow[];

  return rows.map(toGoal);
}

export async function findActiveGoalsByUser(userId: string, limit: number): Promise<Goal[]> {
  const rows = (await sql`
    select ${sql.unsafe(GOAL_COLUMNS)} from goals
    where user_id = ${userId} and status = 'active'
    order by ${sql.unsafe(GOAL_ORDER)}
    limit ${limit}
  `) as GoalRow[];

  return rows.map(toGoal);
}

export async function countActiveGoalsByUser(userId: string): Promise<number> {
  const rows = (await sql`
    select count(*)::int as count from goals where user_id = ${userId} and status = 'active'
  `) as { count: number }[];

  return rows[0].count;
}

export async function createGoal(userId: string, input: CreateGoalInput): Promise<Goal> {
  const rows = (await sql`
    insert into goals (user_id, title, description, category, target_date, progress)
    values (
      ${userId},
      ${input.title},
      ${input.description ?? null},
      ${input.category ?? null},
      ${input.targetDate ?? null},
      ${input.progress ?? 0}
    )
    returning ${sql.unsafe(GOAL_COLUMNS)}
  `) as GoalRow[];

  return toGoal(rows[0]);
}

// Returns null when no row matched id + user_id (not found or not owned) —
// the caller (goal-service) is responsible for turning that into a 404.
export async function updateGoal(
  id: string,
  userId: string,
  input: UpdateGoalInput
): Promise<Goal | null> {
  const sets: string[] = [];
  const params: unknown[] = [id, userId];

  const set = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.title !== undefined) set("title", input.title);
  if (input.description !== undefined) set("description", input.description);
  if (input.category !== undefined) set("category", input.category);
  if (input.status !== undefined) set("status", input.status);
  if (input.targetDate !== undefined) set("target_date", input.targetDate);
  if (input.progress !== undefined) set("progress", input.progress);
  sets.push("updated_at = now()");

  const rows = (await sql.query(
    `update goals set ${sets.join(", ")}
     where id = $1 and user_id = $2
     returning ${GOAL_COLUMNS}`,
    params
  )) as GoalRow[];

  return rows[0] ? toGoal(rows[0]) : null;
}

export async function deleteGoal(id: string, userId: string): Promise<boolean> {
  const rows = (await sql`
    delete from goals where id = ${id} and user_id = ${userId} returning id
  `) as { id: string }[];

  return rows.length > 0;
}
