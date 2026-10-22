import { describe, expect, it } from "vitest";
import { financeKeys, transactionListQuery } from "@/lib/query/finance-queries";
import type { Transaction } from "@/types/finance";

const filters = { start: "2026-10-01", end: "2026-11-01", sort: "date_desc" as const };
const page = (hasMore: boolean) => ({ transactions: [] as Transaction[], hasMore });

describe("transactionListQuery", () => {
  const options = transactionListQuery(filters);
  const next = options.getNextPageParam!;

  it("starts at the API's page 0", () => {
    expect(options.initialPageParam).toBe(0);
  });

  it("asks for the next 0-based page while the server reports more", () => {
    expect(next(page(true), [page(true)], 0, [0])).toBe(1);
    expect(next(page(true), [page(true), page(true), page(true)], 2, [0, 1, 2])).toBe(3);
  });

  it("stops when the server reports no more", () => {
    expect(next(page(false), [page(true), page(false)], 1, [0, 1])).toBeUndefined();
  });

  it("keys each filter set under the shared transactions prefix", () => {
    expect(options.queryKey).toEqual([...financeKeys.transactions(), filters]);
    expect(options.queryKey.slice(0, 2)).toEqual(financeKeys.transactions());
  });
});
