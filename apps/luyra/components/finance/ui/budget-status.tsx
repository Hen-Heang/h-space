import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheck, Eye, TriangleAlert } from "lucide-react";
import type { BudgetPerformance } from "@/types/finance";

export type BudgetStatusTone = "positive" | "warning" | "expense";

// Shared across Overview's budget alerts, the Budgets page cards, and the
// Monthly Review budget performance list — one status vocabulary for all
// three, communicated via icon + label + color together (never color alone).
export const BUDGET_STATUS_META: Record<BudgetPerformance["status"], { label: string; tone: BudgetStatusTone; icon: LucideIcon }> = {
  ok: { label: "Healthy", tone: "positive", icon: CircleCheck },
  watch: { label: "Watch", tone: "warning", icon: Eye },
  near_limit: { label: "Near limit", tone: "warning", icon: TriangleAlert },
  exceeded: { label: "Exceeded", tone: "expense", icon: CircleAlert },
};

export const BUDGET_STATUS_TEXT_CLASS: Record<BudgetPerformance["status"], string> = {
  ok: "text-success",
  watch: "text-warning",
  near_limit: "text-warning",
  exceeded: "text-destructive",
};
