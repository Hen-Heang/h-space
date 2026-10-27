import "server-only";
import { callClaudeWithTool, isAiConfigured, type ClaudeToolSpec } from "@/lib/ai/client";
import { getMonthlyReport } from "@/lib/services/finance-report-service";
import type { MonthlyReport } from "@/types/finance";

// AI NEVER calculates money totals (AGENTS.md's AI Finance rule). Every
// number below is already computed deterministically by getMonthlyReport()
// — this function only reshapes and trims it into the minimal, privacy-safe
// snapshot Claude sees. No user id, email, transaction notes/descriptions,
// or category icon/color metadata is ever included.
interface FinanceSnapshot {
  month: string;
  totalIncomeKrw: number;
  totalExpenseKrw: number;
  netCashFlowKrw: number;
  savingsRatePct: number;
  previousSavingsRatePct: number;
  topCategoryChanges: { categoryName: string; currentKrw: number; deltaKrw: number }[];
  budgetsNeedingAttention: { categoryId: string; categoryName: string; budgetKrw: number; spentKrw: number; usagePct: number; status: string }[];
  subscriptionsMonthlyKrw: number;
  savingsOverallPct: number;
  savingsGoalsCount: number;
}

function buildSnapshot(report: MonthlyReport): FinanceSnapshot {
  return {
    month: report.month,
    totalIncomeKrw: report.totals.totalIncomeKrw,
    totalExpenseKrw: report.totals.totalExpenseKrw,
    netCashFlowKrw: report.totals.netCashFlowKrw,
    savingsRatePct: report.totals.savingsRatePct,
    previousSavingsRatePct: report.previousTotals.savingsRatePct,
    topCategoryChanges: [...report.categoryComparison]
      .sort((a, b) => Math.abs(b.deltaKrw) - Math.abs(a.deltaKrw))
      .slice(0, 5)
      .map((c) => ({ categoryName: c.categoryName, currentKrw: c.currentKrw, deltaKrw: c.deltaKrw })),
    budgetsNeedingAttention: report.budgetPerformance
      .filter((b) => b.status !== "ok")
      .map((b) => ({
        categoryId: b.categoryId,
        categoryName: b.categoryName,
        budgetKrw: b.budgetKrw,
        spentKrw: b.spentKrw,
        usagePct: b.usagePct,
        status: b.status,
      })),
    subscriptionsMonthlyKrw: report.subscriptionsMonthlyKrw,
    savingsOverallPct: report.savingsProgress.overallPct,
    savingsGoalsCount: report.savingsProgress.goalsCount,
  };
}

const MONEY_COACH_SYSTEM_PROMPT = `You are the Luyra financial coach.

You will receive a small set of ALREADY-COMPUTED, deterministic financial facts for one month, as JSON. Every number in it is correct and final — never recompute, re-derive, estimate, or "double check" any total, percentage, or amount. Treat every provided number as ground truth you are not allowed to alter.

Your job is only to:
1. Explain what's happening this month in plain, friendly language (2-4 short sentences).
2. Optionally recommend ONE specific action: adjusting the monthly budget amount for exactly one category from "budgetsNeedingAttention". Pick the category id verbatim from that list — never invent a category or id that isn't there. Propose a specific new suggestedBudgetKrw and a one-sentence rationale.

You may not suggest deleting a transaction, creating a savings transfer, or changing anything other than one category's budget amount. If nothing in budgetsNeedingAttention is clearly actionable, or the list is empty, omit the recommendation entirely and just explain the picture.`;

const MONEY_COACH_TOOL: ClaudeToolSpec = {
  name: "provide_money_coach_response",
  description: "Provide the coaching summary and, optionally, one budget-amount recommendation.",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "2-4 short, friendly sentences explaining this month's financial picture." },
      recommendedCategoryId: {
        type: "string",
        description: "A categoryId copied exactly from budgetsNeedingAttention. Omit if nothing is actionable.",
      },
      suggestedBudgetKrw: { type: "number", description: "The new monthly budget amount in KRW for the recommended category." },
      rationale: { type: "string", description: "One sentence explaining why this change is suggested." },
    },
    required: ["summary"],
  },
};

interface RawMoneyCoachOutput {
  summary?: string;
  recommendedCategoryId?: string;
  suggestedBudgetKrw?: number;
  rationale?: string;
}

export interface MoneyCoachRecommendation {
  categoryId: string;
  categoryName: string;
  currentBudgetKrw: number;
  suggestedBudgetKrw: number;
  rationale: string;
}

export interface MoneyCoachInsight {
  summary: string;
  recommendation: MoneyCoachRecommendation | null;
}

export type MoneyCoachResult = { ok: true; data: MoneyCoachInsight } | { ok: false; reason: "not_configured" | "request_failed" };

// The AI picks WHICH category and WHAT number to suggest, plus the
// rationale text — everything else (whether that category exists, its real
// current budget, its display name) is looked up from our own deterministic
// data, never trusted from the model's echo of it. A recommendation for a
// category the model invented or that isn't actually flagged is discarded.
function resolveRecommendation(raw: RawMoneyCoachOutput, report: MonthlyReport): MoneyCoachRecommendation | null {
  if (!raw.recommendedCategoryId || typeof raw.suggestedBudgetKrw !== "number" || !raw.rationale) return null;
  if (!Number.isFinite(raw.suggestedBudgetKrw) || raw.suggestedBudgetKrw <= 0) return null;

  const budget = report.budgetPerformance.find((b) => b.categoryId === raw.recommendedCategoryId && b.status !== "ok");
  if (!budget) return null;

  return {
    categoryId: budget.categoryId,
    categoryName: budget.categoryName,
    currentBudgetKrw: budget.budgetKrw,
    suggestedBudgetKrw: Math.round(raw.suggestedBudgetKrw),
    rationale: raw.rationale.trim(),
  };
}

export async function getMoneyCoachInsight(userId: string, month: string): Promise<MoneyCoachResult> {
  if (!isAiConfigured()) return { ok: false, reason: "not_configured" };

  const report = await getMonthlyReport(userId, month);
  const snapshot = buildSnapshot(report);

  const result = await callClaudeWithTool<RawMoneyCoachOutput>({
    system: MONEY_COACH_SYSTEM_PROMPT,
    userMessage: JSON.stringify(snapshot),
    tool: MONEY_COACH_TOOL,
    maxTokens: 1024,
  });

  if (!result.ok) return { ok: false, reason: result.reason === "not_configured" ? "not_configured" : "request_failed" };
  if (!result.data.summary) return { ok: false, reason: "request_failed" };

  return {
    ok: true,
    data: { summary: result.data.summary.trim(), recommendation: resolveRecommendation(result.data, report) },
  };
}
