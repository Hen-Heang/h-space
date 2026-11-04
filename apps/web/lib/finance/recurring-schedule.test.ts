import { describe, expect, it } from "vitest";
import { dueOccurrences, nextOccurrence } from "@/lib/finance/recurring-schedule";

describe("nextOccurrence", () => {
  it("steps daily and weekly across month and year ends", () => {
    expect(nextOccurrence("2026-01-31", "daily", 31)).toBe("2026-02-01");
    expect(nextOccurrence("2026-12-29", "weekly", 29)).toBe("2027-01-05");
  });

  it("keeps a monthly rule on its anchor day, clamping short months without drifting", () => {
    // Jan 31 → Feb 28 → Mar 31: the anchor brings it back after February.
    expect(nextOccurrence("2026-01-31", "monthly", 31)).toBe("2026-02-28");
    expect(nextOccurrence("2026-02-28", "monthly", 31)).toBe("2026-03-31");
    expect(nextOccurrence("2026-04-30", "monthly", 31)).toBe("2026-05-31");
    expect(nextOccurrence("2026-12-15", "monthly", 15)).toBe("2027-01-15");
  });

  it("handles leap years for monthly and yearly rules", () => {
    expect(nextOccurrence("2028-01-30", "monthly", 30)).toBe("2028-02-29");
    expect(nextOccurrence("2028-02-29", "yearly", 29)).toBe("2029-02-28");
    expect(nextOccurrence("2029-02-28", "yearly", 29)).toBe("2030-02-28");
    expect(nextOccurrence("2031-02-28", "yearly", 29)).toBe("2032-02-29");
  });
});

describe("dueOccurrences", () => {
  it("returns nothing when the rule isn't due yet", () => {
    expect(dueOccurrences("2026-10-23", "monthly", 23, "2026-10-22")).toEqual({ dates: [], nextDate: "2026-10-23" });
  });

  it("includes an occurrence due today", () => {
    expect(dueOccurrences("2026-10-22", "monthly", 22, "2026-10-22")).toEqual({
      dates: ["2026-10-22"],
      nextDate: "2026-11-22",
    });
  });

  it("catches up every missed occurrence in one run", () => {
    expect(dueOccurrences("2026-10-18", "daily", 18, "2026-10-21")).toEqual({
      dates: ["2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21"],
      nextDate: "2026-10-22",
    });
  });

  it("stops at the per-run cap and leaves the rest for the next run", () => {
    const result = dueOccurrences("2026-01-01", "daily", 1, "2026-12-31", 5);
    expect(result.dates).toHaveLength(5);
    expect(result.nextDate).toBe("2026-01-06");
  });
});
