import "server-only";
import { sql } from "@/lib/db";
import type { Habit, HabitCheckIn } from "@/types/habit";
import type { CreateHabitInput, UpdateHabitInput } from "@/lib/validation/habit";

interface HabitRow {
  id: string;
  label: string;
  category: string;
  identity_statement: string | null;
  active: boolean;
  started_at: string;
  created_at: string;
  updated_at: string;
}

function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    label: row.label,
    category: row.category as Habit["category"],
    identityStatement: row.identity_statement,
    active: row.active,
    startedAt: row.started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// started_at is cast to text explicitly, same reasoning as goals.target_date:
// the driver would otherwise parse it into a JS Date and re-encode it as a
// UTC instant, shifting the calendar date outside UTC.
const HABIT_COLUMNS = `id, label, category, identity_statement, active, to_char(started_at, 'YYYY-MM-DD') as started_at, created_at, updated_at`;

export async function findHabitsByUser(userId: string): Promise<Habit[]> {
  const rows = (await sql`
    select ${sql.unsafe(HABIT_COLUMNS)} from habits
    where user_id = ${userId}
    order by active desc, created_at desc
  `) as HabitRow[];

  return rows.map(toHabit);
}

export async function findHabitById(id: string, userId: string): Promise<Habit | null> {
  const rows = (await sql`
    select ${sql.unsafe(HABIT_COLUMNS)} from habits
    where id = ${id} and user_id = ${userId}
  `) as HabitRow[];

  return rows[0] ? toHabit(rows[0]) : null;
}

export async function createHabit(userId: string, input: CreateHabitInput): Promise<Habit> {
  const rows = (await sql`
    insert into habits (user_id, label, category, identity_statement)
    values (${userId}, ${input.label}, ${input.category ?? "custom"}, ${input.identityStatement ?? null})
    returning ${sql.unsafe(HABIT_COLUMNS)}
  `) as HabitRow[];

  return toHabit(rows[0]);
}

// Returns null when no row matched id + user_id (not found or not owned) —
// the caller (habit-service) is responsible for turning that into a 404.
export async function updateHabit(id: string, userId: string, input: UpdateHabitInput): Promise<Habit | null> {
  const sets: string[] = [];
  const params: unknown[] = [id, userId];

  const set = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.label !== undefined) set("label", input.label);
  if (input.category !== undefined) set("category", input.category);
  if (input.identityStatement !== undefined) set("identity_statement", input.identityStatement);
  if (input.active !== undefined) set("active", input.active);
  sets.push("updated_at = now()");

  const rows = (await sql.query(
    `update habits set ${sets.join(", ")}
     where id = $1 and user_id = $2
     returning ${HABIT_COLUMNS}`,
    params
  )) as HabitRow[];

  return rows[0] ? toHabit(rows[0]) : null;
}

export async function deleteHabit(id: string, userId: string): Promise<boolean> {
  const rows = (await sql`
    delete from habits where id = ${id} and user_id = ${userId} returning id
  `) as { id: string }[];

  return rows.length > 0;
}

// ── Check-ins ────────────────────────────────────────────────────────────

interface CheckinRow {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  note: string | null;
  created_at: string;
}

function toCheckin(row: CheckinRow): HabitCheckIn {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    completed: row.completed,
    note: row.note,
    createdAt: row.created_at,
  };
}

const CHECKIN_COLUMNS = `id, habit_id, to_char(date, 'YYYY-MM-DD') as date, completed, note, created_at`;

export async function findCheckinsByHabit(habitId: string, userId: string, limit = 400): Promise<HabitCheckIn[]> {
  const rows = (await sql`
    select ${sql.unsafe(CHECKIN_COLUMNS)} from habit_checkins
    where habit_id = ${habitId} and user_id = ${userId}
    order by date desc
    limit ${limit}
  `) as CheckinRow[];

  return rows.map(toCheckin);
}

// All check-ins across a set of habits, for computing list-page stats in one
// round trip instead of one query per habit.
export async function findCheckinsByUser(userId: string, habitIds: string[]): Promise<HabitCheckIn[]> {
  if (habitIds.length === 0) return [];

  const placeholders = habitIds.map((_, i) => `$${i + 2}`).join(", ");
  const rows = (await sql.query(
    `select ${CHECKIN_COLUMNS} from habit_checkins
     where user_id = $1 and habit_id in (${placeholders})
     order by date desc`,
    [userId, ...habitIds]
  )) as CheckinRow[];

  return rows.map(toCheckin);
}

// Upserts on the (habit_id, date) unique constraint so re-checking an
// already-completed day is idempotent.
export async function setCheckin(habitId: string, userId: string, date: string): Promise<HabitCheckIn> {
  const rows = (await sql`
    insert into habit_checkins (habit_id, user_id, date, completed)
    values (${habitId}, ${userId}, ${date}, true)
    on conflict (habit_id, date) do update set completed = true
    returning ${sql.unsafe(CHECKIN_COLUMNS)}
  `) as CheckinRow[];

  return toCheckin(rows[0]);
}

// Un-completing a day just removes its row — no row means "not done".
export async function removeCheckin(habitId: string, userId: string, date: string): Promise<void> {
  await sql`
    delete from habit_checkins where habit_id = ${habitId} and user_id = ${userId} and date = ${date}
  `;
}
