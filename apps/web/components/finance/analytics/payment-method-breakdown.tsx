"use client"

import { RankedRow } from "@/components/finance/analytics/ranked-rows"
import { RowList } from "@/components/ui/row-list"
import { rankedShares } from "@/lib/finance/analytics-display"
import type { PaymentMethodAmount } from "@/types/finance"

const MAX_VISIBLE = 6

/**
 * Payment methods, largest first, with their share of the month's expenses.
 * Past the sixth, the rest fold into one "Other" row. Bars use the neutral
 * Finance chart colour: rank and share are written out, so no legend is needed.
 */
export function PaymentMethodBreakdown({
  paymentMethods,
}: {
  paymentMethods: PaymentMethodAmount[]
}) {
  if (paymentMethods.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No expenses recorded. Payment method breakdown appears once you log expenses this month.
      </p>
    )
  }

  const { rows, other } = rankedShares(paymentMethods, (method) => method.amountKrw, MAX_VISIBLE)

  return (
    <RowList surface>
      {rows.map(({ item: method, amountKrw, sharePct }, index) => (
        <RankedRow
          key={method.paymentMethodId ?? method.paymentMethodName}
          rank={index + 1}
          name={method.paymentMethodName}
          amountKrw={amountKrw}
          sharePct={sharePct}
          barColor={null}
        />
      ))}
      {other && (
        <RankedRow
          rank={null}
          name={`Other (${other.count})`}
          amountKrw={other.amountKrw}
          sharePct={other.sharePct}
          muted
        />
      )}
    </RowList>
  )
}
