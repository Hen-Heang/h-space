export function monthBounds(offset = 0): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  const dateOnly = (value: Date) => value.toLocaleDateString("en-CA");

  return { start: dateOnly(start), end: dateOnly(end) };
}

export function monthLabel(offset = 0): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** YYYY-MM key for the finance analytics/review endpoints. */
export function monthKey(offset = 0): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
