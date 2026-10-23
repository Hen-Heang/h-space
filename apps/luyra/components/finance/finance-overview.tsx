"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  Gauge,
  HelpCircle,
  Home,
  PiggyBank,
  Plus,
  ReceiptText,
  Scale,
  Sparkles,
  Sprout,
  Tags,
  TrendingUp,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  CategoryIcon,
  FinanceEmptyState,
  FinanceErrorState,
  AmountText,
  FinanceMetricCard,
  FinanceMetricGrid,
  FinanceProgress,
  FinanceSection,
  MonthSelector,
} from "@/components/finance/ui/finance-primitives";
import { BUDGET_STATUS_META, BUDGET_STATUS_TEXT_CLASS } from "@/components/finance/ui/budget-status";
import { ApiError } from "@/lib/api/client";
import { krw } from "@/lib/finance-format";
import { monthKey, monthLabel } from "@/lib/finance-month";
import { overviewQuery } from "@/lib/query/finance-queries";
import { cn } from "@/lib/utils";
import type {
  BudgetPerformance,
  BudgetHealth,
  CategoryAmount,
  DailyBudgetGuide,
  DailySpendingPoint,
  FinanceBucketHealth,
  FinancialHealthSummary,
  FinanceOverviewSummary,
  MonthTotals,
  SavingsRateHealth,
  Transaction,
} from "@/types/finance";

function signedAmount(value: number): string {
  if (value > 0) return `+${krw.format(value)}`;
  return krw.format(value);
}

function transactionAmount(transaction: Transaction): string {
  const prefix = transaction.type === "income" ? "+" : "−";
  return `${prefix}${krw.format(transaction.amountKrw)}`;
}

function formatTransactionDate(transaction: Transaction): string {
  const date = new Date(`${transaction.date}T00:00:00`);
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const createdAt = new Date(transaction.createdAt);
  if (Number.isNaN(createdAt.getTime())) return dateLabel;
  return `${dateLabel} · ${createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

const DAILY_BUDGET_META: Record<DailyBudgetGuide["status"], { label: string; cardTone: "positive" | "warning" | "expense"; metricTone: "neutral" | "warning" | "expense" }> = {
  healthy: { label: "On track", cardTone: "positive", metricTone: "neutral" },
  watch: { label: "Spending room is tight", cardTone: "warning", metricTone: "warning" },
  over: { label: "Monthly budget exceeded", cardTone: "expense", metricTone: "expense" },
};

const BUCKET_META: Record<FinanceBucketHealth["bucket"], { label: string; icon: typeof Home }> = {
  essential: { label: "Essentials", icon: Home },
  lifestyle: { label: "Lifestyle", icon: Sparkles },
  future: { label: "Future", icon: Sprout },
};

const BUCKET_STATUS_META: Record<FinanceBucketHealth["status"], { label: string; tone: "positive" | "warning" | "expense" | "neutral" }> = {
  healthy: { label: "Healthy", tone: "positive" },
  watch: { label: "Watch", tone: "warning" },
  over: { label: "Over", tone: "expense" },
  below: { label: "Below target", tone: "expense" },
  unavailable: { label: "Unavailable", tone: "neutral" },
};

const BUCKET_STATUS_TEXT_CLASS: Record<FinanceBucketHealth["status"], string> = {
  healthy: "text-success",
  watch: "text-warning",
  over: "text-destructive",
  below: "text-destructive",
  unavailable: "text-muted-foreground",
};

// Shown once, next to the section title, so the three per-card badges below
// don't have to repeat "Unavailable" three times when there's no income yet.
const OVERALL_STATUS_META: Record<FinancialHealthSummary["overallStatus"], { label: string; icon: typeof CheckCircle2; className: string }> = {
  good: { label: "Good", icon: CheckCircle2, className: "border-success/30 bg-success/10 text-success" },
  watch: { label: "Watch", icon: Eye, className: "border-warning/30 bg-warning/10 text-warning" },
  attention: { label: "Attention", icon: CircleAlert, className: "border-destructive/30 bg-destructive/10 text-destructive" },
  unavailable: { label: "Unavailable", icon: HelpCircle, className: "border-border bg-secondary text-muted-foreground" },
};

function OverallStatusPill({ status }: { status: FinancialHealthSummary["overallStatus"] }) {
  const meta = OVERALL_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", meta.className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

// Progress fill is the bucket's percentage-of-target, not percentage-of-income —
// FinanceProgress clamps to 100 on its own, so "over" a maximum or comfortably
// past a minimum both render as a full bar, matching the ASCII mock in
// AGENTS.md's Financial Health spec (a filled bar communicates "at or past
// the line", the status badge communicates which side of it that means).
function bucketProgressValue(health: FinanceBucketHealth): number {
  if (health.percentageOfIncome === null || health.targetPercentage <= 0) return 0;
  return (health.percentageOfIncome / health.targetPercentage) * 100;
}

function FinancialHealthBucketCard({ health }: { health: FinanceBucketHealth }) {
  const meta = BUCKET_META[health.bucket];
  const status = BUCKET_STATUS_META[health.status];
  const Icon = meta.icon;
  const pctLabel = health.percentageOfIncome === null ? "—" : `${Math.round(health.percentageOfIncome)}%`;
  const targetLabel = `${health.direction === "maximum" ? "max" : "min"} ${health.targetPercentage}%`;

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-finance-chart/10 text-finance-chart">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <p className="truncate text-sm font-semibold">{meta.label}</p>
        </div>
        {health.status !== "unavailable" && (
          <span className={cn("shrink-0 rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-semibold", BUCKET_STATUS_TEXT_CLASS[health.status])}>
            {status.label}
          </span>
        )}
      </div>

      <p className="mt-3 font-mono text-2xl font-semibold leading-none tabular-nums">
        {pctLabel}
        <span className="ml-1.5 text-xs font-medium text-muted-foreground">/ {targetLabel}</span>
      </p>

      <div className="mt-3">
        <FinanceProgress
          value={bucketProgressValue(health)}
          label={`${meta.label} is ${pctLabel} of income against a ${targetLabel} guideline`}
          tone={status.tone}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{krw.format(health.amountKrw)}</p>
    </div>
  );
}

function UnclassifiedSpendingBanner({ amountKrw }: { amountKrw: number }) {
  return (
    <Link
      href="/finance/settings#settings-categories"
      className="flex items-center gap-3 rounded-2xl border border-warning/25 bg-warning/5 p-4 transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
        <Tags className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{krw.format(amountKrw)} isn&rsquo;t classified yet</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">Classify categories to complete your Essentials, Lifestyle, and Future picture.</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function AddIncomePrompt() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border bg-card/60 p-4 xs:flex-row xs:items-center xs:justify-between xs:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">No income logged for this month yet</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Add your income to see how it compares against your Essentials, Lifestyle, and Future guidelines.</p>
      </div>
      <Link href="/finance/transactions" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11 shrink-0")}>
        <Plus className="size-4" aria-hidden="true" />
        Add income
      </Link>
    </div>
  );
}

function FinancialHealthSection({ summary }: { summary: FinanceOverviewSummary }) {
  const health = summary.financialHealth;

  return (
    <FinanceSection
      id="finance-health"
      title="Financial health"
      description="Protect essentials, prepare for what's ahead, grow your future, and enjoy the rest."
      action={<OverallStatusPill status={health.overallStatus} />}
    >
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3">
        <FinancialHealthBucketCard health={health.essential} />
        <FinancialHealthBucketCard health={health.lifestyle} />
        <FinancialHealthBucketCard health={health.future} />
      </div>

      {health.unclassifiedKrw > 0 && <UnclassifiedSpendingBanner amountKrw={health.unclassifiedKrw} />}

      {health.overallStatus === "unavailable" ? (
        <AddIncomePrompt />
      ) : (
        health.recommendations.length > 0 && (
          <div className="space-y-1 rounded-2xl border bg-card/60 p-4">
            {health.recommendations.slice(0, 2).map((note) => (
              <p key={note} className="text-xs leading-relaxed text-muted-foreground first:text-sm first:font-medium first:text-foreground">
                {note}
              </p>
            ))}
          </div>
        )
      )}
    </FinanceSection>
  );
}

function OverviewLoading() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" aria-busy="true" aria-label="Loading Finance summary">
      <div className="h-64 rounded-2xl bg-secondary motion-safe:animate-pulse lg:h-auto" />
      <FinanceMetricGrid columns={2}>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-36 rounded-2xl bg-secondary motion-safe:animate-pulse" />
        ))}
      </FinanceMetricGrid>
    </div>
  );
}

function entryCountLabel(count: number): string {
  return `${count} ${count === 1 ? "transaction" : "transactions"}`;
}

function NetCashFlowCard({ totals }: { totals: MonthTotals }) {
  const largestFlow = Math.max(totals.totalIncomeKrw, totals.totalExpenseKrw, 1);
  const incomeWidth = Math.min(Math.max((totals.totalIncomeKrw / largestFlow) * 100, 0), 100);
  const expenseWidth = Math.min(Math.max((totals.totalExpenseKrw / largestFlow) * 100, 0), 100);
  const netTone = totals.netCashFlowKrw > 0 ? "text-success" : totals.netCashFlowKrw < 0 ? "text-destructive" : "text-foreground";
  const positionLabel = totals.netCashFlowKrw > 0
    ? "Positive cash flow"
    : totals.netCashFlowKrw < 0
      ? "Expenses are above income"
      : "Income and expenses are balanced";

  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border bg-card p-4 shadow-sm sm:p-5" aria-labelledby="net-cash-flow-title">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p id="net-cash-flow-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Net cash flow</p>
          <p className={cn("mt-4 [overflow-wrap:anywhere] font-mono text-[clamp(1.75rem,8vw,2.5rem)] font-semibold leading-none tracking-[-0.035em] tabular-nums", netTone)} title={signedAmount(totals.netCashFlowKrw)}>
            <AmountText value={signedAmount(totals.netCashFlowKrw)} />
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Income minus expenses</p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-finance-chart/10 text-finance-chart">
          <WalletCards className="size-4" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-6 border-t pt-4">
        <p className={cn("mb-3 text-xs font-medium", netTone)}>{positionLabel}</p>
        <div
          className="space-y-3"
          role="img"
          aria-label={`Income ${krw.format(totals.totalIncomeKrw)} compared with expenses ${krw.format(totals.totalExpenseKrw)}`}
        >
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1 xs:grid-cols-[4.5rem_minmax(0,1fr)_auto]" aria-hidden="true">
            <span className="text-xs text-muted-foreground">Income</span>
            <span className="h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-success" style={{ width: `${incomeWidth}%` }} /></span>
            <span className="col-span-2 break-words text-right font-mono text-xs font-medium tabular-nums xs:col-span-1">{krw.format(totals.totalIncomeKrw)}</span>
          </div>
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1 xs:grid-cols-[4.5rem_minmax(0,1fr)_auto]" aria-hidden="true">
            <span className="text-xs text-muted-foreground">Expenses</span>
            <span className="h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-destructive/70" style={{ width: `${expenseWidth}%` }} /></span>
            <span className="col-span-2 break-words text-right font-mono text-xs font-medium tabular-nums xs:col-span-1">{krw.format(totals.totalExpenseKrw)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SavingsRateCard({ totals, health }: { totals: MonthTotals; health: SavingsRateHealth }) {
  const tone = health.status === "below" ? "warning" : health.status === "unavailable" ? "neutral" : "positive";
  const delta = health.deltaPct === null ? null : Math.abs(health.deltaPct);

  return (
    <FinanceMetricCard
      label="Savings rate"
      value={`${totals.savingsRatePct}%`}
      icon={PiggyBank}
      tone={tone}
      surfaceTone="neutral"
      detail={(
        <div className="space-y-1.5">
          <p>Goal {health.targetRatePct}%</p>
          {health.status === "unavailable" ? (
            <p>Add income to measure savings</p>
          ) : health.status === "below" ? (
            <p className="flex items-center gap-1.5 font-medium text-warning"><TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />{delta} points below target</p>
          ) : (
            <p className="flex items-center gap-1.5 font-medium text-success"><CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />{health.status === "on_target" ? "On target" : `${delta} points above target`}</p>
          )}
        </div>
      )}
    />
  );
}

function BudgetHealthCard({ health }: { health: BudgetHealth | null }) {
  if (!health) {
    return (
      <FinanceMetricCard
        label="Budget"
        value="Not set"
        icon={Gauge}
        surfaceTone="neutral"
        detail={<Link href="/finance/budgets" className="inline-flex min-h-7 items-center font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Set category budgets →</Link>}
      />
    );
  }

  const status = BUDGET_STATUS_META[health.status];
  const StatusIcon = status.icon;
  const tone = health.status === "ok" ? "neutral" : status.tone;
  const value = health.remainingKrw >= 0 ? `${krw.format(health.remainingKrw)} left` : `${krw.format(Math.abs(health.remainingKrw))} over`;
  const attentionLabel = health.attentionCount === 0
    ? status.label
    : `${health.attentionCount} ${health.attentionCount === 1 ? "category needs" : "categories need"} attention`;

  return (
    <FinanceMetricCard
      label="Budget"
      value={value}
      icon={Gauge}
      tone={tone}
      valueTone={health.status === "exceeded" ? "expense" : "neutral"}
      surfaceTone="neutral"
      detail={(
        <div className="space-y-2.5">
          <FinanceProgress value={health.usagePct} label={`Budget ${health.usagePct} percent used`} tone={status.tone} />
          <p>{krw.format(health.totalSpentKrw)} of {krw.format(health.totalBudgetKrw)} used · {health.usagePct}%</p>
          <p className={cn("flex items-center gap-1.5 font-medium", BUDGET_STATUS_TEXT_CLASS[health.status])}><StatusIcon className="size-3.5 shrink-0" aria-hidden="true" />{attentionLabel}</p>
        </div>
      )}
    />
  );
}

function FinanceSummaryCards({ summary }: { summary: FinanceOverviewSummary }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <NetCashFlowCard totals={summary.totals} />
      <FinanceMetricGrid columns={2}>
        <FinanceMetricCard
          label="Income"
          value={krw.format(summary.totals.totalIncomeKrw)}
          detail={entryCountLabel(summary.totals.incomeTransactionCount)}
          icon={ArrowUpRight}
          tone="positive"
          valueTone="neutral"
          surfaceTone="neutral"
        />
        <FinanceMetricCard
          label="Expenses"
          value={krw.format(summary.totals.totalExpenseKrw)}
          detail={entryCountLabel(summary.totals.expenseTransactionCount)}
          icon={ArrowDownRight}
          tone="expense"
          valueTone="neutral"
          surfaceTone="neutral"
        />
        <SavingsRateCard totals={summary.totals} health={summary.savingsHealth} />
        <BudgetHealthCard health={summary.budgetHealth} />
      </FinanceMetricGrid>
    </div>
  );
}

function DailyBudgetCard({ guide }: { guide: DailyBudgetGuide }) {
  const { cardTone: tone, label: statusLabel } = DAILY_BUDGET_META[guide.status];
  const toneClass = {
    positive: "border-success/25 bg-success/5 text-success",
    warning: "border-warning/25 bg-warning/5 text-warning",
    expense: "border-destructive/25 bg-destructive/5 text-destructive",
  }[tone];

  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", toneClass)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-background/60">
            <Clock3 className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Daily spending guide</p>
            <p className="text-xs text-muted-foreground">{guide.daysRemaining} days including today</p>
          </div>
        </div>
        <span className="rounded-full border border-current/20 px-2.5 py-1 text-xs font-semibold">{statusLabel}</span>
      </div>

      <div className="mt-5 grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="pb-4 sm:pb-0 sm:pr-4">
          <p className="text-xs text-muted-foreground">Available per day</p>
          <p className="mt-1 break-words font-mono text-xl font-semibold tracking-tight text-foreground tabular-nums" title={krw.format(guide.availablePerDayKrw)}>{krw.format(guide.availablePerDayKrw)}</p>
        </div>
        <div className="py-4 sm:px-4 sm:py-0">
          <p className="text-xs text-muted-foreground">Spent today</p>
          <p className="mt-1 break-words font-mono text-xl font-semibold tracking-tight text-destructive tabular-nums" title={krw.format(guide.spentTodayKrw)}>{krw.format(guide.spentTodayKrw)}</p>
        </div>
        <div className="pt-4 sm:pl-4 sm:pt-0">
          <p className="text-xs text-muted-foreground">Monthly remaining</p>
          <p className="mt-1 break-words font-mono text-xl font-semibold tracking-tight text-foreground tabular-nums" title={krw.format(guide.monthlyRemainingKrw)}>{krw.format(guide.monthlyRemainingKrw)}</p>
        </div>
      </div>
    </div>
  );
}

function BudgetAlerts({ budgets }: { budgets: BudgetPerformance[] }) {
  const alerts = budgets.filter((budget) => budget.status !== "ok");
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success"><Scale className="size-4" aria-hidden="true" /></span>
        <div>
          <p className="text-sm font-semibold">No budget alerts</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Budgeted categories are below their watch threshold.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((budget) => {
        const status = BUDGET_STATUS_META[budget.status];
        return (
          <Link key={budget.categoryId} href="/finance/budgets" className="block rounded-2xl border bg-card p-4 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center gap-3">
              <CategoryIcon icon={budget.categoryIcon} color={budget.categoryColor} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col items-start gap-1 xs:flex-row xs:items-center xs:justify-between xs:gap-3">
                  <p className="truncate text-sm font-semibold">{budget.categoryName}</p>
                  <span className={cn("text-xs font-semibold", status.tone === "expense" ? "text-destructive" : "text-warning")}>{status.label} · {budget.usagePct}%</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{krw.format(budget.spentKrw)} of {krw.format(budget.budgetKrw)}</p>
                <div className="mt-2"><FinanceProgress value={budget.usagePct} label={`${budget.categoryName} budget ${budget.usagePct}% used`} tone={status.tone} /></div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function CategorySpending({ categories, budgets, totalExpense }: { categories: CategoryAmount[]; budgets: BudgetPerformance[]; totalExpense: number }) {
  const budgetByCategory = new Map(budgets.map((budget) => [budget.categoryId, budget]));
  if (categories.length === 0) {
    return <FinanceEmptyState icon={WalletCards} title="No category spending yet" description="Expense categories will appear here as transactions are added." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="divide-y divide-border">
        {categories.slice(0, 6).map((category) => {
          const share = totalExpense > 0 ? (category.amountKrw / totalExpense) * 100 : 0;
          const budget = category.categoryId ? budgetByCategory.get(category.categoryId) : undefined;
          return (
            <div key={category.categoryId ?? category.categoryName} className="p-4">
              <div className="flex items-center gap-3">
                <CategoryIcon icon={category.categoryIcon} color={category.categoryColor} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col items-start gap-1 xs:flex-row xs:justify-between xs:gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{category.categoryName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{share.toFixed(0)}% of expenses{budget ? ` · ${budget.usagePct}% of budget` : " · No category budget"}</p>
                    </div>
                    <p className="break-words font-mono text-sm font-semibold tabular-nums">{krw.format(category.amountKrw)}</p>
                  </div>
                  <div className="mt-2.5"><FinanceProgress value={share} label={`${category.categoryName} is ${share.toFixed(0)}% of expenses`} color={category.categoryColor} /></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpendingTrend({ data }: { data: DailySpendingPoint[] }) {
  const width = 620;
  const height = 180;
  const max = Math.max(1, ...data.map((point) => point.amountKrw));
  const points = data.map((point, index) => ({
    ...point,
    x: data.length <= 1 ? 0 : (index / (data.length - 1)) * width,
    y: height - (point.amountKrw / max) * (height - 12),
  }));
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = points.length > 0 ? `${linePath} L ${width} ${height} L 0 ${height} Z` : "";
  const activeDays = data.filter((point) => point.amountKrw > 0).length;
  const peak = data.reduce((highest, point) => point.amountKrw > highest.amountKrw ? point : highest, data[0] ?? { date: "", amountKrw: 0 });

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs text-muted-foreground">Peak day</p><p className="mt-1 font-mono text-lg font-semibold tabular-nums">{krw.format(peak.amountKrw)}</p></div>
        <p id="spending-trend-summary" className="text-xs text-muted-foreground">Spending on {activeDays} of {data.length} days</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full overflow-visible" role="img" aria-labelledby="spending-trend-title spending-trend-summary" preserveAspectRatio="none">
        <title id="spending-trend-title">Daily expense trend</title>
        <defs><linearGradient id="finance-overview-trend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--finance-chart)" stopOpacity="0.28" /><stop offset="100%" stopColor="var(--finance-chart)" stopOpacity="0" /></linearGradient></defs>
        {[0, 0.5, 1].map((position) => <line key={position} x1="0" x2={width} y1={height * position} y2={height * position} stroke="var(--border)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />)}
        {areaPath ? <path d={areaPath} fill="url(#finance-overview-trend)" /> : null}
        {linePath ? <path d={linePath} fill="none" stroke="var(--finance-chart)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>Day 1</span><span>Day {data.length}</span></div>
    </div>
  );
}

function RecentActivity({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <FinanceEmptyState icon={ReceiptText} title="No transactions yet" description="Add your first income or expense to start your Finance overview." action={<Link href="/finance/transactions" className={buttonVariants({ variant: "outline", size: "sm" })}>Open Transactions</Link>} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="divide-y divide-border">
        {transactions.map((transaction) => (
          <Link key={transaction.id} href="/finance/transactions" className="flex min-h-16 items-start gap-2 px-3 py-3 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring xs:items-center xs:gap-3 xs:px-4">
            <CategoryIcon icon={transaction.categoryIcon} color={transaction.categoryColor} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{transaction.description || "Untitled transaction"}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{transaction.categoryName || (transaction.type === "income" ? "Income" : "Uncategorized")} · {formatTransactionDate(transaction)}</p>
            </div>
            <p className={cn("max-w-[48%] shrink-0 [overflow-wrap:anywhere] text-right font-mono text-xs font-semibold tracking-tight tabular-nums xs:text-sm", transaction.type === "income" ? "text-success" : "text-foreground")}>{transactionAmount(transaction)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function overviewErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session has expired. Sign in again to load your Finance overview.";
    // The code/status pair is what makes a report diagnosable ("500
    // INTERNAL_ERROR" vs "504 HTTP_ERROR" from a platform timeout).
    const detail = error.status ? `${error.status} ${error.code}` : error.code;
    return `We couldn't load your Finance overview (${detail}). Try again in a moment.`;
  }
  if (error instanceof TypeError) return "We couldn't reach the server. Check your connection and try again.";
  return "We couldn't load your Finance overview. Try again in a moment.";
}

export function FinanceOverview({
  initialMonth,
  initialSummary,
}: {
  /** YYYY-MM that the server prefetched `initialSummary` for. */
  initialMonth?: string;
  initialSummary?: FinanceOverviewSummary;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const month = monthKey(monthOffset);
  const overview = useQuery({
    ...overviewQuery(month),
    // Seeding from the server keeps the amounts on screen from the first paint.
    // The month guard covers a browser whose "this month" differs from the
    // server's; that month then fetches on mount like any other.
    initialData: initialSummary && initialMonth === month ? initialSummary : undefined,
  });
  // A failed background refresh keeps the month already on screen; only a
  // month with nothing to show becomes the error state.
  const summary = overview.data ?? null;
  const error = overview.isError && !overview.data ? overviewErrorMessage(overview.error) : null;

  useEffect(() => {
    if (overview.error) console.error("[finance] overview request failed", overview.error);
  }, [overview.error]);

  return (
    <div className="space-y-6 lg:space-y-7">
      <FinanceSection
        id="finance-summary"
        title="Summary"
        description="Your money at a glance."
        action={(
          <MonthSelector
            label={monthLabel(monthOffset)}
            onPrevious={() => setMonthOffset((offset) => offset - 1)}
            onNext={() => setMonthOffset((offset) => offset + 1)}
            nextDisabled={monthOffset >= 0}
            ariaLabel="Finance month selector"
          />
        )}
      >
        {error ? (
          <FinanceErrorState
            title="Finance overview unavailable"
            description={error}
            onRetry={() => void overview.refetch()}
          />
        ) : !summary ? <OverviewLoading /> : <FinanceSummaryCards summary={summary} />}
      </FinanceSection>

      {summary ? (
        <>
          <FinancialHealthSection summary={summary} />

          <FinanceSection id="finance-daily-budget" title="Daily budget" description="A deterministic guide based on your remaining category budgets.">
            {summary.dailyBudget ? <DailyBudgetCard guide={summary.dailyBudget} /> : (
              <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><CalendarDays className="size-4" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{monthOffset === 0 ? "Set category budgets to unlock your daily guide" : "Daily guide is available for the current month"}</p><p className="mt-0.5 text-xs text-muted-foreground">Historical spending remains available in the trend below.</p></div>
                {monthOffset === 0 ? <Link href="/finance/budgets" className="shrink-0 text-xs font-semibold text-foreground underline-offset-4 hover:underline">Budgets</Link> : null}
              </div>
            )}
          </FinanceSection>

          <FinanceSection id="finance-budget-alerts" title="Budget alerts" description="Categories at or above their watch threshold."><BudgetAlerts budgets={summary.budgetPerformance} /></FinanceSection>

          {summary.totals.transactionCount === 0 ? (
            <FinanceEmptyState icon={ReceiptText} title={`No transactions in ${monthLabel(monthOffset)}`} description="Add your first income or expense to populate spending, trends, and recent activity." action={<Link href="/finance/transactions" className={buttonVariants({ variant: "outline", size: "sm" })}>Open Transactions</Link>} />
          ) : (
            <>
              <FinanceSection id="finance-spending" title="Spending" description="Where your expenses went and how each category relates to its budget."><CategorySpending categories={summary.categories} budgets={summary.budgetPerformance} totalExpense={summary.totals.totalExpenseKrw} /></FinanceSection>
              <FinanceSection id="finance-trends" title="Trends" description="Daily expenses across the selected month."><SpendingTrend data={summary.dailySpending} /></FinanceSection>
              <FinanceSection id="finance-recent-activity" title="Recent activity" description="Latest income and expenses for this month." action={<Link href="/finance/transactions" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-foreground underline-offset-4 hover:underline">View all <ArrowRight className="size-3.5" aria-hidden="true" /></Link>}><RecentActivity transactions={summary.recentTransactions} /></FinanceSection>
              <FinanceSection id="finance-review" title="Review" description="Turn this month into a clear, deterministic financial review.">
                <Link href="/finance/review" className="group flex min-h-24 items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-finance-chart/10 text-finance-chart"><TrendingUp className="size-5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Review {monthLabel(monthOffset)}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Compare totals, category changes, budgets, subscriptions, and savings goals.</span></span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </FinanceSection>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
