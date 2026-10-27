"use client";

import Link from "next/link";
import { ArrowRight, PiggyBank } from "lucide-react";
import { FinanceEmptyState, FinanceProgress } from "@/components/finance/ui/finance-primitives";
import { buttonVariants } from "@/components/ui/button";
import { usd } from "@/lib/finance-format";
import type { SavingsProgress } from "@/types/finance";

export function ReviewSavingsProgressCard({ progress }: { progress: SavingsProgress }) {
  if (progress.goalsCount === 0) {
    return (
      <FinanceEmptyState
        icon={PiggyBank}
        title="No savings goals yet"
        description="Create a goal to track progress here month over month."
        action={
          <Link href="/finance/savings" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open Savings
          </Link>
        }
      />
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Saved of combined targets</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {usd.format(progress.totalSavedUsd)}
            <span className="ml-1 text-sm font-medium text-muted-foreground">/ {usd.format(progress.totalTargetUsd)}</span>
          </p>
        </div>
        <p className="text-sm font-semibold text-foreground">{progress.overallPct}%</p>
      </div>
      <div className="mt-3">
        <FinanceProgress value={progress.overallPct} label={`${progress.overallPct}% of combined savings targets reached`} tone="positive" />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {progress.goalsCount} goal{progress.goalsCount === 1 ? "" : "s"}
          {progress.goalsReachedCount > 0 ? ` · ${progress.goalsReachedCount} reached` : ""}
        </span>
        <Link href="/finance/savings" className="inline-flex items-center gap-1 font-semibold text-foreground underline-offset-4 hover:underline">
          View goals <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
