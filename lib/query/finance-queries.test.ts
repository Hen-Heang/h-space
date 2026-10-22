import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { financeKeys, invalidateAfter, transactionListQuery, type FinanceWriteKind } from "@/lib/query/finance-queries";
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

describe("invalidateAfter", () => {
  const range = { start: "2026-10-01", end: "2026-11-01" };
  const seeded = {
    categories: financeKeys.categories(),
    paymentMethods: financeKeys.paymentMethods(),
    templates: financeKeys.templates(),
    preferences: financeKeys.preferences(),
    transactions: financeKeys.transactionList(filters),
    overview: financeKeys.overview("2026-10"),
    analytics: financeKeys.analytics("2026-10"),
    budgets: financeKeys.budgets(range),
    savingsGoals: financeKeys.savingsGoals(),
  };

  async function staleAfter(kind: FinanceWriteKind): Promise<string[]> {
    const client = new QueryClient();
    for (const key of Object.values(seeded)) client.setQueryData(key, {});
    await invalidateAfter(client, kind);
    return Object.entries(seeded)
      .filter(([, key]) => client.getQueryState(key)?.isInvalidated)
      .map(([name]) => name)
      .sort();
  }

  it("a transaction write refreshes every view derived from transactions, and nothing else", async () => {
    expect(await staleAfter("transaction")).toEqual(["analytics", "budgets", "overview", "transactions"]);
  });

  it("a budget write refreshes budgets and the overview's alerts", async () => {
    expect(await staleAfter("budget")).toEqual(["budgets", "overview"]);
  });

  it("a savings write refreshes goals and the overview's Financial Health", async () => {
    expect(await staleAfter("savings")).toEqual(["overview", "savingsGoals"]);
  });

  it.each<FinanceWriteKind>(["lookup", "preferences"])("a %s write refreshes everything", async (kind) => {
    expect(await staleAfter(kind)).toEqual(Object.keys(seeded).sort());
  });
});
