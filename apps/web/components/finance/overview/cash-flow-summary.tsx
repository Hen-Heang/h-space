import { CheckCircle2, TriangleAlert } from "lucide-react"

import { AmountText } from "@/components/finance/ui/finance-primitives"
import { krw } from "@/lib/finance-format"
import {
  cashFlowPosition,
  entryCountLabel,
  flowBarWidths,
  savingsRateVerdict,
  signedKrw,
} from "@/lib/finance/overview-display"
import { cn } from "@/lib/utils"
import type { MonthTotals, SavingsRateHealth } from "@/types/finance"

const NET_TONE_CLASS = {
  positive: "text-success",
  negative: "text-destructive",
  neutral: "text-foreground",
} as const

/**
 * The Overview's lead: the month's net cash flow as the one big number, then
 * income and expenses side by side, then the savings rate as a single line.
 * One surface with dividers instead of five separate tiles.
 */
export function CashFlowSummary({
  totals,
  savingsHealth,
  monthLabel,
}: {
  totals: MonthTotals
  savingsHealth: SavingsRateHealth
  monthLabel: string
}) {
  const position = cashFlowPosition(totals.netCashFlowKrw)
  const widths = flowBarWidths(totals.totalIncomeKrw, totals.totalExpenseKrw)
  const verdict = savingsRateVerdict(savingsHealth)
  const net = signedKrw(totals.netCashFlowKrw)

  return (
    <section aria-labelledby="finance-cash-flow" className="app-surface min-w-0 overflow-hidden">
      <div className="px-4 pt-5 pb-4 sm:px-6 sm:pt-6">
        <h2 id="finance-cash-flow" className="text-sm font-medium text-muted-foreground">
          Net cash flow<span className="sr-only"> for {monthLabel}</span>
        </h2>
        <p
          className={cn(
            "mt-2 [overflow-wrap:anywhere] text-[clamp(2rem,9vw,2.75rem)] font-semibold leading-none tracking-tight tabular-nums",
            NET_TONE_CLASS[position.tone],
          )}
          data-testid="finance-net-cash-flow"
        >
          <AmountText value={net} />
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{position.label}</p>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <FlowFigure
          label="Income"
          amountKrw={totals.totalIncomeKrw}
          count={totals.incomeTransactionCount}
          width={widths.income}
          barClass="bg-success"
        />
        <FlowFigure
          label="Expenses"
          amountKrw={totals.totalExpenseKrw}
          count={totals.expenseTransactionCount}
          width={widths.expense}
          barClass="bg-destructive/70"
        />
      </dl>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border px-4 py-3 sm:px-6">
        <p className="text-sm text-muted-foreground">
          Savings rate{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {totals.savingsRatePct}%
          </span>
        </p>
        <p
          className={cn(
            "flex items-center gap-1.5 text-sm",
            verdict.tone === "warning" && "font-medium text-warning",
            verdict.tone === "positive" && "font-medium text-success",
            verdict.tone === "neutral" && "text-muted-foreground",
          )}
        >
          {verdict.tone === "warning" ? (
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          ) : verdict.tone === "positive" ? (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          ) : null}
          {verdict.text}
        </p>
      </div>
    </section>
  )
}

function FlowFigure({
  label,
  amountKrw,
  count,
  width,
  barClass,
}: {
  label: string
  amountKrw: number
  count: number
  width: number
  barClass: string
}) {
  return (
    <div className="min-w-0 px-3 py-4 xs:px-4 sm:px-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className="mt-1 [overflow-wrap:anywhere] text-base font-semibold leading-tight tracking-tight tabular-nums xs:text-lg sm:text-xl"
        title={krw.format(amountKrw)}
      >
        <AmountText value={krw.format(amountKrw)} />
      </dd>
      <dd className="mt-2" aria-hidden="true">
        <span className="block h-1.5 overflow-hidden rounded-full bg-secondary">
          <span
            className={cn("block h-full rounded-full", barClass)}
            style={{ width: `${width}%` }}
          />
        </span>
      </dd>
      <dd className="mt-1.5 text-sm text-muted-foreground">{entryCountLabel(count)}</dd>
    </div>
  )
}
