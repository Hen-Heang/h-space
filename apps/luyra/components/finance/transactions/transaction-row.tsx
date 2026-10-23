"use client";

import { Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryIcon } from "@/components/finance/ui/finance-primitives";
import { krw, usd } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

function formatTime(createdAt: string): string | null {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function TransactionRow({
  transaction,
  onEdit,
  onDeleteRequest,
  selection,
}: {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDeleteRequest: (transaction: Transaction) => void;
  /** Present while the list is in selection mode: a tap toggles instead of opening the editor. */
  selection?: { selected: boolean; onToggle: (transaction: Transaction) => void };
}) {
  const isIncome = transaction.type === "income";
  const time = formatTime(transaction.createdAt);
  const metaParts = [
    transaction.categoryName ?? (isIncome ? "Income" : "Uncategorized"),
    transaction.paymentMethodName,
    transaction.note,
  ].filter(Boolean);
  const meta = metaParts.join(" · ");
  const activate = () => (selection ? selection.onToggle(transaction) : onEdit(transaction));

  return (
    <div
      role={selection ? "checkbox" : "button"}
      aria-checked={selection ? selection.selected : undefined}
      aria-label={selection ? `Select ${transaction.description}` : undefined}
      tabIndex={0}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
      className={cn(
        "flex min-h-16 cursor-pointer items-start gap-2 px-3 py-3 transition-colors hover:bg-secondary/50 active:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:items-center sm:gap-3 sm:px-4",
        selection?.selected && "bg-primary/5 hover:bg-primary/10"
      )}
    >
      <CategoryIcon icon={transaction.categoryIcon} color={transaction.categoryColor} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={transaction.description}>
            {transaction.description}
          </p>
          <p
            className={cn(
              "max-w-[58%] shrink-0 whitespace-nowrap text-right font-mono text-sm font-semibold tabular-nums",
              isIncome ? "text-success" : "text-foreground"
            )}
          >
            {isIncome ? "+" : "−"}
            {krw.format(transaction.amountKrw)}
          </p>
        </div>

        <div className="mt-1 flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <p className="min-w-0 flex-1 truncate" title={meta}>
            {meta}
          </p>
          <div className="ml-auto flex max-w-full flex-wrap justify-end gap-x-2 text-right text-[11px] tabular-nums sm:text-xs">
            {transaction.currency === "USD" && transaction.originalAmount !== null && (
              <span className="break-words">
                {usd.format(transaction.originalAmount)}
                {transaction.exchangeRate !== null ? ` @ ${krw.format(transaction.exchangeRate)}` : ""}
              </span>
            )}
            {time && <span>{time}</span>}
          </div>
        </div>
      </div>

      {selection ? (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center",
            selection.selected ? "text-primary" : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded border-2",
              selection.selected ? "border-primary bg-primary text-primary-foreground" : "border-input"
            )}
          >
            {selection.selected && <Check className="size-3.5" strokeWidth={3} />}
          </span>
        </span>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(event) => event.stopPropagation()}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary active:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Actions for ${transaction.description}`}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem onSelect={() => onEdit(transaction)}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onDeleteRequest(transaction)}>
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
