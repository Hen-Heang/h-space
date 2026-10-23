export type GoalCategory = "personal" | "career" | "finance" | "learning" | "health" | "other";
export type GoalStatus = "active" | "completed" | "paused";

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: GoalCategory | null;
  status: GoalStatus;
  targetDate: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
}
