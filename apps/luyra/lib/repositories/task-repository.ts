import "server-only";
import { sql } from "@/lib/db";
import type { Task } from "@/types/task";
import type { CreateTaskInput, TaskFilters, UpdateTaskInput } from "@/lib/validation/task";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TASK_COLUMNS = `id, title, description, status, priority, due_date, completed_at, created_at, updated_at`;

export async function findTasksByUser(userId: string, filters: TaskFilters): Promise<Task[]> {
  const conditions = ["user_id = $1"];
  const params: string[] = [userId];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }

  if (filters.priority) {
    params.push(filters.priority);
    conditions.push(`priority = $${params.length}`);
  }

  const rows = (await sql.query(
    `select ${TASK_COLUMNS} from tasks
     where ${conditions.join(" and ")}
     order by case when due_date is null then 1 else 0 end, due_date asc, created_at desc`,
    params
  )) as TaskRow[];

  return rows.map(toTask);
}

const TODAY_LIMIT = 10;

export async function findTodayTasksByUser(userId: string): Promise<Task[]> {
  const rows = (await sql`
    select ${sql.unsafe(TASK_COLUMNS)} from tasks
    where user_id = ${userId}
      and status <> 'done'
      and (due_date::date <= current_date or priority = 'high')
    order by case when due_date is null then 1 else 0 end, due_date asc, created_at desc
    limit ${TODAY_LIMIT}
  `) as TaskRow[];

  return rows.map(toTask);
}

export async function countTasksCompletedToday(userId: string): Promise<number> {
  const rows = (await sql`
    select count(*)::int as count from tasks
    where user_id = ${userId}
      and status = 'done'
      and completed_at::date = current_date
  `) as { count: number }[];

  return rows[0].count;
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<Task> {
  const rows = (await sql`
    insert into tasks (user_id, title, description, priority, due_date)
    values (
      ${userId},
      ${input.title},
      ${input.description ?? null},
      ${input.priority ?? null},
      ${input.dueDate ?? null}
    )
    returning ${sql.unsafe(TASK_COLUMNS)}
  `) as TaskRow[];

  return toTask(rows[0]);
}

// Returns null when no row matched id + user_id (not found or not owned) —
// the caller (task-service) is responsible for turning that into a 404.
export async function updateTask(
  id: string,
  userId: string,
  input: UpdateTaskInput
): Promise<Task | null> {
  const sets: string[] = [];
  const params: unknown[] = [id, userId];

  const set = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.title !== undefined) set("title", input.title);
  if (input.description !== undefined) set("description", input.description);
  if (input.priority !== undefined) set("priority", input.priority);
  if (input.dueDate !== undefined) set("due_date", input.dueDate);
  if (input.status !== undefined) {
    set("status", input.status);
    set("completed_at", input.status === "done" ? new Date().toISOString() : null);
  }
  sets.push("updated_at = now()");

  const rows = (await sql.query(
    `update tasks set ${sets.join(", ")}
     where id = $1 and user_id = $2
     returning ${TASK_COLUMNS}`,
    params
  )) as TaskRow[];

  return rows[0] ? toTask(rows[0]) : null;
}

export async function deleteTask(id: string, userId: string): Promise<boolean> {
  const rows = (await sql`
    delete from tasks where id = ${id} and user_id = ${userId} returning id
  `) as { id: string }[];

  return rows.length > 0;
}
