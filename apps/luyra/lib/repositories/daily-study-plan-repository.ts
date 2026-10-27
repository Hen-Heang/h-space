import "server-only";
import { sql } from "@/lib/db";
import type { DailyStudyActivity, DailyStudyContent, DailyStudyMode, DailyStudyPlan } from "@/types/learning";

interface PlanRow {
  id: string;
  study_date: string;
  mode: string;
  topic_key: string;
  topic_label: string;
  activities: unknown;
  content: unknown;
  reflection: string;
  mission_result: string;
  total_focus_seconds: number;
  created_at: string;
  updated_at: string;
}

function toPlan(row: PlanRow): DailyStudyPlan {
  return {
    id: row.id,
    studyDate: row.study_date,
    mode: row.mode as DailyStudyMode,
    topicKey: row.topic_key,
    topicLabel: row.topic_label,
    activities: row.activities as DailyStudyActivity[],
    content: row.content as DailyStudyContent,
    reflection: row.reflection,
    missionResult: row.mission_result,
    totalFocusSeconds: row.total_focus_seconds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// study_date is cast to text explicitly, same reasoning as goals.target_date.
const PLAN_COLUMNS = `id, to_char(study_date, 'YYYY-MM-DD') as study_date, mode, topic_key, topic_label, activities, content, reflection, mission_result, total_focus_seconds, created_at, updated_at`;

export async function findPlanByDate(userId: string, studyDate: string): Promise<DailyStudyPlan | null> {
  const rows = (await sql`
    select ${sql.unsafe(PLAN_COLUMNS)} from learning_daily_study_plans
    where user_id = ${userId} and study_date = ${studyDate}
  `) as PlanRow[];

  return rows[0] ? toPlan(rows[0]) : null;
}

export async function createPlan(
  userId: string,
  studyDate: string,
  mode: DailyStudyMode,
  topicKey: string,
  topicLabel: string,
  activities: DailyStudyActivity[],
  content: DailyStudyContent
): Promise<DailyStudyPlan> {
  const rows = (await sql`
    insert into learning_daily_study_plans (user_id, study_date, mode, topic_key, topic_label, activities, content)
    values (
      ${userId}, ${studyDate}, ${mode}, ${topicKey}, ${topicLabel},
      ${JSON.stringify(activities)}, ${JSON.stringify(content)}
    )
    returning ${sql.unsafe(PLAN_COLUMNS)}
  `) as PlanRow[];

  return toPlan(rows[0]);
}

export async function updatePlanActivities(
  id: string,
  userId: string,
  activities: DailyStudyActivity[],
  totalFocusSeconds: number
): Promise<DailyStudyPlan | null> {
  const rows = (await sql`
    update learning_daily_study_plans set
      activities = ${JSON.stringify(activities)},
      total_focus_seconds = ${totalFocusSeconds},
      updated_at = now()
    where id = ${id} and user_id = ${userId}
    returning ${sql.unsafe(PLAN_COLUMNS)}
  `) as PlanRow[];

  return rows[0] ? toPlan(rows[0]) : null;
}

export async function updatePlanNotes(
  id: string,
  userId: string,
  input: { reflection?: string; missionResult?: string }
): Promise<DailyStudyPlan | null> {
  const sets: string[] = [];
  const params: unknown[] = [id, userId];
  const set = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.reflection !== undefined) set("reflection", input.reflection);
  if (input.missionResult !== undefined) set("mission_result", input.missionResult);
  sets.push("updated_at = now()");

  const rows = (await sql.query(
    `update learning_daily_study_plans set ${sets.join(", ")}
     where id = $1 and user_id = $2
     returning ${PLAN_COLUMNS}`,
    params
  )) as PlanRow[];

  return rows[0] ? toPlan(rows[0]) : null;
}
