"use client"

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { AmountText } from "@/components/finance/ui/finance-primitives"
import { krw } from "@/lib/finance-format"
import { monthDelta, pointsDelta, type MonthDelta } from "@/lib/finance/analytics-display"
import { signedKrw } from "@/lib/finance/overview-display"
import { cn } from "@/lib/utils"
import type { MonthTotals } from "@/types/finance"

const DELTA_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus } as const
const DELTA_CLASS = {
  positive: "text-success",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
} as const

/**
 * Income, expenses, net cash flow and savings rate — once — each with its
 * change since last month. One surface with dividers; this replaces the four
 * tiles, the chart's totals caption and the separate Month comparison list.
 */
export function AnalyticsSummary({
  totals,
  previousTotals,
}: {
  totals: MonthTotals
  previousTotals: MonthTotals
}) {
  const net = totals.netCashFlowKrw
  return (
    <dl
      id="analytics-comparison"
      className="app-surface grid min-w-0 grid-cols-2 gap-px overflow-hidden bg-border lg:grid-cols-4"
    >
      <Figure
        label="Income"
        value={krw.format(totals.totalIncomeKrw)}
        delta={monthDelta(totals.totalIncomeKrw, previousTotals.totalIncomeKrw)}
        was={krw.format(previousTotals.totalIncomeKrw)}
      />
      <Figure
        label="Expenses"
        value={krw.format(totals.totalExpenseKrw)}
        delta={monthDelta(totals.totalExpenseKrw, previousTotals.totalExpenseKrw, {
          lowerIsBetter: true,
        })}
        was={krw.format(previousTotals.totalExpenseKrw)}
      />
      <Figure
        label="Net cash flow"
        value={signedKrw(net)}
        valueClass={net > 0 ? "text-success" : net < 0 ? "text-destructive" : undefined}
        delta={monthDelta(net, previousTotals.netCashFlowKrw)}
        was={signedKrw(previousTotals.netCashFlowKrw)}
      />
      <Figure
        label="Savings rate"
        value={`${totals.savingsRatePct}%`}
        delta={
          totals.totalIncomeKrw > 0
            ? pointsDelta(totals.savingsRatePct, previousTotals.savingsRatePct)
            : null
        }
        note={totals.totalIncomeKrw > 0 ? undefined : "Add income to calculate"}
        was={`${previousTotals.savingsRatePct}%`}
      />
    </dl>
  )
}

function Figure({
  label,
  value,
  valueClass,
  delta,
  note,
  was,
}: {
  label: string
  value: string
  valueClass?: string
  delta: MonthDelta | null
  note?: string
  was: string
}) {
  const Icon = delta ? DELTA_ICON[delta.direction] : null
  return (
    <div className="min-w-0 bg-card px-3 py-4 xs:px-4 sm:px-5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 [overflow-wrap:anywhere] text-lg font-semibold leading-tight tracking-tight tabular-nums sm:text-xl",
          valueClass,
        )}
        title={value}
      >
        <AmountText value={value} />
      </dd>
      {delta && Icon ? (
        <dd
          className={cn(
            "mt-1.5 flex items-start gap-1 text-sm font-medium",
            DELTA_CLASS[delta.tone],
          )}
        >
          <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{delta.text}</span>
        </dd>
      ) : note ? (
        <dd className="mt-1.5 text-sm text-muted-foreground">{note}</dd>
      ) : null}
      <dd className="mt-0.5 [overflow-wrap:anywhere] text-sm text-muted-foreground tabular-nums">
        {was} last month
      </dd>
    </div>
  )
}
