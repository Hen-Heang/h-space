import type { Task } from "@/types/task";
import type { Goal } from "@/types/goal";

export interface TodaySummary {
  date: string;
  tasks: {
    total: number;
    completed: number;
    items: Task[];
  };
  goals: {
    active: number;
    items: Goal[];
  };
}
