import type { ReactNode } from "react"
import { AmountText, FinanceProgress } from "@/components/finance/ui/finance-primitives"
import { krw } from "@/lib/finance-format"
import { shareLabel } from "@/lib/finance/analytics-display"
import { cn } from "@/lib/utils"

/**
 * One ranked row: rank, name and amount on the first line, share of expenses
 * below, then a thin bar. Used for categories and payment methods in place of
 * a donut + legend + list. Rank and share are written out, so nothing depends
 * on telling bar colours apart.
 */
export function RankedRow({
  rank,
  leading,
  name,
  amountKrw,
  sharePct,
  barColor,
  muted = false,
}: {
  rank: number | null
  leading?: ReactNode
  name: string
  amountKrw: number
  sharePct: number
  /** A category's own colour; null for the neutral Finance chart colour. */
  barColor?: string | null
  muted?: boolean
}) {
  const share = shareLabel(sharePct)
  return (
    <li className="flex items-start gap-3 px-4 py-3 sm:px-5">
      {rank !== null ? (
        <span className="mt-0.5 w-5 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
          <span className="sr-only">Rank </span>
          {rank}
        </span>
      ) : (
        <span className="w-5 shrink-0" aria-hidden="true" />
      )}
      {leading}
      <div className="min-w-0 flex-1">
        {/* Name and amount always share the first line (as in Recent
            activity): a long name wraps, a huge amount wraps between digit
            groups within its 55% cap, so the right edge stays aligned. */}
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              "min-w-0 flex-1 break-words text-base font-medium leading-snug",
              muted && "text-muted-foreground",
            )}
          >
            {name}
          </p>
          <p className="max-w-[55%] shrink-0 text-right text-base font-semibold leading-snug tracking-tight [overflow-wrap:anywhere] tabular-nums">
            <AmountText value={krw.format(amountKrw)} />
          </p>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{share}</p>
        <div className="mt-2">
          <FinanceProgress
            value={sharePct}
            label={`${name} is ${share}`}
            color={muted ? "var(--muted-foreground)" : barColor}
          />
        </div>
      </div>
    </li>
  )
}
