"use client";

import { CircleAlert, MoreHorizontal, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryIcon, FinanceProgress } from "@/components/finance/ui/finance-primitives";
import { BUDGET_STATUS_META, BUDGET_STATUS_TEXT_CLASS } from "@/components/finance/ui/budget-status";
import { krw } from "@/lib/finance-format";
import type { BudgetPerformance } from "@/types/finance";

export function BudgetCard({
  budget,
  onEdit,
  onRemoveRequest,
}: {
  budget: BudgetPerformance;
  onEdit: (budget: BudgetPerformance) => void;
  onRemoveRequest: (budget: BudgetPerformance) => void;
}) {
  const status = BUDGET_STATUS_META[budget.status];
  const StatusIcon = status.icon;

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={budget.categoryIcon} color={budget.categoryColor} />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{budget.categoryName}</p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary active:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Actions for ${budget.categoryName} budget`}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(budget)}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onRemoveRequest(budget)}>
              <CircleAlert className="size-4" aria-hidden="true" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 flex flex-col items-start gap-1 xs:flex-row xs:items-center xs:justify-between xs:gap-2">
        <p className="min-w-0 [overflow-wrap:anywhere] font-mono text-xs text-muted-foreground tabular-nums">
          {krw.format(budget.spentKrw)} of {krw.format(budget.budgetKrw)}
        </p>
        <span className={`flex items-center gap-1 text-xs font-semibold ${BUDGET_STATUS_TEXT_CLASS[budget.status]}`}>
          <StatusIcon className="size-3.5" aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <div className="mt-3">
        <FinanceProgress value={budget.usagePct} label={`${budget.categoryName} budget ${budget.usagePct}% used`} tone={status.tone} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{budget.usagePct}% used</span>
        <span className="[overflow-wrap:anywhere] text-right font-mono tabular-nums">
          {budget.overBudget
            ? `${krw.format(Math.abs(budget.remainingKrw))} over`
            : `${krw.format(budget.remainingKrw)} remaining`}
        </span>
      </div>
    </div>
  );
}
