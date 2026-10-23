import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null;

  const date = new Date(dueDate);
  const isOverdue = date < new Date(new Date().toDateString());

  // Fixed locale, not `undefined` — this runs during SSR (server's Node
  // locale) and again during client hydration (browser locale); a mismatch
  // there triggers a full hydration-mismatch error, not just wrong text.
  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return isOverdue ? `Overdue · ${label}` : label;
}
