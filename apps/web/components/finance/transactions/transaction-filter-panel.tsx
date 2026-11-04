"use client";

import { X } from "lucide-react";
import type { TransactionSort } from "@/lib/validation/finance";
import type { PaymentMethod } from "@/types/finance";

const SORT_OPTIONS: { label: string; value: TransactionSort }[] = [
  { label: "Newest first", value: "date_desc" },
  { label: "Oldest first", value: "date_asc" },
  { label: "Amount: high to low", value: "amount_desc" },
  { label: "Amount: low to high", value: "amount_asc" },
];

const FIELD_CLASS =
  "h-11 min-w-0 w-full rounded-xl border bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

export function TransactionFilterPanel({
  open,
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
  open: boolean;
  paymentMethods: PaymentMethod[];
  paymentMethodFilter: string;
  onPaymentMethodChange: (value: string) => void;
  amountMin: string;
  onAmountMinChange: (value: string) => void;
  amountMax: string;
  onAmountMaxChange: (value: string) => void;
  sort: TransactionSort;
  onSortChange: (value: TransactionSort) => void;
  activeFilterCount: number;
  onClear: () => void;
}) {
  if (!open) return null;

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4" role="group" aria-label="Advanced transaction filters">
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="filter-amount-min" className="text-xs font-medium text-muted-foreground">
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
          <label htmlFor="filter-amount-max" className="text-xs font-medium text-muted-foreground">
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

      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="filter-payment-method" className="text-xs font-medium text-muted-foreground">
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
        <div className="space-y-1.5">
          <label htmlFor="filter-sort" className="text-xs font-medium text-muted-foreground">
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
      </div>

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-destructive/10 text-xs font-semibold text-destructive"
        >
          <X className="size-3.5" aria-hidden="true" />
          Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
