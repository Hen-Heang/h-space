"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TransactionSort } from "@/lib/validation/finance"
import type { Category, PaymentMethod, TransactionType } from "@/types/finance"

const TYPE_OPTIONS: { label: string; value: TransactionType | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
]

const SORT_OPTIONS: { label: string; value: TransactionSort }[] = [
  { label: "Newest first", value: "date_desc" },
  { label: "Oldest first", value: "date_asc" },
  { label: "Amount: high to low", value: "amount_desc" },
  { label: "Amount: low to high", value: "amount_asc" },
]

const FIELD_CLASS =
  "h-11 min-w-0 w-full rounded-xl border bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
const LABEL_CLASS = "text-sm font-medium text-foreground"

/**
 * Everything that narrows or orders the list, behind the one "Filters"
 * control: type, category, amount range, payment method and sort. Search
 * stays outside, always visible.
 */
export function TransactionFilterPanel({
  open,
  typeFilter,
  onTypeChange,
  categories,
  categoryFilter,
  onCategoryChange,
  paymentMethods,
  paymentMethodFilter,
  onPaymentMethodChange,
  amountMin,
  onAmountMinChange,
  amountMax,
  onAmountMaxChange,
  sort,
  onSortChange,
  activeFilterCount,
  onClear,
}: {
  open: boolean
  typeFilter: TransactionType | undefined
  onTypeChange: (value: TransactionType | undefined) => void
  categories: Category[]
  categoryFilter: string
  onCategoryChange: (value: string) => void
  paymentMethods: PaymentMethod[]
  paymentMethodFilter: string
  onPaymentMethodChange: (value: string) => void
  amountMin: string
  onAmountMinChange: (value: string) => void
  amountMax: string
  onAmountMaxChange: (value: string) => void
  sort: TransactionSort
  onSortChange: (value: TransactionSort) => void
  activeFilterCount: number
  onClear: () => void
}) {
  if (!open) return null

  return (
    <div
      className="space-y-4 rounded-2xl border bg-card p-4"
      role="group"
      aria-label="Transaction filters"
    >
      <div className="space-y-1.5">
        <p id="filter-type-label" className={LABEL_CLASS}>
          Type
        </p>
        <div
          className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1"
          role="group"
          aria-labelledby="filter-type-label"
        >
          {TYPE_OPTIONS.map((option) => {
            const active = typeFilter === option.value
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => onTypeChange(option.value)}
                aria-pressed={active}
                className={cn(
                  "min-h-11 rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9 [@media(pointer:coarse)]:min-h-11",
                  active
                    ? "bg-card font-semibold text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="filter-category" className={LABEL_CLASS}>
            Category
          </label>
          <select
            id="filter-category"
            value={categoryFilter}
            onChange={(event) => onCategoryChange(event.target.value)}
            aria-label="Filter by category"
            className={FIELD_CLASS}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon ? `${category.icon} ` : ""}
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="filter-payment-method" className={LABEL_CLASS}>
            Payment method
          </label>
          <select
            id="filter-payment-method"
            value={paymentMethodFilter}
            onChange={(event) => onPaymentMethodChange(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">All methods</option>
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.icon ? `${method.icon} ` : ""}
                {method.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="filter-amount-min" className={LABEL_CLASS}>
            Min amount (₩)
          </label>
          <input
            id="filter-amount-min"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            value={amountMin}
            onChange={(event) => onAmountMinChange(event.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="filter-amount-max" className={LABEL_CLASS}>
            Max amount (₩)
          </label>
          <input
            id="filter-amount-max"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="No limit"
            value={amountMax}
            onChange={(event) => onAmountMaxChange(event.target.value)}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="space-y-1.5 min-[360px]:w-1/2 min-[360px]:pr-1.5">
        <label htmlFor="filter-sort" className={LABEL_CLASS}>
          Sort by
        </label>
        <select
          id="filter-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as TransactionSort)}
          className={FIELD_CLASS}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
          Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
        </button>
      )}
    </div>
  )
}
