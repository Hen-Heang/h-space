export interface ContributionRecord {
  amountUsd: number;
  contributionMonth: string; // YYYY-MM
}

/**
 * Sums only the contributions actually recorded for the target month.
 *
 * This is the one place double-counting could sneak into the Future bucket:
 * a savings goal's `currentUsd` is a running, all-time total, so folding it
 * into "this month's future allocation" would re-count every past
 * contribution on every subsequent month — a Future rate that only ever
 * goes up, never reflecting a quiet month. Contributions must always be
 * filtered to the target month before being added to anything, which is
 * exactly what this function does and nothing more.
 */
export function sumContributionsForMonth(contributions: ContributionRecord[], month: string): number {
  return contributions
    .filter((contribution) => contribution.contributionMonth === month)
    .reduce((sum, contribution) => sum + contribution.amountUsd, 0);
}
