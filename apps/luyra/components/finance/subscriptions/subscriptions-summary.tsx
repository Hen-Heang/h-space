"use client";

import { CalendarClock, Clock3, Repeat, Wallet } from "lucide-react";
import { FinanceMetricCard, FinanceMetricGrid } from "@/components/finance/ui/finance-primitives";
import { krw } from "@/lib/finance-format";
import type { DetectedSubscription } from "@/types/finance";

export function SubscriptionsSummary({ subscriptions }: { subscriptions: DetectedSubscription[] }) {
  const active = subscriptions.filter((s) => s.status !== "cancelled");
  const monthlyKrw = active.reduce((sum, s) => sum + Math.round(s.estimatedYearlyCostKrw / 12), 0);
  const yearlyKrw = active.reduce((sum, s) => sum + s.estimatedYearlyCostKrw, 0);
  const planToCancelCount = subscriptions.filter((s) => s.status === "plan_to_cancel").length;

  return (
    <FinanceMetricGrid>
      <FinanceMetricCard label="Monthly cost" value={`${krw.format(monthlyKrw)}/mo`} detail="Estimated, excluding cancelled" icon={Wallet} />
      <FinanceMetricCard label="Yearly cost" value={krw.format(yearlyKrw)} detail="Estimated across the year" icon={CalendarClock} />
      <FinanceMetricCard label="Active" value={String(active.length)} detail="Not marked cancelled" icon={Repeat} />
      <FinanceMetricCard
        label="Marked for cancellation"
        value={String(planToCancelCount)}
        detail={planToCancelCount > 0 ? "Review and cancel these" : "Nothing pending"}
        icon={Clock3}
        tone={planToCancelCount > 0 ? "warning" : "neutral"}
      />
    </FinanceMetricGrid>
  );
}
