"use client"

import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  CheckCircle2,
  ListChecks,
  Plus,
  ReceiptText,
  Repeat,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { Button } from "@/components/finance/base/button"
import {
  AmountText,
  FinanceEmptyState,
  FinanceErrorState,
  MonthSelector,
} from "@/components/finance/ui/finance-primitives"
import { RowList } from "@/components/ui/row-list"
import { TransactionRow } from "@/components/finance/transactions/transaction-row"
import { TransactionSheet } from "@/components/finance/transactions/transaction-sheet"
import { DeleteTransactionDialog } from "@/components/finance/transactions/delete-transaction-dialog"
import { RecurringSheet } from "@/components/finance/transactions/recurring-sheet"
import { BulkActionBar } from "@/components/finance/transactions/bulk-action-bar"
import { TransactionFilterPanel } from "@/components/finance/transactions/transaction-filter-panel"
import { emitTransactionChanged } from "@/lib/finance-events"
import { cn } from "@/lib/utils"
import { monthBounds, monthLabel } from "@/lib/finance-month"
import { krw } from "@/lib/finance-format"
import {
  activeFilterCount as countActiveFilters,
  activeFilterSummary,
  dayHeading,
  groupTransactionsByDate,
} from "@/lib/finance/transactions-display"
import { ApiError } from "@/lib/api/finance-client"
import { getUserId } from "@/lib/auth-store"
import {
  bulkTransactionAction,
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/lib/api/finance"
import {
  placeTransactionInLists,
  useCategories,
  usePaymentMethods,
  useTemplateActions,
  useTemplates,
  useTransactionList,
} from "@/lib/query/finance-queries"
import type {
  BulkTransactionActionInput,
  CreateTransactionInput,
  TransactionSort,
} from "@/lib/validation/finance"
import type { Transaction, TransactionType } from "@/types/finance"

function parseAmount(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

// Day headers stick just below the shell's own sticky header while their
// group scrolls under them (AppShell sets --shell-header-h).
const DAY_HEADER_CLASS =
  "sticky top-[var(--shell-header-h,0px)] z-10 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border bg-background px-3 py-2 sm:px-4"

function ListSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading transactions">
      {[0, 1].map((group) => (
        <div key={group}>
          <div className="border-b border-border px-3 py-2.5 sm:px-4">
            <div className="h-4 w-32 rounded bg-secondary motion-safe:animate-pulse" />
          </div>
          <div className="divide-y divide-border">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-start gap-3 px-3 py-3 sm:px-4">
                <div className="size-9 shrink-0 rounded-lg bg-secondary motion-safe:animate-pulse" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <div className="h-4 w-1/3 rounded bg-secondary motion-safe:animate-pulse" />
                  <div className="h-3.5 w-1/4 rounded bg-secondary motion-safe:animate-pulse" />
                </div>
                <div className="h-4 w-16 shrink-0 rounded bg-secondary motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The Transactions page. One add path: the Finance layout's floating
 * "Add transaction" (a + on phones, a labelled pill from tablet width), so the
 * toolbar here only holds the month, selection and recurring. Search is
 * always visible; every other narrowing control is behind "Filters".
 */
export function TransactionList() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [typeFilter, setTypeFilter] = useState<TransactionType | undefined>(undefined)
  const [categoryFilter, setCategoryFilter] = useState("")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("")
  const [amountMinInput, setAmountMinInput] = useState("")
  const [amountMaxInput, setAmountMaxInput] = useState("")
  const [amountMin, setAmountMin] = useState<number | undefined>(undefined)
  const [amountMax, setAmountMax] = useState<number | undefined>(undefined)
  const [sort, setSort] = useState<TransactionSort>("date_desc")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  // A failed lookup leaves its picker empty; the transaction list still works.
  const { data: categories = [] } = useCategories()
  const { data: paymentMethods = [] } = usePaymentMethods()
  const { data: templates = [] } = useTemplates()
  const { saveTemplate, removeTemplate } = useTemplateActions()
  const [sheet, setSheet] = useState<{ mode: "create" | "edit"; transaction?: Transaction } | null>(
    null,
  )
  const queryClient = useQueryClient()
  const [recurringOpen, setRecurringOpen] = useState(false)
  // null = not selecting; otherwise the ids picked in selection mode.
  const [selection, setSelection] = useState<Set<string> | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<{
    tone: "success" | "error"
    text: string
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { start, end } = monthBounds(monthOffset)
  // Each distinct filter set is its own cache entry, so flipping back to a
  // month or filter already seen renders instantly. Writes anywhere refresh
  // every entry via the transaction-changed invalidation in QueryProvider.
  const list = useTransactionList({
    start,
    end,
    type: typeFilter,
    categoryId: categoryFilter || undefined,
    paymentMethodId: paymentMethodFilter || undefined,
    amountMin,
    amountMax,
    sort,
    search: search || undefined,
  })
  const transactions = useMemo(
    () => list.data?.pages.flatMap((page) => page.transactions) ?? [],
    [list.data],
  )
  const loading = list.isPending
  // A failed background refresh or "Load more" keeps the rows already shown;
  // only a first load with nothing to show becomes the full error state.
  const loadError = list.isError && !list.data

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    const timeout = setTimeout(() => setAmountMin(parseAmount(amountMinInput)), 300)
    return () => clearTimeout(timeout)
  }, [amountMinInput])

  useEffect(() => {
    const timeout = setTimeout(() => setAmountMax(parseAmount(amountMaxInput)), 300)
    return () => clearTimeout(timeout)
  }, [amountMaxInput])

  const grouped = useMemo(() => groupTransactionsByDate(transactions), [transactions])
  const filterState = {
    type: typeFilter,
    categoryId: categoryFilter,
    paymentMethodId: paymentMethodFilter,
    amountMin,
    amountMax,
  }
  const filterCount = countActiveFilters(filterState)
  const filterSummary = activeFilterSummary(filterState, categories, paymentMethods)
  const isFiltered = Boolean(search || filterCount > 0)

  // Only rows still on screen count as selected, so changing a filter or
  // month can never act on transactions the user can no longer see.
  const selectedTransactions = useMemo(
    () => (selection ? transactions.filter((transaction) => selection.has(transaction.id)) : []),
    [selection, transactions],
  )
  const selectedTypes = useMemo(
    () => new Set(selectedTransactions.map((t) => t.type)),
    [selectedTransactions],
  )

  function toggleSelected(transaction: Transaction) {
    setSelection((prev) => {
      const next = new Set(prev)
      if (next.has(transaction.id)) next.delete(transaction.id)
      else next.add(transaction.id)
      return next
    })
  }

  async function runBulk(input: BulkTransactionActionInput, done: (affected: number) => string) {
    setBulkBusy(true)
    setBulkMessage(null)
    try {
      const { affected } = await bulkTransactionAction(input)
      setSelection(null)
      setBulkMessage({ tone: "success", text: done(affected) })
      emitTransactionChanged()
    } catch (error) {
      setBulkMessage({
        tone: "error",
        text:
          error instanceof ApiError && error.status !== undefined && error.status < 500
            ? error.message
            : "Couldn't update those transactions. Nothing was changed — try again.",
      })
    } finally {
      setBulkBusy(false)
    }
  }

  const countLabel = (count: number) => `${count} ${count === 1 ? "transaction" : "transactions"}`

  // Clears every filter in the panel; search and sort are left as they are.
  function clearFilters() {
    setTypeFilter(undefined)
    setCategoryFilter("")
    setPaymentMethodFilter("")
    setAmountMinInput("")
    setAmountMaxInput("")
    setAmountMin(undefined)
    setAmountMax(undefined)
  }

  // The saved row shows at once; the emitted event then refreshes every
  // cached list (see QueryProvider), which has the final say.
  async function handleSave(input: CreateTransactionInput) {
    const userId = getUserId()
    const saved =
      sheet?.mode === "edit" && sheet.transaction
        ? await updateTransaction(sheet.transaction.id, input)
        : await createTransaction(input)
    placeTransactionInLists(queryClient, saved, userId)
    emitTransactionChanged()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTransaction(deleteTarget.id)
      setDeleteTarget(null)
      emitTransactionChanged()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthSelector
          label={monthLabel(monthOffset)}
          onPrevious={() => setMonthOffset((offset) => offset - 1)}
          onNext={() => setMonthOffset((offset) => offset + 1)}
          nextDisabled={monthOffset >= 0}
          ariaLabel="Transactions month selector"
          size="sm"
        />
        <div className="ml-auto flex shrink-0 gap-2">
          <Button
            variant={selection ? "secondary" : "ghost"}
            size="sm"
            className="min-h-11 px-3"
            onClick={() => {
              setBulkMessage(null)
              setSelection((prev) => (prev ? null : new Set()))
            }}
            disabled={transactions.length === 0 && !selection}
            aria-pressed={selection !== null}
            aria-label={selection ? "Exit selection" : "Select transactions"}
          >
            <ListChecks />
            <span className="hidden sm:inline">{selection ? "Done" : "Select"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 px-3"
            onClick={() => setRecurringOpen(true)}
            aria-label="Recurring transactions"
          >
            <Repeat />
            <span className="hidden sm:inline">Recurring</span>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
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
                className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary active:bg-secondary [@media(pointer:coarse)]:size-11 [@media(pointer:coarse)]:right-0"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="transaction-advanced-filters"
            className={cn(
              "flex h-11 min-h-11 shrink-0 items-center gap-1.5 rounded-xl border bg-card px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              filtersOpen || filterCount > 0
                ? "border-primary/40 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
            {filterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {filterCount}
                <span className="sr-only"> active</span>
              </span>
            )}
          </button>
        </div>

        {!filtersOpen && filterSummary.length > 0 && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <p className="min-w-0 break-words">
              <span className="sr-only">Filtered by </span>
              {filterSummary.join(" · ")}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center rounded-md px-1 font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div id="transaction-advanced-filters">
        <TransactionFilterPanel
          open={filtersOpen}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          categories={categories}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          paymentMethods={paymentMethods}
          paymentMethodFilter={paymentMethodFilter}
          onPaymentMethodChange={setPaymentMethodFilter}
          amountMin={amountMinInput}
          onAmountMinChange={setAmountMinInput}
          amountMax={amountMaxInput}
          onAmountMaxChange={setAmountMaxInput}
          sort={sort}
          onSortChange={setSort}
          activeFilterCount={filterCount}
          onClear={clearFilters}
        />
      </div>

      {selection && (
        <BulkActionBar
          selectedCount={selectedTransactions.length}
          selectedTypes={selectedTypes}
          visibleCount={transactions.length}
          categories={categories}
          busy={bulkBusy}
          onSelectAll={() =>
            setSelection(new Set(transactions.map((transaction) => transaction.id)))
          }
          onCancel={() => setSelection(null)}
          onDelete={() =>
            runBulk(
              { action: "delete", ids: selectedTransactions.map((t) => t.id) },
              (n) => `Deleted ${countLabel(n)}.`,
            )
          }
          onRecategorize={(categoryId) =>
            runBulk(
              { action: "recategorize", ids: selectedTransactions.map((t) => t.id), categoryId },
              (n) =>
                `Moved ${countLabel(n)} to ${categories.find((c) => c.id === categoryId)?.name ?? "No category"}.`,
            )
          }
        />
      )}

      {bulkMessage && (
        <p
          role={bulkMessage.tone === "error" ? "alert" : "status"}
          className={cn(
            "rounded-xl px-4 py-3 text-sm",
            bulkMessage.tone === "error"
              ? "border border-destructive/30 bg-destructive/5 text-destructive"
              : "flex items-center gap-1.5 font-medium text-success",
          )}
        >
          {bulkMessage.tone === "success" && (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          )}
          {bulkMessage.text}
        </p>
      )}

      {loadError ? (
        <FinanceErrorState
          title="Transactions unavailable"
          description="We couldn't load your transactions. Try again in a moment."
          onRetry={() => void list.refetch()}
        />
      ) : loading ? (
        <ListSkeleton />
      ) : transactions.length === 0 ? (
        <FinanceEmptyState
          icon={ReceiptText}
          title={isFiltered ? "No matching transactions" : "No transactions yet"}
          description={
            isFiltered
              ? "Try a different search, category, or amount range."
              : "Add your first income or expense to start tracking this month."
          }
          action={
            isFiltered ? (
              filterCount > 0 ? (
                <Button variant="outline" size="sm" className="min-h-11" onClick={clearFilters}>
                  <X />
                  Clear filters
                </Button>
              ) : undefined
            ) : (
              <Button variant="outline" size="sm" onClick={() => setSheet({ mode: "create" })}>
                <Plus />
                Add transaction
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, items, incomeKrw, expenseKrw }) => {
            const headingId = `transactions-day-${date}`
            return (
              <section key={date} aria-labelledby={headingId} className="min-w-0">
                <div className={DAY_HEADER_CLASS}>
                  <h2 id={headingId} className="text-sm font-semibold text-foreground">
                    {dayHeading(date)}
                  </h2>
                  <p className="flex gap-3 text-sm tabular-nums text-muted-foreground">
                    {incomeKrw > 0 && (
                      <span className="font-medium text-success">
                        <span className="sr-only">Income </span>
                        <AmountText value={`+${krw.format(incomeKrw)}`} />
                      </span>
                    )}
                    {expenseKrw > 0 && (
                      <span className="font-medium text-foreground">
                        <span className="sr-only">Spent </span>
                        <AmountText value={`−${krw.format(expenseKrw)}`} />
                      </span>
                    )}
                  </p>
                </div>
                <RowList>
                  {items.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      onEdit={(t) => setSheet({ mode: "edit", transaction: t })}
                      onDeleteRequest={setDeleteTarget}
                      selection={
                        selection
                          ? { selected: selection.has(transaction.id), onToggle: toggleSelected }
                          : undefined
                      }
                    />
                  ))}
                </RowList>
              </section>
            )
          })}

          {list.isFetchNextPageError && (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              Couldn&apos;t load more transactions.
            </p>
          )}

          {list.hasNextPage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void list.fetchNextPage()}
              disabled={list.isFetchingNextPage}
              className="min-h-11 w-full"
            >
              {list.isFetchingNextPage ? "Loading…" : "Load more"}
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

      <RecurringSheet
        open={recurringOpen}
        onOpenChange={setRecurringOpen}
        categories={categories}
        paymentMethods={paymentMethods}
      />

      <DeleteTransactionDialog
        isOpen={deleteTarget !== null}
        isDeleting={deleting}
        description={deleteTarget?.description ?? ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
