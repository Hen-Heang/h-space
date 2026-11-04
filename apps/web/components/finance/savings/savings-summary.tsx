"use client";

import { CheckCircle2, PiggyBank, Target, TrendingUp } from "lucide-react";
import { FinanceMetricCard, FinanceMetricGrid } from "@/components/finance/ui/finance-primitives";
import { usd } from "@/lib/finance-format";
import type { SavingsGoal } from "@/types/finance";

export function SavingsSummary({ goals }: { goals: SavingsGoal[] }) {
  const totalSavedUsd = goals.reduce((sum, goal) => sum + goal.currentUsd, 0);
  const totalTargetUsd = goals.reduce((sum, goal) => sum + goal.targetUsd, 0);
  const overallPct = totalTargetUsd > 0 ? Math.round((totalSavedUsd / totalTargetUsd) * 100) : 0;
  const reachedCount = goals.filter((goal) => goal.targetUsd > 0 && goal.currentUsd >= goal.targetUsd).length;

  return (
    <FinanceMetricGrid>
      <FinanceMetricCard label="Total saved" value={usd.format(totalSavedUsd)} detail="Across all goals" icon={PiggyBank} tone="positive" />
      <FinanceMetricCard label="Total target" value={usd.format(totalTargetUsd)} detail={`${goals.length} goal${goals.length === 1 ? "" : "s"}`} icon={Target} />
      <FinanceMetricCard label="Overall progress" value={`${overallPct}%`} detail="Saved of combined targets" icon={TrendingUp} tone={overallPct >= 100 ? "positive" : "neutral"} />
      <FinanceMetricCard
        label="Goals reached"
        value={String(reachedCount)}
        detail={reachedCount > 0 ? "At or above target" : "Keep contributing"}
        icon={CheckCircle2}
        tone={reachedCount > 0 ? "positive" : "neutral"}
      />
    </FinanceMetricGrid>
  );
}
