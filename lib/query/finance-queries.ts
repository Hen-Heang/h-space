"use client";

import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  createTemplate,
  deleteTemplate,
  getAnalyticsSummary,
  getFinanceOverview,
  getPreferences,
  listBudgets,
  listCategories,
  listPaymentMethods,
  listSavingsGoals,
  listTemplates,
  listTransactions,
} from "@/lib/api/finance";
import type { CreateTransactionTemplateInput } from "@/lib/validation/finance";
import type { TransactionTemplate } from "@/types/finance";

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
