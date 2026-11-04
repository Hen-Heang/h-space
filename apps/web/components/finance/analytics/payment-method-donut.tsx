"use client";

import { DonutChart } from "@/components/finance/analytics/donut-chart";
import { hashSeriesColor } from "@/lib/finance-chart-colors";
import type { PaymentMethodAmount } from "@/types/finance";

const MAX_SLICES = 6;

export function PaymentMethodDonut({ paymentMethods }: { paymentMethods: PaymentMethodAmount[] }) {
  const total = paymentMethods.reduce((sum, method) => sum + method.amountKrw, 0);
  const visible = paymentMethods.slice(0, MAX_SLICES);
  const overflowAmountKrw = paymentMethods.slice(MAX_SLICES).reduce((sum, method) => sum + method.amountKrw, 0);
  const slices = [
    ...visible.map((method) => ({
      key: method.paymentMethodId ?? method.paymentMethodName,
      label: method.paymentMethodName,
      amountKrw: method.amountKrw,
      color: hashSeriesColor(method.paymentMethodId ?? method.paymentMethodName),
    })),
    ...(overflowAmountKrw > 0 ? [{ key: "other", label: "Other", amountKrw: overflowAmountKrw, color: "var(--muted-foreground)" }] : []),
  ];

  return <DonutChart slices={slices} totalKrw={total} ariaLabel="Expense share by payment method" />;
}
