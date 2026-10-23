import "server-only";
import { countTasksCompletedToday, findTodayTasksByUser } from "@/lib/repositories/task-repository";
import { countActiveGoals, listActiveGoalsForToday } from "@/lib/services/goal-service";
import type { TodaySummary } from "@/types/today";

const TODAY_GOALS_LIMIT = 5;

export async function getTodaySummary(userId: string): Promise<TodaySummary> {
  const [items, completed, goalItems, activeGoalCount] = await Promise.all([
    findTodayTasksByUser(userId),
    countTasksCompletedToday(userId),
    listActiveGoalsForToday(userId, TODAY_GOALS_LIMIT),
    countActiveGoals(userId),
  ]);

  return {
    date: new Date().toISOString().slice(0, 10),
    tasks: {
      total: items.length,
      completed,
      items,
    },
    goals: {
      active: activeGoalCount,
      items: goalItems,
    },
  };
}
