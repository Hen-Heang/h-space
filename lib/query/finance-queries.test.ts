import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  financeKeys,
  invalidateAfter,
  placeTransactionInLists,
  transactionListQuery,
  type FinanceWriteKind,
  type TransactionListFilters,
} from "@/lib/query/finance-queries";
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
    recurring: financeKeys.recurring(),
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

  it("a recurring-rule write refreshes rules plus every transaction-derived view", async () => {
    expect(await staleAfter("recurring")).toEqual(["analytics", "budgets", "overview", "recurring", "transactions"]);
  });

  it.each<FinanceWriteKind>(["lookup", "preferences"])("a %s write refreshes everything", async (kind) => {
    expect(await staleAfter(kind)).toEqual(Object.keys(seeded).sort());
  });
});

describe("placeTransactionInLists", () => {
  const tx = (id: string, date: string, overrides: Partial<Transaction> = {}): Transaction => ({
    id,
    date,
    type: "expense",
    categoryId: null,
    categoryName: null,
    categoryIcon: null,
    categoryColor: null,
    description: `Row ${id}`,
    amountKrw: 1000,
    currency: "KRW",
    originalAmount: null,
    exchangeRate: null,
    paymentMethodId: null,
    paymentMethodName: null,
    note: null,
    createdAt: `${date}T09:00:00Z`,
    updatedAt: `${date}T09:00:00Z`,
    ...overrides,
  });

  function seed(listFilters: TransactionListFilters, pages: { transactions: Transaction[]; hasMore: boolean }[]) {
    const client = new QueryClient();
    const key = financeKeys.transactionList(listFilters);
    client.setQueryData(key, { pages, pageParams: pages.map((_, i) => i) });
    const ids = () =>
      client
        .getQueryData<{ pages: { transactions: Transaction[] }[] }>(key)!
        .pages.map((page) => page.transactions.map((t) => t.id));
    return { client, ids };
  }

  it("inserts a new row at its date_desc position", () => {
    const { client, ids } = seed(filters, [{ transactions: [tx("a", "2026-10-20"), tx("b", "2026-10-05")], hasMore: false }]);
    placeTransactionInLists(client, tx("new", "2026-10-12"));
    expect(ids()).toEqual([["a", "new", "b"]]);
  });

  it("puts a same-day row ahead of older entries that day", () => {
    const { client, ids } = seed(filters, [{ transactions: [tx("a", "2026-10-20")], hasMore: false }]);
    placeTransactionInLists(client, tx("new", "2026-10-20", { createdAt: "2026-10-20T10:00:00Z" }));
    expect(ids()).toEqual([["new", "a"]]);
  });

  it("follows the list's sort", () => {
    const sorted = { ...filters, sort: "amount_desc" as const };
    const { client, ids } = seed(sorted, [
      { transactions: [tx("big", "2026-10-02", { amountKrw: 9000 }), tx("small", "2026-10-20", { amountKrw: 500 })], hasMore: false },
    ]);
    placeTransactionInLists(client, tx("new", "2026-10-10", { amountKrw: 3000 }));
    expect(ids()).toEqual([["big", "new", "small"]]);
  });

  it("leaves out lists whose filters it doesn't match", () => {
    const narrowed = { ...filters, type: "income" as const, search: "salary" };
    const { client, ids } = seed(narrowed, [{ transactions: [], hasMore: false }]);
    placeTransactionInLists(client, tx("new", "2026-10-12"));
    placeTransactionInLists(client, tx("other-month", "2026-11-01", { type: "income", description: "Salary" }));
    expect(ids()).toEqual([[]]);
  });

  it("matches the search case-insensitively, like the server's ilike", () => {
    const { client, ids } = seed({ ...filters, search: "coffee" }, [{ transactions: [], hasMore: false }]);
    placeTransactionInLists(client, tx("new", "2026-10-12", { description: "Morning Coffee" }));
    expect(ids()).toEqual([["new"]]);
  });

  it("doesn't append past the loaded rows while more pages remain unloaded", () => {
    const { client, ids } = seed(filters, [{ transactions: [tx("a", "2026-10-20")], hasMore: true }]);
    placeTransactionInLists(client, tx("old", "2026-10-01"));
    expect(ids()).toEqual([["a"]]);
  });

  it("appends to the end once every page is loaded", () => {
    const { client, ids } = seed(filters, [
      { transactions: [tx("a", "2026-10-20")], hasMore: true },
      { transactions: [tx("b", "2026-10-10")], hasMore: false },
    ]);
    placeTransactionInLists(client, tx("old", "2026-10-01"));
    expect(ids()).toEqual([["a"], ["b", "old"]]);
  });

  it("moves an edited row, or drops it from a list it no longer matches", () => {
    const rows = [tx("a", "2026-10-20"), tx("b", "2026-10-10"), tx("c", "2026-10-05")];
    const { client, ids } = seed(filters, [{ transactions: rows, hasMore: false }]);
    placeTransactionInLists(client, tx("a", "2026-10-07"));
    expect(ids()).toEqual([["b", "a", "c"]]);
    placeTransactionInLists(client, tx("b", "2026-09-30"));
    expect(ids()).toEqual([["a", "c"]]);
  });

  it("leaves description suggestions under the same prefix alone", () => {
    const client = new QueryClient();
    const suggestionsKey = [...financeKeys.transactions(), "suggestions", "all", "row"];
    client.setQueryData(suggestionsKey, []);
    placeTransactionInLists(client, tx("new", "2026-10-12"));
    expect(client.getQueryData(suggestionsKey)).toEqual([]);
  });
});
