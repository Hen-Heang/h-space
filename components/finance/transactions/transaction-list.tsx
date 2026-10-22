"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ReceiptText, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinanceEmptyState, FinanceErrorState, MonthSelector } from "@/components/finance/ui/finance-primitives";
import { TransactionRow } from "@/components/finance/transactions/transaction-row";
import { TransactionSheet } from "@/components/finance/transactions/transaction-sheet";
import { DeleteTransactionDialog } from "@/components/finance/transactions/delete-transaction-dialog";
import { TransactionFilterPanel } from "@/components/finance/transactions/transaction-filter-panel";
import { emitTransactionChanged, onTransactionChanged } from "@/lib/finance-events";
import { cn } from "@/lib/utils";
import { monthBounds, monthLabel } from "@/lib/finance-month";
import { krw } from "@/lib/finance-format";
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from "@/lib/api/finance";
import { useCategories, usePaymentMethods, useTemplateActions, useTemplates } from "@/lib/query/finance-queries";
import type { CreateTransactionInput, TransactionSort } from "@/lib/validation/finance";
import type { Transaction, TransactionType } from "@/types/finance";

const TYPE_TABS: { label: string; value: TransactionType | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
];

function parseAmount(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function groupByDate(
  transactions: Transaction[]
): { date: string; items: Transaction[]; incomeKrw: number; expenseKrw: number }[] {
  const order: string[] = [];
  const groups = new Map<string, { items: Transaction[]; incomeKrw: number; expenseKrw: number }>();
  for (const transaction of transactions) {
    if (!groups.has(transaction.date)) {
      order.push(transaction.date);
      groups.set(transaction.date, { items: [], incomeKrw: 0, expenseKrw: 0 });
    }
    const group = groups.get(transaction.date)!;
    group.items.push(transaction);
    if (transaction.type === "income") group.incomeKrw += transaction.amountKrw;
    else group.expenseKrw += transaction.amountKrw;
  }
  return order.map((date) => ({ date, ...groups.get(date)! }));
}

function dateHeading(date: string): string {
  const today = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA");
  if (date === today) return "Today";
  if (date === yesterday) return "Yesterday";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function ListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading transactions">
      {[0, 1].map((group) => (
        <div key={group} className="space-y-2">
          <div className="h-4 w-32 rounded bg-secondary motion-safe:animate-pulse" />
          <div className="overflow-hidden rounded-2xl border bg-card">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 border-b border-border p-4 last:border-b-0">
                <div className="size-10 shrink-0 rounded-xl bg-secondary motion-safe:animate-pulse" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded bg-secondary motion-safe:animate-pulse" />
                  <div className="h-3 w-1/4 rounded bg-secondary motion-safe:animate-pulse" />
                </div>
                <div className="h-3.5 w-16 shrink-0 rounded bg-secondary motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TransactionList() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState<TransactionType | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [amountMinInput, setAmountMinInput] = useState("");
  const [amountMaxInput, setAmountMaxInput] = useState("");
  const [amountMin, setAmountMin] = useState<number | undefined>(undefined);
  const [amountMax, setAmountMax] = useState<number | undefined>(undefined);
  const [sort, setSort] = useState<TransactionSort>("date_desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  // A failed lookup leaves its picker empty; the transaction list still works.
  const { data: categories = [] } = useCategories();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: templates = [] } = useTemplates();
  const { saveTemplate, removeTemplate } = useTemplateActions();
  const [loadingMore, setLoadingMore] = useState(false);
  const [sheet, setSheet] = useState<{ mode: "create" | "edit"; transaction?: Transaction } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const requestKey = `${monthOffset}:${typeFilter ?? ""}:${categoryFilter}:${paymentMethodFilter}:${amountMin ?? ""}:${amountMax ?? ""}:${sort}:${search}:${reloadToken}`;
  const [result, setResult] = useState<{
    key: string;
    transactions: Transaction[];
    hasMore: boolean;
    pagesLoaded: number;
    error: string | null;
    loadMoreError: string | null;
  }>({ key: "", transactions: [], hasMore: false, pagesLoaded: 0, error: null, loadMoreError: null });
  const loading = result.key !== requestKey;

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const timeout = setTimeout(() => setAmountMin(parseAmount(amountMinInput)), 300);
    return () => clearTimeout(timeout);
  }, [amountMinInput]);

  useEffect(() => {
    const timeout = setTimeout(() => setAmountMax(parseAmount(amountMaxInput)), 300);
    return () => clearTimeout(timeout);
  }, [amountMaxInput]);

  useEffect(() => {
    let active = true;
    const { start, end } = monthBounds(monthOffset);
    listTransactions({
      start,
      end,
      type: typeFilter,
      categoryId: categoryFilter || undefined,
      paymentMethodId: paymentMethodFilter || undefined,
      amountMin,
      amountMax,
      sort,
      search: search || undefined,
      page: 0,
    })
      .then((data) => {
        if (active) {
          setResult({
            key: requestKey,
            transactions: data.transactions,
            hasMore: data.hasMore,
            pagesLoaded: 1,
            error: null,
            loadMoreError: null,
          });
        }
      })
      .catch(() => {
        if (active) {
          setResult({
            key: requestKey,
            transactions: [],
            hasMore: false,
            pagesLoaded: 0,
            error: "We couldn't load your transactions. Try again in a moment.",
            loadMoreError: null,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [requestKey, monthOffset, typeFilter, categoryFilter, paymentMethodFilter, amountMin, amountMax, sort, search]);

  useEffect(() => onTransactionChanged(() => setReloadToken((token) => token + 1)), []);

  const grouped = useMemo(() => groupByDate(result.transactions), [result.transactions]);
  const advancedFilterCount = [paymentMethodFilter, amountMin !== undefined, amountMax !== undefined].filter(Boolean).length;
  const isFiltered = Boolean(search || typeFilter || categoryFilter || advancedFilterCount > 0);

  function clearAdvancedFilters() {
    setPaymentMethodFilter("");
    setAmountMinInput("");
    setAmountMaxInput("");
    setAmountMin(undefined);
    setAmountMax(undefined);
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const { start: rangeStart, end } = monthBounds(monthOffset);
      const data = await listTransactions({
        start: rangeStart,
        end,
        type: typeFilter,
        categoryId: categoryFilter || undefined,
        paymentMethodId: paymentMethodFilter || undefined,
        amountMin,
        amountMax,
        sort,
        search: search || undefined,
        page: result.pagesLoaded,
      });
      setResult((prev) => ({
        ...prev,
        transactions: [...prev.transactions, ...data.transactions],
        hasMore: data.hasMore,
        pagesLoaded: prev.pagesLoaded + 1,
        loadMoreError: null,
      }));
    } catch {
      setResult((prev) => ({ ...prev, loadMoreError: "Couldn't load more transactions." }));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSave(input: CreateTransactionInput) {
    if (sheet?.mode === "edit" && sheet.transaction) {
      await updateTransaction(sheet.transaction.id, input);
    } else {
      await createTransaction(input);
    }
    setReloadToken((token) => token + 1);
    emitTransactionChanged();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
      setReloadToken((token) => token + 1);
      emitTransactionChanged();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <MonthSelector
          label={monthLabel(monthOffset)}
          onPrevious={() => setMonthOffset((offset) => offset - 1)}
          onNext={() => setMonthOffset((offset) => offset + 1)}
          nextDisabled={monthOffset >= 0}
          ariaLabel="Transactions month selector"
          size="sm"
        />
        <Button size="sm" className="min-h-11 shrink-0 px-3" onClick={() => setSheet({ mode: "create" })} aria-label="Add transaction">
          <Plus />
          <span className="hidden min-[400px]:inline">Add transaction</span>
        </Button>
      </div>

      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <div className="relative w-full min-w-0 flex-1 sm:min-w-48">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search description…"
            aria-label="Search transactions"
            className="h-11 w-full rounded-xl border bg-card pl-9 pr-11 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary active:bg-secondary"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex">
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
          className="h-11 min-w-0 w-full max-w-full rounded-xl border bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:max-w-56 sm:text-sm"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon ? `${category.icon} ` : ""}
              {category.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls="transaction-advanced-filters"
          className={cn(
            "relative flex h-11 min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors",
            filtersOpen || advancedFilterCount > 0
              ? "border-primary/40 bg-primary/10 text-primary"
              : "bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {advancedFilterCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {advancedFilterCount}
            </span>
          )}
        </button>
        </div>
      </div>

      <div id="transaction-advanced-filters">
        <TransactionFilterPanel
          open={filtersOpen}
          paymentMethods={paymentMethods}
          paymentMethodFilter={paymentMethodFilter}
          onPaymentMethodChange={setPaymentMethodFilter}
          amountMin={amountMinInput}
          onAmountMinChange={setAmountMinInput}
          amountMax={amountMaxInput}
          onAmountMaxChange={setAmountMaxInput}
          sort={sort}
          onSortChange={setSort}
          activeFilterCount={advancedFilterCount}
          onClear={clearAdvancedFilters}
        />
      </div>

      <div className="flex gap-1 rounded-xl border bg-card p-1">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setTypeFilter(tab.value)}
            className={cn(
              "min-h-11 flex-1 rounded-lg text-sm font-medium transition-colors sm:min-h-9",
              typeFilter === tab.value ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {result.error ? (
        <FinanceErrorState
          title="Transactions unavailable"
          description={result.error}
          onRetry={() => setReloadToken((token) => token + 1)}
        />
      ) : loading ? (
        <ListSkeleton />
      ) : result.transactions.length === 0 ? (
        <FinanceEmptyState
          icon={ReceiptText}
          title={isFiltered ? "No matching transactions" : "No transactions yet"}
          description={
            isFiltered
              ? "Try a different search, category, or amount range."
              : "Add your first income or expense to start tracking this month."
          }
          action={
            isFiltered ? undefined : (
              <Button variant="outline" size="sm" onClick={() => setSheet({ mode: "create" })}>
                <Plus />
                Add transaction
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(({ date, items, incomeKrw, expenseKrw }) => (
            <div key={date}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 py-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dateHeading(date)}</p>
                <div className="flex gap-3 text-xs font-semibold tabular-nums">
                  {incomeKrw > 0 && <span className="text-success">+{krw.format(incomeKrw)}</span>}
                  {expenseKrw > 0 && <span className="text-foreground">−{krw.format(expenseKrw)}</span>}
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border bg-card">
                <div className="divide-y divide-border">
                  {items.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      onEdit={(t) => setSheet({ mode: "edit", transaction: t })}
                      onDeleteRequest={setDeleteTarget}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {result.loadMoreError && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
              {result.loadMoreError}
            </p>
          )}

          {result.hasMore && (
            <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore} className="min-h-11 w-full">
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      )}

      <TransactionSheet
        mode={sheet?.mode ?? "create"}
        transaction={sheet?.transaction}
        categories={categories}
        paymentMethods={paymentMethods}
        templates={templates}
        open={sheet !== null}
        onOpenChange={(open) => !open && setSheet(null)}
        onSave={handleSave}
        onSaveTemplate={saveTemplate}
        onDeleteTemplate={removeTemplate}
      />

      <DeleteTransactionDialog
        isOpen={deleteTarget !== null}
        isDeleting={deleting}
        description={deleteTarget?.description ?? ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
