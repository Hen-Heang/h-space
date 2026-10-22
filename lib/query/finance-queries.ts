"use client";

import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTemplate,
  deleteTemplate,
  getPreferences,
  listCategories,
  listPaymentMethods,
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
};

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
