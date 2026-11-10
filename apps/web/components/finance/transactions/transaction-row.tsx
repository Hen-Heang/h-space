"use client"

import { Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/finance/base/dropdown-menu"
import { AmountText, CategoryIcon } from "@/components/finance/ui/finance-primitives"
import { shortTransactionDate, transactionAmountLabel } from "@/lib/finance/overview-display"
import { transactionCategoryLabel, transactionDetails } from "@/lib/finance/transactions-display"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/types/finance"

/**
 * One transaction as a plain row inside a day group's list: title and amount
 * on the first line, category · date on the second. The row opens the editor
 * (or toggles it in selection mode). Payment method, USD original and rate,
 * note and the time it was added sit in the row's "⋯" menu above Edit and
 * Delete, and all of them are in the editor.
 */
export function TransactionRow({
  transaction,
  onEdit,
  onDeleteRequest,
  selection,
}: {
  transaction: Transaction
  onEdit: (transaction: Transaction) => void
  onDeleteRequest: (transaction: Transaction) => void
  /** Present while the list is in selection mode: a tap toggles instead of opening the editor. */
  selection?: { selected: boolean; onToggle: (transaction: Transaction) => void }
}) {
  const isIncome = transaction.type === "income"
  const title = transaction.description || "Untitled transaction"
  const details = transactionDetails(transaction)

  return (
    <li
      className={cn(
        "flex min-w-0 items-stretch transition-colors",
        selection?.selected && "bg-primary/5",
      )}
    >
      <button
        type="button"
        role={selection ? "checkbox" : undefined}
        aria-checked={selection ? selection.selected : undefined}
        aria-label={selection ? `Select ${transaction.description}` : undefined}
        onClick={() => (selection ? selection.onToggle(transaction) : onEdit(transaction))}
        className={cn(
          "flex min-h-14 min-w-0 flex-1 cursor-pointer items-start gap-3 py-3 pl-3 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:pl-4",
          selection ? "pr-3 sm:pr-4" : "pr-1",
        )}
      >
        <CategoryIcon
          icon={transaction.categoryIcon}
          color={transaction.categoryColor}
          className="mt-0.5 size-9 rounded-lg border-0 text-base"
        />
        <span className="min-w-0 flex-1">
          {/* Title and amount share the first line; the metadata gets the full
              width below, so it stays one line on a phone. */}
          <span className="flex min-w-0 items-start justify-between gap-3">
            <span className="line-clamp-2 min-w-0 flex-1 break-words text-base font-medium leading-snug">
              {title}
            </span>
            <span
              className={cn(
                // Capped so a huge amount wraps between digit groups instead of
                // squeezing the title to nothing.
                "max-w-[55%] shrink-0 text-right text-base font-semibold leading-snug tracking-tight [overflow-wrap:anywhere] tabular-nums",
                isIncome ? "text-success" : "text-foreground",
              )}
            >
              <AmountText value={transactionAmountLabel(transaction)} />
            </span>
          </span>
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {transactionCategoryLabel(transaction)} · {shortTransactionDate(transaction.date)}
          </span>
        </span>
        {selection && (
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center self-center"
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded border-2",
                selection.selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input",
              )}
            >
              {selection.selected && <Check className="size-3.5" strokeWidth={3} />}
            </span>
          </span>
        )}
      </button>

      {!selection && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-11 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:w-12"
              aria-label={`Actions for ${transaction.description}`}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {details.length > 0 && (
              <>
                <DropdownMenuLabel className="space-y-1.5 px-2.5 py-2 sm:px-1.5">
                  {details.map((detail) => (
                    <span key={detail.label} className="block">
                      <span className="block text-sm text-muted-foreground">{detail.label}</span>
                      <span className="block break-words text-sm font-normal text-foreground">
                        {detail.value}
                      </span>
                    </span>
                  ))}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
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
    </li>
  )
}
