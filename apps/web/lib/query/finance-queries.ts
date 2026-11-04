"use client";

import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import {
  createTemplate,
  deleteTemplate,
  getAnalyticsSummary,
  getDescriptionSuggestions,
  getExchangeRate,
  getFinanceOverview,
  getPreferences,
  listBudgets,
  listCategories,
  listPaymentMethods,
  listRecurringRules,
  listSavingsGoals,
  listTemplates,
  listTransactions,
} from "@/lib/api/finance";
import type { CreateTransactionTemplateInput, TransactionSort } from "@/lib/validation/finance";
import type { Transaction, TransactionTemplate, TransactionType } from "@/types/finance";

// Shared Finance lookups, cached across pages so moving between Finance
// screens (or opening quick-add) doesn't refetch the same lists every time.
// Every write to one of these goes through the matching key below — either
// invalidateQueries after the mutation, or setQueryData with the server's
// response — so the cache never outlives a change the user just made.

export const financeKeys = {
  all: ["finance"] as const,
  categories: () => [...financeKeys.all, "categories"] as const,
  paymentMethods: () => [...financeKeys.all, "payment-methods"] as const,
  templates: () => [...financeKeys.all, "templates"] as const,
  preferences: () => [...financeKeys.all, "preferences"] as const,
  // Prefix for every filtered list — invalidate this to refresh them all.
  transactions: () => [...financeKeys.all, "transactions"] as const,
  transactionList: (filters: TransactionListFilters) => [...financeKeys.transactions(), filters] as const,
  overview: (month?: string) => [...financeKeys.all, "overview", ...(month ? [month] : [])] as const,
  analytics: (month?: string) => [...financeKeys.all, "analytics", ...(month ? [month] : [])] as const,
  budgets: (range?: { start: string; end: string }) =>
    [...financeKeys.all, "budgets", ...(range ? [range] : [])] as const,
  savingsGoals: () => [...financeKeys.all, "savings-goals"] as const,
  recurring: () => [...financeKeys.all, "recurring"] as const,
  exchangeRate: () => [...financeKeys.all, "exchange-rate"] as const,
};

// What each kind of write makes stale. Writes call invalidateAfter(kind) so
// the knowledge of which screens derive from which data lives here, once.
// Lookups (categories, payment methods) and preferences appear on nearly
// every Finance screen and change rarely, so they invalidate everything;
// only queries currently on screen refetch, the rest are just marked stale.
const INVALIDATES = {
  transaction: [financeKeys.transactions(), financeKeys.overview(), financeKeys.analytics(), financeKeys.budgets()],
  budget: [financeKeys.budgets(), financeKeys.overview()],
  savings: [financeKeys.savingsGoals(), financeKeys.overview()],
  // Saving a rule due today or earlier creates transactions right away.
  recurring: [
    financeKeys.recurring(),
    financeKeys.transactions(),
    financeKeys.overview(),
    financeKeys.analytics(),
    financeKeys.budgets(),
  ],
  lookup: [financeKeys.all],
  preferences: [financeKeys.all],
} as const;

export type FinanceWriteKind = keyof typeof INVALIDATES;

export function invalidateAfter(queryClient: QueryClient, kind: FinanceWriteKind): Promise<void> {
  return Promise.all(INVALIDATES[kind].map((queryKey) => queryClient.invalidateQueries({ queryKey }))).then(() => {});
}

export function useInvalidateAfter() {
  const queryClient = useQueryClient();
  return (kind: FinanceWriteKind) => invalidateAfter(queryClient, kind);
}

export type TransactionListFilters = Omit<Parameters<typeof listTransactions>[0], "page">;

// No staleTime: transactions also arrive from outside this tab (the Telegram
// bot), so a remount always revalidates. The cached pages still render
// immediately while that happens, instead of a skeleton.
export function transactionListQuery(filters: TransactionListFilters) {
  return infiniteQueryOptions({
    queryKey: financeKeys.transactionList(filters),
    queryFn: ({ pageParam }) => listTransactions({ ...filters, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length : undefined),
  });
}

export function useTransactionList(filters: TransactionListFilters) {
  return useInfiniteQuery(transactionListQuery(filters));
}

type TransactionPage = { transactions: Transaction[]; hasMore: boolean };

// Client mirrors of the server's list filter and ORDER BY clauses
// (findTransactionsByUser), so a just-saved row lands where a refetch would
// put it.
function matchesListFilters(transaction: Transaction, filters: TransactionListFilters): boolean {
  if (transaction.date < filters.start || transaction.date >= filters.end) return false;
  if (filters.type && transaction.type !== filters.type) return false;
  if (filters.categoryId && transaction.categoryId !== filters.categoryId) return false;
  if (filters.paymentMethodId && transaction.paymentMethodId !== filters.paymentMethodId) return false;
  if (filters.amountMin !== undefined && transaction.amountKrw < filters.amountMin) return false;
  if (filters.amountMax !== undefined && transaction.amountKrw > filters.amountMax) return false;
  const search = filters.search?.trim().toLowerCase();
  if (search && !transaction.description.toLowerCase().includes(search)) return false;
  return true;
}

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const SORT_COMPARE: Record<TransactionSort, (a: Transaction, b: Transaction) => number> = {
  date_desc: (a, b) => byText(b.date, a.date) || byText(b.createdAt, a.createdAt),
  date_asc: (a, b) => byText(a.date, b.date) || byText(a.createdAt, b.createdAt),
  amount_desc: (a, b) => b.amountKrw - a.amountKrw || byText(b.date, a.date),
  amount_asc: (a, b) => a.amountKrw - b.amountKrw || byText(b.date, a.date),
};

function placeInPages(pages: TransactionPage[], transaction: Transaction, filters: TransactionListFilters): TransactionPage[] {
  const next = pages.map((page) => ({
    ...page,
    transactions: page.transactions.filter((row) => row.id !== transaction.id),
  }));
  if (!matchesListFilters(transaction, filters)) return next;

  const compare = SORT_COMPARE[filters.sort ?? "date_desc"];
  for (const page of next) {
    const at = page.transactions.findIndex((row) => compare(transaction, row) < 0);
    if (at !== -1) {
      page.transactions.splice(at, 0, transaction);
      return next;
    }
  }
  // It sorts after every loaded row, so it's only on screen when nothing is
  // left unloaded; otherwise it belongs to a page "Load more" will fetch.
  const last = next.at(-1);
  if (last && !last.hasMore) last.transactions.push(transaction);
  return next;
}

/**
 * Shows a saved transaction in every loaded list right away, from the
 * server's response, instead of after the refetch the save triggers. Any
 * old copy (an edit) is dropped first, so an edited row moves to its new
 * place or leaves a list it no longer matches. The refetch still runs and
 * has the final say.
 */
export function placeTransactionInLists(queryClient: QueryClient, transaction: Transaction): void {
  const lists = queryClient.getQueriesData<InfiniteData<TransactionPage>>({
    queryKey: financeKeys.transactions(),
    // Only the filtered lists — not the description suggestions under the same prefix.
    predicate: (query) => query.queryKey.length === 3 && typeof query.queryKey[2] === "object",
  });
  for (const [queryKey, data] of lists) {
    if (!data) continue;
    const filters = queryKey[2] as TransactionListFilters;
    queryClient.setQueryData<InfiniteData<TransactionPage>>(queryKey, {
      ...data,
      pages: placeInPages(data.pages, transaction, filters),
    });
  }
}

/**
 * Autocomplete for the description field. Keyed under the transactions
 * prefix, so any transaction write refreshes it with the lists. Previous
 * results stay on screen while the next keystroke's request is in flight.
 */
export function useDescriptionSuggestions(query: string, type: TransactionType | undefined, enabled: boolean) {
  const q = query.trim();
  return useQuery({
    queryKey: [...financeKeys.transactions(), "suggestions", type ?? "all", q.toLowerCase()] as const,
    queryFn: () => getDescriptionSuggestions(q, type),
    enabled: enabled && q.length > 0,
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

// Month views revalidate on every mount (no staleTime) for the same reason
// as the transaction list; the cached month still renders immediately.

/**
 * The overview's current month is server-rendered and handed in as
 * initialData. The short staleTime stops the first mount from re-fetching
 * what the server just rendered; invalidation after a write ignores it.
 */
export function overviewQuery(month: string) {
  return queryOptions({
    queryKey: financeKeys.overview(month),
    queryFn: () => getFinanceOverview(month),
    staleTime: 30_000,
  });
}

export function analyticsQuery(month: string) {
  return queryOptions({ queryKey: financeKeys.analytics(month), queryFn: () => getAnalyticsSummary(month) });
}

export function budgetsQuery(start: string, end: string) {
  return queryOptions({ queryKey: financeKeys.budgets({ start, end }), queryFn: () => listBudgets(start, end) });
}

export const savingsGoalsQuery = queryOptions({ queryKey: financeKeys.savingsGoals(), queryFn: listSavingsGoals });

export const recurringRulesQuery = queryOptions({ queryKey: financeKeys.recurring(), queryFn: listRecurringRules });

// Lookups change only when the user edits them here, so they can sit for a
// while; a remount after this refetches in the background without a skeleton.
const LOOKUP_STALE_MS = 5 * 60_000;

export const categoriesQuery = queryOptions({
  queryKey: financeKeys.categories(),
  queryFn: listCategories,
  staleTime: LOOKUP_STALE_MS,
});

export const paymentMethodsQuery = queryOptions({
  queryKey: financeKeys.paymentMethods(),
  queryFn: listPaymentMethods,
  staleTime: LOOKUP_STALE_MS,
});

export const templatesQuery = queryOptions({
  queryKey: financeKeys.templates(),
  queryFn: listTemplates,
  staleTime: LOOKUP_STALE_MS,
});

export const preferencesQuery = queryOptions({
  queryKey: financeKeys.preferences(),
  queryFn: getPreferences,
  staleTime: LOOKUP_STALE_MS,
});

/**
 * USD→KRW rate for the transaction sheet. The server already caches it for an
 * hour, so re-asking on every sheet open only bought an auth check and a Neon
 * round trip each time; once loaded, reopening the sheet fills it instantly.
 * The sheet's refresh button bypasses this with staleTime: 0.
 */
export const exchangeRateQuery = queryOptions({
  queryKey: financeKeys.exchangeRate(),
  queryFn: getExchangeRate,
  staleTime: 15 * 60_000,
});

export function useCategories({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ ...categoriesQuery, enabled });
}

export function usePaymentMethods({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ ...paymentMethodsQuery, enabled });
}

export function useTemplates({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ ...templatesQuery, enabled });
}

export function usePreferences() {
  return useQuery(preferencesQuery);
}

/** Template create/delete for the transaction sheet, written straight into the cache. */
export function useTemplateActions() {
  const queryClient = useQueryClient();
  const key = financeKeys.templates();

  async function saveTemplate(input: CreateTransactionTemplateInput): Promise<void> {
    const created = await createTemplate(input);
    // Only prepend to a list that actually loaded. If the initial fetch
    // failed, writing [created] would pass off one template as the whole
    // collection; refetching gets the real list instead.
    if (queryClient.getQueryData<TransactionTemplate[]>(key) === undefined) {
      await queryClient.invalidateQueries({ queryKey: key });
      return;
    }
    queryClient.setQueryData<TransactionTemplate[]>(key, (prev = []) => [created, ...prev]);
  }

  // Optimistic: the chip disappears immediately and comes back if the delete fails.
  async function removeTemplate(template: TransactionTemplate): Promise<void> {
    const previous = queryClient.getQueryData<TransactionTemplate[]>(key);
    queryClient.setQueryData<TransactionTemplate[]>(key, (prev = []) => prev.filter((t) => t.id !== template.id));
    try {
      await deleteTemplate(template.id);
    } catch {
      queryClient.setQueryData(key, previous);
    }
  }

  return { saveTemplate, removeTemplate };
}
