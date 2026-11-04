"use client";

import { CreditCard } from "lucide-react";
import { PaymentMethodDonut } from "@/components/finance/analytics/payment-method-donut";
import { FinanceEmptyState, FinanceProgress } from "@/components/finance/ui/finance-primitives";
import { krw } from "@/lib/finance-format";
import { hashSeriesColor } from "@/lib/finance-chart-colors";
import type { PaymentMethodAmount } from "@/types/finance";

const MAX_VISIBLE_SERIES = 6;

function colorForMethod(id: string | null, name: string): string {
  return hashSeriesColor(id ?? name);
}

export function PaymentMethodBreakdown({ paymentMethods }: { paymentMethods: PaymentMethodAmount[] }) {
  if (paymentMethods.length === 0) {
    return (
      <FinanceEmptyState
        icon={CreditCard}
        title="No expenses recorded"
        description="Payment method breakdown appears once you log expenses this month."
      />
    );
  }

  const total = paymentMethods.reduce((sum, method) => sum + method.amountKrw, 0);
  const visible = paymentMethods.slice(0, MAX_VISIBLE_SERIES);
  const overflow = paymentMethods.slice(MAX_VISIBLE_SERIES);
  const overflowAmountKrw = overflow.reduce((sum, method) => sum + method.amountKrw, 0);

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="border-b border-border pb-4">
        <PaymentMethodDonut paymentMethods={paymentMethods} />
      </div>

      {visible.map((method) => {
        const share = total > 0 ? (method.amountKrw / total) * 100 : 0;
        const color = colorForMethod(method.paymentMethodId, method.paymentMethodName);
        return (
          <div key={method.paymentMethodId ?? method.paymentMethodName}>
            <div className="flex flex-col items-start gap-1 xs:flex-row xs:items-center xs:justify-between xs:gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                <span className="truncate">{method.paymentMethodName}</span>
              </span>
              <span className="[overflow-wrap:anywhere] font-mono text-sm font-medium tabular-nums">{krw.format(method.amountKrw)}</span>
            </div>
            <div className="mt-1.5">
              <FinanceProgress value={share} label={`${method.paymentMethodName} is ${share.toFixed(0)}% of expenses`} color={color} />
            </div>
          </div>
        );
      })}

      {overflow.length > 0 && (
        <div className="flex flex-col items-start gap-1 border-t border-border pt-3 xs:flex-row xs:items-center xs:justify-between xs:gap-3">
          <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2.5 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden="true" />
            Other ({overflow.length})
          </span>
          <span className="[overflow-wrap:anywhere] font-mono text-sm font-medium tabular-nums text-muted-foreground">{krw.format(overflowAmountKrw)}</span>
        </div>
      )}
    </div>
  );
}
