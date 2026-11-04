// Fixed-order categorical palette (see app/globals.css --chart-series-*).
export const CHART_SERIES_COLORS = [
  "var(--chart-series-1)",
  "var(--chart-series-2)",
  "var(--chart-series-3)",
  "var(--chart-series-4)",
  "var(--chart-series-5)",
  "var(--chart-series-6)",
];

/** Stable color for an entity without its own color, keyed by its own
 * id/name rather than its rank in an amount-sorted list — so it keeps the
 * same color across months even as spending order shifts. */
export function hashSeriesColor(key: string): string {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return CHART_SERIES_COLORS[hash % CHART_SERIES_COLORS.length];
}
