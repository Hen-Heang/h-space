export type HabitCategory =
  | "exercise"
  | "reading"
  | "meditation"
  | "sleep"
  | "water"
  | "study"
  | "coding"
  | "deep_work"
  | "walking"
  | "custom";

// DTO shape returned by the API — camelCase, no database-specific fields.
export interface Habit {
  id: string;
  label: string;
  category: HabitCategory;
  identityStatement: string | null;
  active: boolean;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface HabitCheckIn {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  note: string | null;
  createdAt: string;
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  consistencyPercent: number;
  daysActive: number;
  doneToday: boolean;
}

// Habits are listed with their stats pre-computed server-side (lib/habits.ts)
// rather than fetched/derived client-side — Luyra renders lists as server
// components and revalidates with router.refresh(), unlike Hengo's
// client-side react-query hooks.
export interface HabitWithStats extends Habit {
  stats: HabitStats;
}
