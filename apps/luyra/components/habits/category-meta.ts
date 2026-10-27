import {
  BedDouble,
  BookOpen,
  Brain,
  Code2,
  Droplets,
  Dumbbell,
  Footprints,
  GraduationCap,
  Sparkles,
  Timer,
  type LucideIcon,
} from "lucide-react";

import type { HabitCategory } from "@/types/habit";

export const CATEGORY_LABELS: Record<HabitCategory, string> = {
  exercise: "Exercise",
  reading: "Reading",
  meditation: "Meditation",
  sleep: "Sleep",
  water: "Water",
  study: "Study",
  coding: "Coding",
  deep_work: "Deep work",
  walking: "Walking",
  custom: "Custom",
};

export const CATEGORY_ICONS: Record<HabitCategory, LucideIcon> = {
  exercise: Dumbbell,
  reading: BookOpen,
  meditation: Brain,
  sleep: BedDouble,
  water: Droplets,
  study: GraduationCap,
  coding: Code2,
  deep_work: Timer,
  walking: Footprints,
  custom: Sparkles,
};

/**
 * Per-category icon tint, literal Tailwind classes (never construct these
 * dynamically — Tailwind's scanner needs the literal string).
 */
export const CATEGORY_COLORS: Record<HabitCategory, string> = {
  exercise: "bg-orange-500/10 text-orange-600 dark:bg-orange-400/10 dark:text-orange-400",
  reading: "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400",
  meditation: "bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400",
  sleep: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400",
  water: "bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400",
  study: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
  coding: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
  deep_work: "bg-purple-500/10 text-purple-600 dark:bg-purple-400/10 dark:text-purple-400",
  walking: "bg-green-500/10 text-green-600 dark:bg-green-400/10 dark:text-green-400",
  custom: "bg-pink-500/10 text-pink-600 dark:bg-pink-400/10 dark:text-pink-400",
};

export const CATEGORY_ORDER: HabitCategory[] = [
  "exercise",
  "reading",
  "meditation",
  "sleep",
  "water",
  "study",
  "coding",
  "deep_work",
  "walking",
  "custom",
];
