import "server-only";
import { Errors } from "@/lib/errors";
import { buildDailyStudyContent, generateModeSchedule, topicForDate } from "@/lib/daily-study-plan";
import {
  createPlan,
  findPlanByDate,
  updatePlanActivities,
  updatePlanNotes,
} from "@/lib/repositories/daily-study-plan-repository";
import type { ActivityActionInput } from "@/lib/validation/learning";
import type { DailyStudyMode, DailyStudyPlan } from "@/types/learning";

const PLAN_TIME_ZONE = "Asia/Seoul";

function todayDateKey(timeZone = PLAN_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    new Date()
  );
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export async function getOrCreateTodayPlan(userId: string, mode: DailyStudyMode): Promise<DailyStudyPlan> {
  const studyDate = todayDateKey();
  const existing = await findPlanByDate(userId, studyDate);
  if (existing) return existing;

  const topic = topicForDate(new Date(), PLAN_TIME_ZONE);
  const activities = generateModeSchedule(mode);
  const content = buildDailyStudyContent(topic.key, studyDate);
  return createPlan(userId, studyDate, mode, topic.key, topic.label, activities, content);
}

export async function applyActivityAction(userId: string, planId: string, action: ActivityActionInput): Promise<DailyStudyPlan> {
  const studyDate = todayDateKey();
  const plan = await findPlanByDate(userId, studyDate);
  if (!plan || plan.id !== planId) throw Errors.notFound("Daily study plan");

  const now = new Date().toISOString();
  const activities = plan.activities.map((activity) => {
    if (activity.id !== action.activityId) return activity;

    if (action.action === "start") {
      return { ...activity, status: "active" as const, startedAt: now };
    }
    if (action.action === "complete") {
      const startedAt = activity.startedAt ? new Date(activity.startedAt).getTime() : Date.now();
      const elapsed = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      return { ...activity, status: "completed" as const, completedAt: now, completedSeconds: activity.completedSeconds + elapsed };
    }
    return { ...activity, status: "skipped" as const, skipReason: action.skipReason ?? null };
  });

  const totalFocusSeconds = activities.reduce((sum, activity) => sum + Math.max(0, activity.completedSeconds), 0);
  const updated = await updatePlanActivities(planId, userId, activities, totalFocusSeconds);
  if (!updated) throw Errors.notFound("Daily study plan");
  return updated;
}

export async function updatePlanText(
  userId: string,
  planId: string,
  input: { reflection?: string; missionResult?: string }
): Promise<DailyStudyPlan> {
  const updated = await updatePlanNotes(planId, userId, input);
  if (!updated) throw Errors.notFound("Daily study plan");
  return updated;
}
