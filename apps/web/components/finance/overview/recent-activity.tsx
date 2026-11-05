import Link from "next/link"
import { ArrowRight } from "lucide-react"

import {
  AmountText,
  CategoryIcon,
  FinanceSection,
} from "@/components/finance/ui/finance-primitives"
import { RowList } from "@/components/ui/row-list"
import { shortTransactionDate, transactionAmountLabel } from "@/lib/finance/overview-display"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/types/finance"

/**
 * The month's latest entries as plain rows: what, where it went, when, and
 * how much. Edit/delete, payment method, notes and USD details live on the
 * Transactions page, which every row opens.
 */
export function RecentActivity({ transactions }: { transactions: Transaction[] }) {
  return (
    <FinanceSection
      id="finance-recent-activity"
      title="Recent activity"
      action={
        <Link
          href="/finance/transactions"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          All transactions <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      }
    >
      <RowList surface>
        {transactions.map((transaction) => {
          const income = transaction.type === "income"
          const category = transaction.categoryName || (income ? "Income" : "Uncategorized")
          return (
            <li key={transaction.id}>
              {/* Title and amount share the first line; the metadata gets the
                  full width below, so on a phone it stays one line instead of
                  being squeezed beside the amount. */}
              <Link
                href="/finance/transactions"
                className="flex min-h-14 w-full min-w-0 items-start gap-3 px-3 py-3 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
              >
                <CategoryIcon
                  icon={transaction.categoryIcon}
                  color={transaction.categoryColor}
                  className="mt-0.5 size-9 rounded-lg border-0 text-base"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-start justify-between gap-3">
                    <span className="line-clamp-2 min-w-0 flex-1 break-words text-base font-medium leading-snug">
                      {transaction.description || "Untitled transaction"}
                    </span>
                    <span
                      className={cn(
                        // Capped so a huge amount wraps (between digit groups)
                        // instead of squeezing the title to nothing.
                        "max-w-[55%] shrink-0 text-right text-base font-semibold leading-snug tracking-tight [overflow-wrap:anywhere] tabular-nums",
                        income ? "text-success" : "text-foreground",
                      )}
                    >
                      <AmountText value={transactionAmountLabel(transaction)} />
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    {category} · {shortTransactionDate(transaction.date)}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </RowList>
    </FinanceSection>
  )
}
