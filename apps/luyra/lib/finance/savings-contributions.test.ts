import { describe, expect, it } from "vitest";
import { sumContributionsForMonth } from "@/lib/finance/savings-contributions";

describe("sumContributionsForMonth", () => {
  it("sums only contributions recorded for the target month", () => {
    const contributions = [
      { amountUsd: 200, contributionMonth: "2026-08" },
      { amountUsd: 50, contributionMonth: "2026-09" },
      { amountUsd: 30, contributionMonth: "2026-09" },
    ];

    expect(sumContributionsForMonth(contributions, "2026-09")).toBe(80);
  });

  it("does not double-count a goal's history — only the target month counts, not everything to date", () => {
    // Simulates 6 months of steady $100 contributions building toward a
    // large cumulative total. If Future ever summed all contribution rows
    // instead of filtering by month, September's Future rate would balloon
    // to $600 instead of the $100 actually contributed that month.
    const contributions = Array.from({ length: 6 }, (_, i) => ({
      amountUsd: 100,
      contributionMonth: `2026-0${i + 4}`, // 2026-04 .. 2026-09
    }));

    expect(sumContributionsForMonth(contributions, "2026-09")).toBe(100);
    expect(sumContributionsForMonth(contributions, "2026-09")).not.toBe(600);
  });

  it("returns 0 for a month with no contributions", () => {
    expect(sumContributionsForMonth([{ amountUsd: 200, contributionMonth: "2026-08" }], "2026-09")).toBe(0);
  });

  it("returns 0 for an empty list", () => {
    expect(sumContributionsForMonth([], "2026-09")).toBe(0);
  });
});
